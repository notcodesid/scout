import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DEFAULT_SYNC_STALE_AFTER_MINUTES,
  YC_JOB_CATEGORIES,
  crawlAllYCJobs,
} from "../_shared/yc-jobs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYNC_KEY = "yc_jobs";
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;
const RUNNING_TIMEOUT_MS = 20 * 60 * 1000;
const UPSERT_CHUNK_SIZE = 250;

type SyncStatus = "idle" | "running" | "error";

interface SyncRequestBody {
  force?: boolean;
  reason?: string;
}

interface SyncStateRow {
  status: SyncStatus;
  stale_after_minutes: number;
  last_attempt_at: string | null;
  current_started_at: string | null;
  last_success_at: string | null;
  total_active_jobs: number;
  total_active_memberships: number;
  total_categories: number;
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
  if (req.method !== "POST") {
    return {};
  }

  try {
    return (await req.json()) as SyncRequestBody;
  } catch {
    return {};
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
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

    const { data: state, error: stateError } = await supabase
      .from("yc_job_sync_state")
      .select("status, stale_after_minutes, last_attempt_at, current_started_at, last_success_at, total_active_jobs, total_active_memberships, total_categories")
      .eq("sync_key", SYNC_KEY)
      .maybeSingle<SyncStateRow>();

    if (stateError) {
      throw stateError;
    }

    const now = Date.now();
    const lastAttemptAtMs = parseTimestamp(state?.last_attempt_at ?? null);
    const currentStartedAtMs = parseTimestamp(state?.current_started_at ?? null);

    if (state?.status === "running" && currentStartedAtMs && now - currentStartedAtMs < RUNNING_TIMEOUT_MS) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "sync-already-running",
          state,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!force && lastAttemptAtMs && now - lastAttemptAtMs < SYNC_COOLDOWN_MS) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "sync-cooldown",
          state,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const syncStartedAt = new Date().toISOString();

    const { error: stateUpdateError } = await supabase
      .from("yc_job_sync_state")
      .upsert({
        sync_key: SYNC_KEY,
        status: "running",
        stale_after_minutes: state?.stale_after_minutes ?? DEFAULT_SYNC_STALE_AFTER_MINUTES,
        last_attempt_at: syncStartedAt,
        current_started_at: syncStartedAt,
        last_reason: reason,
        last_error: null,
        updated_at: syncStartedAt,
      });

    if (stateUpdateError) {
      throw stateUpdateError;
    }

    const crawled = await crawlAllYCJobs();

    const categoryRows = crawled.categories.map((category) => ({
      slug: category.slug,
      label: category.label,
      path: category.path,
      sort_order: category.sortOrder,
      updated_at: syncStartedAt,
    }));

    for (const chunk of chunkArray(categoryRows, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase.from("yc_job_categories").upsert(chunk, { onConflict: "slug" });
      if (error) {
        throw error;
      }
    }

    const jobRows = crawled.jobs.map((job) => ({
      id: job.id,
      title: job.title,
      job_type: job.jobType,
      location: job.location,
      role_type: job.roleType,
      company_name: job.companyName,
      company_slug: job.companySlug,
      company_batch: job.companyBatch,
      company_one_liner: job.companyOneLiner,
      company_logo_url: job.companyLogoUrl,
      company_last_active_at: job.companyLastActiveAt,
      apply_url: job.applyUrl,
      job_url: job.jobUrl,
      is_active: true,
      last_seen_at: syncStartedAt,
      synced_at: syncStartedAt,
    }));

    for (const chunk of chunkArray(jobRows, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase.from("yc_jobs").upsert(chunk, { onConflict: "id" });
      if (error) {
        throw error;
      }
    }

    const membershipRows = crawled.memberships.map((membership) => ({
      job_id: membership.jobId,
      category_slug: membership.categorySlug,
      rank: membership.rank,
      source_url: membership.sourceUrl,
      is_active: true,
      last_seen_at: syncStartedAt,
      synced_at: syncStartedAt,
    }));

    for (const chunk of chunkArray(membershipRows, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from("yc_job_category_memberships")
        .upsert(chunk, { onConflict: "job_id,category_slug" });

      if (error) {
        throw error;
      }
    }

    const { data: finalizeRows, error: finalizeError } = await supabase.rpc("finalize_yc_job_sync", {
      p_seen_at: syncStartedAt,
    });

    if (finalizeError) {
      throw finalizeError;
    }

    const finalize = Array.isArray(finalizeRows) ? finalizeRows[0] : finalizeRows;
    const completedAt = new Date().toISOString();

    const { error: finalizeStateError } = await supabase
      .from("yc_job_sync_state")
      .update({
        status: "idle",
        current_started_at: null,
        last_success_at: completedAt,
        last_completed_at: completedAt,
        last_duration_ms: Date.now() - startedAtMs,
        total_active_jobs: finalize?.active_jobs ?? crawled.jobs.length,
        total_active_memberships: finalize?.active_memberships ?? crawled.memberships.length,
        total_categories: YC_JOB_CATEGORIES.length,
        last_reason: reason,
        last_error: null,
        updated_at: completedAt,
      })
      .eq("sync_key", SYNC_KEY);

    if (finalizeStateError) {
      throw finalizeStateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        skipped: false,
        syncedAt: completedAt,
        totalActiveJobs: finalize?.active_jobs ?? crawled.jobs.length,
        totalActiveMemberships: finalize?.active_memberships ?? crawled.memberships.length,
        totalCategories: YC_JOB_CATEGORIES.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const failedAt = new Date().toISOString();

    await supabase
      .from("yc_job_sync_state")
      .update({
        status: "error",
        current_started_at: null,
        last_completed_at: failedAt,
        last_duration_ms: Date.now() - startedAtMs,
        last_error: error instanceof Error ? error.message : "Failed to sync YC jobs",
        updated_at: failedAt,
      })
      .eq("sync_key", SYNC_KEY);

    console.error("Error syncing YC jobs:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync YC jobs",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
