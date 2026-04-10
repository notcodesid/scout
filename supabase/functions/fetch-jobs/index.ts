import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const url = new URL(req.url);
    
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10)));
    const sourcesParam = url.searchParams.get("sources");
    const source = url.searchParams.get("source");
    const remote = url.searchParams.get("remote");
    const jobType = url.searchParams.get("jobType");
    const search = url.searchParams.get("search");

    let query = supabase.from("jobs").select("*").order("last_seen_at", { ascending: false }).range(offset, offset + limit - 1);

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

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      console.error("Jobs query error:", jobsError);
      throw jobsError;
    }

    const { data: sources, error: sourcesError } = await supabase
      .from("job_sources")
      .select("slug, label, base_url, description, is_active, sort_order")
      .order("sort_order");

    if (sourcesError) {
      console.error("Sources query error:", sourcesError);
      throw sourcesError;
    }

    const { data: syncStates, error: syncError } = await supabase
      .from("job_sync_states")
      .select("source_slug, status, last_success_at, last_completed_at, last_error, total_active_jobs");

    if (syncError) {
      console.error("Sync states query error:", syncError);
      throw syncError;
    }

    const formattedJobs = (jobs || []).map((job) => ({
      id: job.id,
      source: job.source_slug,
      sourceLabel: job.source_slug,
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

    const sourceMap = new Map((sources || []).map((s) => [s.slug, s]));
    const syncMap = new Map((syncStates || []).map((s) => [s.source_slug, s]));

    const lastSyncedAt = Math.max(
      ...(syncStates || [])
        .filter((s) => s.last_success_at)
        .map((s) => new Date(s.last_success_at!).getTime()),
      0,
    );

    return new Response(
      JSON.stringify({
        success: true,
        jobs: formattedJobs,
        total: formattedJobs.length,
        offset,
        limit,
        hasMore: formattedJobs.length === limit,
        source: source || sourcesParam || "all",
        sources: (sources || []).map((s) => ({
          ...s,
          syncStatus: syncMap.get(s.slug)?.status || "unknown",
          lastSyncedAt: syncMap.get(s.slug)?.last_success_at || null,
          totalActiveJobs: syncMap.get(s.slug)?.total_active_jobs || 0,
          lastError: syncMap.get(s.slug)?.last_error || null,
        })),
        lastSyncedAt: lastSyncedAt > 0 ? new Date(lastSyncedAt).toISOString() : null,
        syncStates: syncStates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
