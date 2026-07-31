import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DEFAULT_SYNC_STALE_AFTER_MINUTES,
  PAGE_SIZE,
  YC_JOB_CATEGORIES,
  buildJobsUrl,
  fetchCategoryPageRecords,
  getCategorySeed,
  normalizeCategory,
} from "../_shared/yc-jobs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYNC_KEY = "yc_jobs";
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

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const category = normalizeCategory(searchParams.get("category"));
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10) || 0;
    const limit = Number.parseInt(searchParams.get("limit") || PAGE_SIZE.toString(), 10) || PAGE_SIZE;

    if (offset < 0 || limit <= 0) {
      throw new Error("Offset and limit must be positive");
    }

    const { data: roleLinksRows, error: roleLinksError } = await supabase
      .from("yc_job_categories")
      .select("slug, label, path")
      .order("sort_order", { ascending: true });

    if (roleLinksError) {
      throw roleLinksError;
    }

    const { data: state, error: stateError } = await supabase
      .from("yc_job_sync_state")
      .select("status, stale_after_minutes, last_success_at, last_completed_at, last_error")
      .eq("sync_key", SYNC_KEY)
      .maybeSingle();

    if (stateError) {
      throw stateError;
    }

    const from = offset;
    const to = offset + limit - 1;

    const { data: listings, error: listingsError, count } = await supabase
      .from("yc_job_listings")
      .select(
        "id, title, job_type, location, role_type, company_name, company_slug, company_batch, company_one_liner, company_logo_url, company_last_active_at, apply_url, job_url, rank",
        { count: "exact" },
      )
      .eq("category_slug", category)
      .order("rank", { ascending: true })
      .range(from, to);

    if (listingsError) {
      throw listingsError;
    }

    const shouldWarmCategory = (listings?.length ?? 0) === 0;

    let effectiveListings = listings || [];
    let effectiveCount = count ?? 0;
    const lastSyncedAt = state?.last_success_at ?? null;
    let hasMore =
      effectiveListings.length === limit || offset + effectiveListings.length < effectiveCount;

    if (shouldWarmCategory) {
      const upstreamJobs = await fetchCategoryPageRecords(category, offset);
      effectiveListings = upstreamJobs.map((job, index) => ({
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
        rank: offset + index,
      }));
      effectiveCount = Math.max(
        effectiveCount,
        offset + upstreamJobs.length + (upstreamJobs.length === limit ? 1 : 0),
      );
      hasMore = upstreamJobs.length === limit;
    }

    const jobs = effectiveListings.map((job) => ({
      id: job.id,
      title: job.title,
      jobType: job.job_type,
      location: job.location,
      roleType: job.role_type,
      companyName: job.company_name,
      companySlug: job.company_slug,
      companyBatch: job.company_batch,
      companyOneLiner: job.company_one_liner,
      companyLogoUrl: job.company_logo_url,
      companyLastActiveAt: job.company_last_active_at,
      applyUrl: job.apply_url,
      jobUrl: job.job_url,
    }));

    const total = effectiveCount;
    const categorySeed = getCategorySeed(category);
    const roleLinks =
      roleLinksRows?.map((role) => ({
        label: role.label,
        path: role.path,
        slug: role.slug,
      })) ||
      YC_JOB_CATEGORIES.map((role) => ({
        label: role.label,
        path: role.path,
        slug: role.slug,
      }));

    const staleAfterMinutes = state?.stale_after_minutes ?? DEFAULT_SYNC_STALE_AFTER_MINUTES;
    const lastSyncedMs = parseTimestamp(lastSyncedAt);
    const isStale = lastSyncedMs
      ? Date.now() - lastSyncedMs > staleAfterMinutes * 60 * 1000
      : total > 0;
    const needsSync = total === 0 && !lastSyncedAt;
    const syncStatus =
      lastSyncedAt
        ? state?.status ?? "idle"
        : state?.status === "running" || state?.status === "error"
          ? state.status
          : "never";

    return new Response(
      JSON.stringify({
        success: true,
        title: `${categorySeed.label} roles`,
        metaDescription: "Cached YC jobs synced from the official Work at a Startup board.",
        category,
        jobs,
        offset,
        limit,
        total,
        hasMore,
        roleLinks,
        sourceUrl: buildJobsUrl(category, 0),
        lastSyncedAt,
        lastCompletedAt: state?.last_completed_at ?? null,
        syncStatus,
        syncError: state?.last_error ?? null,
        isStale,
        needsSync,
        staleAfterMinutes,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching YC jobs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch YC jobs",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
