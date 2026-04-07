import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCRAPER_URLS: Record<string, string> = {
  yc: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-yc`,
  wellfound: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-wellfound`,
  indeed: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-indeed`,
  naukri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-naukri`,
  glassdoor: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-glassdoor`,
  hn: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-hn`,
  remoteok: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-remoteok`,
  internshala: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-internshala`,
  cutshort: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-cutshort`,
  linkedin: `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-linkedin`,
};

const SCRAPER_CONCURRENCY = 3;
const SYNC_TIMEOUT_MS = 25 * 60 * 1000;

interface SyncResult {
  source: string;
  success: boolean;
  jobsCrawled?: number;
  jobsUpserted?: number;
  activeJobs?: number;
  deactivatedJobs?: number;
  error?: string;
  durationMs?: number;
  skipped?: boolean;
  reason?: string;
}

async function syncSource(
  supabase: ReturnType<typeof createClient>,
  source: string,
  force: boolean,
  apiKey: string,
): Promise<SyncResult> {
  const url = SCRAPER_URLS[source];
  if (!url) {
    return { source, success: false, error: `Unknown source: ${source}` };
  }

  const params = new URLSearchParams({ force: force.toString(), reason: "sync-all" });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "apikey": apiKey,
      },
      body: JSON.stringify({ force }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json() as Record<string, unknown>;

    return {
      source,
      success: result.success as boolean,
      jobsCrawled: result.jobsCrawled as number | undefined,
      jobsUpserted: result.jobsUpserted as number | undefined,
      activeJobs: result.activeJobs as number | undefined,
      deactivatedJobs: result.deactivatedJobs as number | undefined,
      error: result.error as string | undefined,
      durationMs: result.durationMs as number | undefined,
      skipped: result.skipped as boolean | undefined,
      reason: result.reason as string | undefined,
    };
  } catch (error) {
    return {
      source,
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAtMs = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const sourcesParam = url.searchParams.get("sources");
    const targetsParam = url.searchParams.get("targets");

    let sources = Object.keys(SCRAPER_URLS);

    if (targetsParam) {
      const targets = targetsParam.split(",").map((t) => t.trim().toLowerCase());
      if (targets.includes("discovery")) {
        sources = ["indeed", "linkedin"];
      } else if (targets.includes("high-quality")) {
        sources = ["wellfound", "yc", "hn", "remoteok"];
      } else if (targets.includes("india")) {
        sources = ["naukri", "internshala", "cutshort"];
      } else {
        sources = targets;
      }
    } else if (sourcesParam) {
      sources = sourcesParam.split(",").map((s) => s.trim().toLowerCase());
    }

    const results: SyncResult[] = [];
    const batches: string[][] = [];

    for (let i = 0; i < sources.length; i += SCRAPER_CONCURRENCY) {
      batches.push(sources.slice(i, i + SCRAPER_CONCURRENCY));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((source) => syncSource(supabase, source, force, serviceRoleKey)),
      );
      results.push(...batchResults);
    }

    const totalCrawled = results.reduce((sum, r) => sum + (r.jobsCrawled || 0), 0);
    const totalUpserted = results.reduce((sum, r) => sum + (r.jobsUpserted || 0), 0);
    const totalActive = results.reduce((sum, r) => sum + (r.activeJobs || 0), 0);
    const errors = results.filter((r) => !r.success && !r.skipped);

    const { data: sourceSummary } = await supabase
      .from("job_sync_states")
      .select("source_slug, total_active_jobs")
      .order("source_slug");

    return new Response(
      JSON.stringify({
        success: true,
        totalSources: sources.length,
        sourcesSucceeded: results.filter((r) => r.success).length,
        sourcesSkipped: results.filter((r) => r.skipped).length,
        sourcesFailed: errors.length,
        totalJobsCrawled: totalCrawled,
        totalJobsUpserted: totalUpserted,
        totalActiveJobs: totalActive,
        durationMs: Date.now() - startedAtMs,
        results,
        sourceSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in sync-all:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
