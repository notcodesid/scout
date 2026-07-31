import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DEFAULT_PUBLIC_JOBS_STALE_AFTER_MINUTES,
  PUBLIC_JOBS_SYNC_KEY,
  fetchJobsForSource,
  type JobSource,
  type NormalizedPublicJob,
} from "../_shared/public-jobs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYNC_COOLDOWN_MS = 10 * 60 * 1000;
const RUNNING_TIMEOUT_MS = 20 * 60 * 1000;
const UPSERT_CHUNK_SIZE = 250;
const DEFAULT_SOURCE_LIMIT = 75;

interface SyncStateRow {
  status: "idle" | "running" | "error";
  stale_after_minutes: number;
  last_attempt_at: string | null;
  current_started_at: string | null;
}

interface SyncRequestBody {
  force?: boolean;
  reason?: string;
  sourceLimit?: number;
  sourceTypes?: string[];
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

async function readRequestBody(req: Request): Promise<SyncRequestBody> {
  if (req.method !== "POST") return {};

  try {
    return (await req.json()) as SyncRequestBody;
  } catch {
    return {};
  }
}

function parseTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAtMs = Date.now();
  const supabase = createAdminClient();

  try {
    const body = await readRequestBody(req);
    const url = new URL(req.url);
    const force = body.force ?? url.searchParams.get("force") === "true";
    const reason = body.reason || url.searchParams.get("reason") || "manual-refresh";
    const sourceLimit = Math.min(
      Math.max(Number(body.sourceLimit || url.searchParams.get("sourceLimit") || DEFAULT_SOURCE_LIMIT), 1),
      500,
    );
    const sourceTypes = body.sourceTypes?.length
      ? body.sourceTypes
      : url.searchParams.get("sourceTypes")?.split(",").filter(Boolean);

    const { data: state, error: stateError } = await supabase
      .from("public_job_sync_state")
      .select("status, stale_after_minutes, last_attempt_at, current_started_at")
      .eq("sync_key", PUBLIC_JOBS_SYNC_KEY)
      .maybeSingle<SyncStateRow>();

    if (stateError) throw stateError;

    const now = Date.now();
    const lastAttemptAtMs = parseTimestamp(state?.last_attempt_at ?? null);
    const currentStartedAtMs = parseTimestamp(state?.current_started_at ?? null);

    if (state?.status === "running" && currentStartedAtMs && now - currentStartedAtMs < RUNNING_TIMEOUT_MS) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "sync-already-running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!force && lastAttemptAtMs && now - lastAttemptAtMs < SYNC_COOLDOWN_MS) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "sync-cooldown" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const syncStartedAt = new Date().toISOString();

    const { error: syncStateError } = await supabase.from("public_job_sync_state").upsert({
      sync_key: PUBLIC_JOBS_SYNC_KEY,
      status: "running",
      stale_after_minutes: state?.stale_after_minutes ?? DEFAULT_PUBLIC_JOBS_STALE_AFTER_MINUTES,
      last_attempt_at: syncStartedAt,
      current_started_at: syncStartedAt,
      last_reason: reason,
      last_error: null,
      updated_at: syncStartedAt,
    });

    if (syncStateError) throw syncStateError;

    let sourcesQuery = supabase
      .from("ats_job_sources")
      .select("id, source_type, company_name, source_key, careers_url")
      .eq("is_active", true)
      .order("last_success_at", { ascending: true, nullsFirst: true })
      .limit(sourceLimit);

    if (sourceTypes?.length) {
      sourcesQuery = sourcesQuery.in("source_type", sourceTypes);
    }

    const { data: sources, error: sourcesError } = await sourcesQuery.returns<JobSource[]>();
    if (sourcesError) throw sourcesError;

    const allJobs: NormalizedPublicJob[] = [];
    const sourceResults: Array<{ source: JobSource; jobCount: number; error: string | null }> = [];

    for (const source of sources || []) {
      try {
        const jobs = await fetchJobsForSource(source, syncStartedAt);
        allJobs.push(...jobs);
        sourceResults.push({ source, jobCount: jobs.length, error: null });

        await supabase
          .from("ats_job_sources")
          .update({
            last_attempt_at: syncStartedAt,
            last_success_at: syncStartedAt,
            last_error: null,
            last_job_count: jobs.length,
            updated_at: syncStartedAt,
          })
          .eq("id", source.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch source";
        sourceResults.push({ source, jobCount: 0, error: message });

        await supabase
          .from("ats_job_sources")
          .update({
            last_attempt_at: syncStartedAt,
            last_error: message,
            last_job_count: 0,
            updated_at: syncStartedAt,
          })
          .eq("id", source.id);
      }
    }

    for (const chunk of chunkArray(allJobs, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase.from("public_jobs").upsert(chunk, { onConflict: "id" });
      if (error) throw error;
    }

    const { data: finalizeRows, error: finalizeError } = await supabase.rpc("finalize_public_job_sync", {
      p_seen_at: syncStartedAt,
    });

    if (finalizeError) throw finalizeError;

    const finalize = Array.isArray(finalizeRows) ? finalizeRows[0] : finalizeRows;
    const completedAt = new Date().toISOString();
    const successfulSources = sourceResults.filter((result) => !result.error).length;
    const failedSources = sourceResults.length - successfulSources;

    const { error: finalStateError } = await supabase
      .from("public_job_sync_state")
      .update({
        status: failedSources === sourceResults.length && sourceResults.length > 0 ? "error" : "idle",
        current_started_at: null,
        last_success_at: successfulSources > 0 ? completedAt : null,
        last_completed_at: completedAt,
        last_duration_ms: Date.now() - startedAtMs,
        total_active_jobs: finalize?.active_jobs ?? allJobs.length,
        total_sources: sources?.length ?? 0,
        last_reason: reason,
        last_error: failedSources > 0 ? `${failedSources} sources failed` : null,
        updated_at: completedAt,
      })
      .eq("sync_key", PUBLIC_JOBS_SYNC_KEY);

    if (finalStateError) throw finalStateError;

    return new Response(
      JSON.stringify({
        success: true,
        skipped: false,
        syncedAt: completedAt,
        fetchedJobs: allJobs.length,
        totalActiveJobs: finalize?.active_jobs ?? allJobs.length,
        successfulSources,
        failedSources,
        sourceResults: sourceResults.slice(0, 25).map((result) => ({
          sourceType: result.source.source_type,
          companyName: result.source.company_name,
          jobCount: result.jobCount,
          error: result.error,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const failedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Failed to sync public jobs";

    await supabase
      .from("public_job_sync_state")
      .update({
        status: "error",
        current_started_at: null,
        last_completed_at: failedAt,
        last_duration_ms: Date.now() - startedAtMs,
        last_error: message,
        updated_at: failedAt,
      })
      .eq("sync_key", PUBLIC_JOBS_SYNC_KEY);

    console.error("Error syncing public jobs:", error);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
