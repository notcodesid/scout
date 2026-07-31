import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DEFAULT_PUBLIC_JOBS_STALE_AFTER_MINUTES,
  PUBLIC_JOBS_PAGE_SIZE,
  PUBLIC_JOBS_SYNC_KEY,
} from "../_shared/public-jobs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublicJobRow {
  id: string;
  source_type: string;
  title: string;
  company_name: string;
  company_slug: string;
  location: string;
  workplace_type: string | null;
  employment_type: string | null;
  department: string | null;
  description_text: string | null;
  apply_url: string;
  job_url: string;
  salary_text: string | null;
  tags: string[];
  last_seen_at: string;
  posted_at: string | null;
  updated_at: string | null;
}

interface YCJobRow {
  id: string;
  title: string;
  job_type: string;
  location: string;
  role_type: string;
  company_name: string;
  company_slug: string;
  company_batch: string;
  company_one_liner: string;
  company_logo_url: string | null;
  company_last_active_at: string | null;
  apply_url: string;
  job_url: string;
  rank: number;
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

function parseTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeCategory(input: string | null): string {
  return input?.trim().toLowerCase() || "all";
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unslugify(input: string): string {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryTag(category: string): string | null {
  if (!category || category === "all" || category === "yc") return null;
  return unslugify(category);
}

function mapPublicJob(job: PublicJobRow) {
  return {
    id: job.id,
    title: job.title,
    jobType: job.employment_type || "Role",
    location: job.location,
    roleType: job.department || job.tags?.[0] || "General",
    companyName: job.company_name,
    companySlug: job.company_slug,
    companyBatch: "",
    companyOneLiner: job.description_text?.slice(0, 180) || "",
    companyLogoUrl: null,
    companyLastActiveAt: null,
    applyUrl: job.apply_url,
    jobUrl: job.job_url,
    sourceType: job.source_type,
    salaryText: job.salary_text,
    workplaceType: job.workplace_type,
    tags: job.tags || [],
  };
}

function mapYCJob(job: YCJobRow) {
  return {
    id: `yc:${job.id}`,
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
    sourceType: "yc",
    salaryText: null,
    workplaceType: null,
    tags: ["YC", job.role_type].filter(Boolean),
  };
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
    const limit = Number.parseInt(searchParams.get("limit") || PUBLIC_JOBS_PAGE_SIZE.toString(), 10) || PUBLIC_JOBS_PAGE_SIZE;
    const search = searchParams.get("search")?.trim() || "";

    if (offset < 0 || limit <= 0 || limit > 100) {
      throw new Error("Offset and limit are out of range");
    }

    const { data: publicState, error: publicStateError } = await supabase
      .from("public_job_sync_state")
      .select("status, stale_after_minutes, last_success_at, last_completed_at, last_error, total_active_jobs")
      .eq("sync_key", PUBLIC_JOBS_SYNC_KEY)
      .maybeSingle();

    if (publicStateError) throw publicStateError;

    const { data: ycState } = await supabase
      .from("yc_job_sync_state")
      .select("status, last_success_at, last_completed_at, last_error")
      .eq("sync_key", "yc_jobs")
      .maybeSingle();

    const publicTag = categoryTag(category);
    const includePublic = category !== "yc";
    const includeYC = category === "yc";
    const publicLimit = includePublic ? limit : 0;
    const ycLimit = includeYC ? limit : 0;

    let publicJobs: ReturnType<typeof mapPublicJob>[] = [];
    let publicCount = 0;

    if (includePublic) {
      let publicQuery = supabase
        .from("public_jobs")
        .select(
          "id, source_type, title, company_name, company_slug, location, workplace_type, employment_type, department, description_text, apply_url, job_url, salary_text, tags, last_seen_at, posted_at, updated_at",
          { count: "exact" },
        )
        .eq("is_active", true)
        .order("last_seen_at", { ascending: false })
        .range(offset, offset + publicLimit - 1);

      if (publicTag) {
        publicQuery = publicQuery.overlaps("tags", [publicTag]);
      }

      if (search) {
        publicQuery = publicQuery.textSearch("description_text", search, {
          type: "websearch",
          config: "english",
        });
      }

      const { data, error, count } = await publicQuery.returns<PublicJobRow[]>();
      if (error) throw error;

      publicJobs = (data || []).map(mapPublicJob);
      publicCount = count ?? publicJobs.length;
    }

    let ycJobs: ReturnType<typeof mapYCJob>[] = [];
    let ycCount = 0;

    if (includeYC && ycLimit > 0) {
      const ycCategory = category === "yc" || category === "all" ? "software-engineer" : "software-engineer";
      const { data, error, count } = await supabase
        .from("yc_job_listings")
        .select(
          "id, title, job_type, location, role_type, company_name, company_slug, company_batch, company_one_liner, company_logo_url, company_last_active_at, apply_url, job_url, rank",
          { count: "exact" },
        )
        .eq("category_slug", ycCategory)
        .order("rank", { ascending: true })
        .range(offset, offset + ycLimit - 1)
        .returns<YCJobRow[]>();

      if (!error) {
        ycJobs = (data || []).map(mapYCJob);
        ycCount = count ?? ycJobs.length;
      }
    }

    const jobs = [...publicJobs, ...ycJobs].slice(0, limit);
    const total = includePublic ? publicCount + ycCount : ycCount;
    const { data: roleRows } = await supabase
      .from("public_jobs")
      .select("tags")
      .eq("is_active", true)
      .limit(5000)
      .returns<Array<{ tags: string[] }>>();

    const tagCounts = new Map<string, number>();
    for (const row of roleRows || []) {
      for (const tag of row.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    const roleLinks = [
      { label: "All", slug: "all", path: "/jobs", count: publicState?.total_active_jobs ?? total },
      ...Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12)
        .map(([label, count]) => ({
          label,
          slug: slugify(label),
          path: `/jobs?category=${slugify(label)}`,
          count,
        })),
    ];

    if (ycCount > 0 || category === "yc") {
      roleLinks.push({ label: "YC Only", slug: "yc", path: "/jobs?category=yc", count: ycCount });
    }

    const staleAfterMinutes = publicState?.stale_after_minutes ?? DEFAULT_PUBLIC_JOBS_STALE_AFTER_MINUTES;
    const lastSyncedAt = publicState?.last_success_at ?? ycState?.last_success_at ?? null;
    const lastSyncedMs = parseTimestamp(lastSyncedAt);
    const isStale = lastSyncedMs ? Date.now() - lastSyncedMs > staleAfterMinutes * 60 * 1000 : total > 0;
    const needsSync = includePublic && publicCount === 0 && !publicState?.last_success_at;
    const syncStatus =
      publicState?.last_success_at
        ? publicState.status ?? "idle"
        : publicState?.status === "running" || publicState?.status === "error"
          ? publicState.status
          : "never";

    return new Response(
      JSON.stringify({
        success: true,
        title: category === "yc" ? "YC roles" : "Startup roles",
        metaDescription: "Startup jobs aggregated from ATS job boards and YC Work at a Startup.",
        category,
        jobs,
        offset,
        limit,
        total,
        hasMore: offset + jobs.length < total,
        roleLinks,
        sourceUrl: "multi-source",
        lastSyncedAt,
        lastCompletedAt: publicState?.last_completed_at ?? ycState?.last_completed_at ?? null,
        syncStatus,
        syncError: publicState?.last_error ?? ycState?.last_error ?? null,
        isStale,
        needsSync,
        staleAfterMinutes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
