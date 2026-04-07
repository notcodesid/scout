import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SYNC_COOLDOWN_MS,
  RUNNING_TIMEOUT_MS,
  UPSERT_CHUNK_SIZE,
  type JobRecord,
  chunkArray,
  parseTimestamp,
} from "./base.ts";

export interface SyncState {
  sourceSlug: string;
  status: "idle" | "running" | "error";
  staleAfterMinutes: number;
  lastAttemptAt: string | null;
  currentStartedAt: string | null;
  lastSuccessAt: string | null;
  lastCompletedAt: string | null;
  lastDurationMs: number | null;
  totalActiveJobs: number;
  lastReason: string | null;
  lastError: string | null;
}

export interface FinalizeResult {
  deactivatedJobs: number;
  activeJobs: number;
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getSyncState(supabase: ReturnType<typeof createAdminClient>, sourceSlug: string): Promise<SyncState | null> {
  const { data, error } = await supabase
    .from("job_sync_states")
    .select("*")
    .eq("source_slug", sourceSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    sourceSlug: data.source_slug,
    status: data.status,
    staleAfterMinutes: data.stale_after_minutes,
    lastAttemptAt: data.last_attempt_at,
    currentStartedAt: data.current_started_at,
    lastSuccessAt: data.last_success_at,
    lastCompletedAt: data.last_completed_at,
    lastDurationMs: data.last_duration_ms,
    totalActiveJobs: data.total_active_jobs,
    lastReason: data.last_reason,
    lastError: data.last_error,
  };
}

export async function canRunSync(state: SyncState | null, force: boolean): Promise<{ allowed: boolean; reason: string }> {
  if (force) {
    return { allowed: true, reason: "forced" };
  }

  if (!state) {
    return { allowed: true, reason: "no-state" };
  }

  const now = Date.now();
  const currentStartedMs = parseTimestamp(state.currentStartedAt);

  if (state.status === "running" && currentStartedMs && now - currentStartedMs < RUNNING_TIMEOUT_MS) {
    return { allowed: false, reason: "sync-already-running" };
  }

  const lastAttemptMs = parseTimestamp(state.lastAttemptAt);
  if (lastAttemptMs && now - lastAttemptMs < SYNC_COOLDOWN_MS) {
    return { allowed: false, reason: "sync-cooldown" };
  }

  return { allowed: true, reason: "ok" };
}

export async function markSyncRunning(
  supabase: ReturnType<typeof createAdminClient>,
  sourceSlug: string,
  reason: string,
  state: SyncState | null,
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("job_sync_states")
    .upsert({
      source_slug: sourceSlug,
      status: "running",
      stale_after_minutes: state?.staleAfterMinutes ?? 360,
      last_attempt_at: now,
      current_started_at: now,
      last_reason: reason,
      last_error: null,
      updated_at: now,
    }, { onConflict: "source_slug" });

  if (error) throw error;
}

export async function upsertJobs(
  supabase: ReturnType<typeof createAdminClient>,
  jobs: JobRecord[],
  syncedAt: string,
): Promise<number> {
  if (jobs.length === 0) return 0;

  const rows = jobs.map((job) => ({
    id: job.id,
    source_slug: job.sourceSlug,
    title: job.title,
    company_name: job.companyName,
    company_slug: job.companySlug,
    company_one_liner: job.companyOneLiner,
    company_logo_url: job.companyLogoUrl,
    company_website_url: job.companyWebsiteUrl,
    job_type: job.jobType,
    location: job.location,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    salary_currency: job.salaryCurrency,
    remote: job.remote,
    skills: job.skills,
    description: job.description,
    apply_url: job.applyUrl,
    job_url: job.jobUrl,
    seniority: job.seniority,
    category: job.category,
    is_active: true,
    last_seen_at: syncedAt,
    synced_at: syncedAt,
  }));

  let upserted = 0;
  for (const chunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase
      .from("jobs")
      .upsert(chunk, { onConflict: "source_slug,id" });

    if (error) throw error;
    upserted += chunk.length;
  }

  return upserted;
}

export async function finalizeSync(
  supabase: ReturnType<typeof createAdminClient>,
  sourceSlug: string,
  syncedAt: string,
  durationMs: number,
  crawled: JobRecord[],
): Promise<FinalizeResult> {
  const { data, error } = await supabase.rpc("finalize_job_sync", {
    p_source_slug: sourceSlug,
    p_seen_at: syncedAt,
  });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;

  const completedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("job_sync_states")
    .update({
      status: "idle",
      current_started_at: null,
      last_success_at: completedAt,
      last_completed_at: completedAt,
      last_duration_ms: durationMs,
      total_active_jobs: result?.active_jobs ?? crawled.length,
      last_error: null,
      updated_at: completedAt,
    })
    .eq("source_slug", sourceSlug);

  if (updateError) throw updateError;

  return {
    deactivatedJobs: result?.deactivated_jobs ?? 0,
    activeJobs: result?.active_jobs ?? crawled.length,
  };
}

export async function markSyncError(
  supabase: ReturnType<typeof createAdminClient>,
  sourceSlug: string,
  errorMessage: string,
  startedAtMs: number,
): Promise<void> {
  const failedAt = new Date().toISOString();

  await supabase
    .from("job_sync_states")
    .update({
      status: "error",
      current_started_at: null,
      last_completed_at: failedAt,
      last_duration_ms: Date.now() - startedAtMs,
      last_error: errorMessage,
      updated_at: failedAt,
    })
    .eq("source_slug", sourceSlug);
}

export function createAdminClientForSync() {
  return createAdminClient();
}
