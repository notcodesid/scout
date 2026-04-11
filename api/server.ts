import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface JobRow {
  id: string;
  source_slug: string;
  source_label: string;
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
  last_seen_at: string;
  synced_at: string;
}

function buildJobFilters(options: {
  source?: string;
  sourcesParam?: string;
  remote?: string;
  search?: string;
}) {
  const params: Array<string | number | string[]> = [];
  const where: string[] = [];

  if (options.source) {
    params.push(options.source);
    where.push(`source_slug = $${params.length}`);
  } else if (options.sourcesParam) {
    const sources = options.sourcesParam.split(",").map((value) => value.trim()).filter(Boolean);
    if (sources.length > 0) {
      params.push(sources);
      where.push(`source_slug = ANY($${params.length})`);
    }
  }

  if (options.remote && options.remote !== "all") {
    params.push(options.remote);
    where.push(`remote = $${params.length}`);
  }

  if (options.search) {
    params.push(`%${options.search}%`);
    where.push(`(title ILIKE $${params.length} OR company_name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

app.get("/api/jobs", async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const sourcesParam = req.query.sources as string;
    const source = req.query.source as string;
    const remote = req.query.remote as string;
    const search = req.query.search as string;

    const filters = buildJobFilters({ source, sourcesParam, remote, search });
    const jobsQuery = `
      SELECT
        id,
        source_slug,
        source_label,
        title,
        company_name,
        company_slug,
        company_one_liner,
        company_logo_url,
        company_website_url,
        job_type,
        location,
        salary_min,
        salary_max,
        salary_currency,
        remote,
        skills,
        description,
        apply_url,
        job_url,
        seniority,
        category,
        last_seen_at,
        synced_at
      FROM canonical_job_listings
      ${filters.whereClause}
      ORDER BY last_seen_at DESC
      LIMIT $${filters.params.length + 1}
      OFFSET $${filters.params.length + 2}
    `;
    const jobsParams = [...filters.params, limit, offset];
    const countQuery = `
      SELECT count(*)::integer AS total
      FROM canonical_job_listings
      ${filters.whereClause}
    `;

    const [jobsResult, countResult, sourcesResult, syncResult, canonicalSourceCounts] = await Promise.all([
      pool.query(jobsQuery, jobsParams),
      pool.query(countQuery, filters.params),
      pool.query(`
        SELECT slug, label, base_url, description, is_active, sort_order
        FROM job_sources
        ORDER BY sort_order
      `),
      pool.query(`
        SELECT source_slug, status, last_success_at, last_completed_at, last_error, total_active_jobs
        FROM job_sync_states
      `),
      pool.query(`
        SELECT source_slug, count(*)::integer AS total_active_jobs
        FROM canonical_job_listings
        GROUP BY source_slug
      `),
    ]);
    const jobs = jobsResult.rows;
    const total = countResult.rows[0]?.total || 0;

    const syncMap = new Map(syncResult.rows.map((s) => [s.source_slug, s]));
    const canonicalCountMap = new Map(canonicalSourceCounts.rows.map((row) => [row.source_slug, row.total_active_jobs]));

    const formattedJobs = jobs.map((job: JobRow) => ({
      id: job.id,
      source: job.source_slug,
      sourceLabel: job.source_label || job.source_slug,
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

    const lastSyncedAt = Math.max(
      ...syncResult.rows
        .filter((s) => s.last_success_at)
        .map((s) => new Date(s.last_success_at).getTime()),
      0,
    );

    res.json({
      success: true,
      jobs: formattedJobs,
      total,
      offset,
      limit,
      hasMore: offset + jobs.length < total,
      source: source || sourcesParam || "all",
      sources: sourcesResult.rows.map((s) => ({
        ...s,
        syncStatus: syncMap.get(s.slug)?.status || "unknown",
        lastSyncedAt: syncMap.get(s.slug)?.last_success_at || null,
        totalActiveJobs: canonicalCountMap.get(s.slug) || 0,
        lastError: syncMap.get(s.slug)?.last_error || null,
      })),
      lastSyncedAt: lastSyncedAt > 0 ? new Date(lastSyncedAt).toISOString() : null,
      syncStates: syncResult.rows,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
