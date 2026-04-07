import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SourceRow {
  slug: string;
  label: string;
  base_url: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

interface SyncStateRow {
  source_slug: string;
  status: string;
  last_success_at: string | null;
  last_completed_at: string | null;
  last_error: string | null;
  total_active_jobs: number;
}

interface JobRow {
  id: string;
  source_slug: string;
  title: string;
  company_name: string;
  company_slug: string;
  company_one_liner: string;
  company_logo_url: string | null;
  company_website_url: string | null;
  job_type: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  remote: string;
  skills: string[];
  description: string;
  apply_url: string;
  job_url: string;
  seniority: string;
  category: string;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  synced_at: string;
}

function createClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient();

  try {
    const url = new URL(req.url);
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10)));
    const sourcesParam = url.searchParams.get("sources");
    const source = url.searchParams.get("source");
    const remote = url.searchParams.get("remote");
    const jobType = url.searchParams.get("jobType");
    const search = url.searchParams.get("search");

    let query = supabase
      .from("job_listings")
      .select("*, source:job_sources(label, base_url)", { count: "exact" })
      .order("last_seen_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (source) {
      query = query.eq("source_slug", source);
    } else if (sourcesParam) {
      const sources = sourcesParam.split(",").map((s) => s.trim());
      query = query.in("source_slug", sources);
    }

    if (remote && remote !== "all") {
      query = query.eq("remote", remote);
    }

    if (jobType && jobType !== "all") {
      query = query.eq("job_type", jobType);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data: jobs, error: jobsError, count } = await query;

    if (jobsError) {
      throw jobsError;
    }

    const { data: sources, error: sourcesError } = await supabase
      .from("job_sources")
      .select("slug, label, base_url, description, is_active, sort_order")
      .order("sort_order");

    if (sourcesError) {
      throw sourcesError;
    }

    const { data: syncStates, error: syncError } = await supabase
      .from("job_sync_states")
      .select("source_slug, status, last_success_at, last_completed_at, last_error, total_active_jobs");

    if (syncError) {
      throw syncError;
    }

    const formattedJobs = ((jobs || []) as (JobRow & { source?: { label: string; base_url: string } })[]).map((job) => ({
      id: job.id,
      source: job.source_slug,
      sourceLabel: job.source?.label || job.source_slug,
      title: job.title,
      companyName: job.company_name,
      companySlug: job.company_slug,
      companyOneLiner: job.company_one_liner,
      companyLogoUrl: job.company_logo_url,
      companyWebsiteUrl: job.company_website_url,
      jobType: job.job_type,
      location: job.location,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryCurrency: job.salary_currency,
      remote: job.remote,
      skills: job.skills || [],
      description: job.description,
      applyUrl: job.apply_url,
      jobUrl: job.job_url,
      seniority: job.seniority,
      category: job.category,
      lastSeenAt: job.last_seen_at,
      syncedAt: job.synced_at,
    }));

    const sourceMap = new Map((sources as SourceRow[] || []).map((s) => [s.slug, s]));
    const syncMap = new Map((syncStates as SyncStateRow[] || []).map((s) => [s.source_slug, s]));

    const sourceInfo = (sourceMap.get(source || "") || sourceMap.get(sourcesParam?.split(",")[0] || "") || {
      slug: "all",
      label: "All Sources",
      base_url: "",
      description: "Jobs from all sources",
      is_active: true,
      sort_order: 0,
    });

    const lastSyncedAt = Math.max(
      ...(syncStates as SyncStateRow[] || [])
        .filter((s) => s.last_success_at)
        .map((s) => new Date(s.last_success_at!).getTime()),
      0,
    );

    return new Response(
      JSON.stringify({
        success: true,
        jobs: formattedJobs,
        total: count ?? formattedJobs.length,
        offset,
        limit,
        hasMore: (count ?? 0) > offset + limit,
        source: source || sourcesParam || "all",
        sources: (sources as SourceRow[] || []).map((s) => ({
          ...s,
          syncStatus: (syncMap.get(s.slug) as SyncStateRow | undefined)?.status || "unknown",
          lastSyncedAt: (syncMap.get(s.slug) as SyncStateRow | undefined)?.last_success_at || null,
          totalActiveJobs: (syncMap.get(s.slug) as SyncStateRow | undefined)?.total_active_jobs || 0,
          lastError: (syncMap.get(s.slug) as SyncStateRow | undefined)?.last_error || null,
        })),
        lastSyncedAt: lastSyncedAt > 0 ? new Date(lastSyncedAt).toISOString() : null,
        syncStates: syncStates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
