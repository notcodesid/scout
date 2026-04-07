import {
  getSyncState,
  canRunSync,
  markSyncRunning,
  upsertJobs,
  finalizeSync,
  markSyncError,
  createAdminClientForSync,
} from "../_shared/scrapers/sync.ts";
import { crawlNaukriJobs } from "./jobs.ts";

const SOURCE_SLUG = "naukri";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAtMs = Date.now();
  const supabase = createAdminClientForSync();

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const reason = url.searchParams.get("reason") || "manual-refresh";

    const state = await getSyncState(supabase, SOURCE_SLUG);
    const { allowed, reason: blockReason } = await canRunSync(state, force);

    if (!allowed) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: blockReason, state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await markSyncRunning(supabase, SOURCE_SLUG, reason, state);

    const crawled = await crawlNaukriJobs();
    const syncedAt = new Date().toISOString();
    const upserted = await upsertJobs(supabase, crawled, syncedAt);
    const result = await finalizeSync(supabase, SOURCE_SLUG, syncedAt, Date.now() - startedAtMs, crawled);

    return new Response(
      JSON.stringify({
        success: true,
        sourceSlug: SOURCE_SLUG,
        jobsCrawled: crawled.length,
        jobsUpserted: upserted,
        activeJobs: result.activeJobs,
        deactivatedJobs: result.deactivatedJobs,
        durationMs: Date.now() - startedAtMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`Error syncing ${SOURCE_SLUG}:`, error);
    await markSyncError(supabase, SOURCE_SLUG, error instanceof Error ? error.message : "Unknown error", startedAtMs);

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
