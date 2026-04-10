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

app.get("/api/jobs", async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const sourcesParam = req.query.sources as string;
    const source = req.query.source as string;
    const remote = req.query.remote as string;
    const search = req.query.search as string;

    let query = `
      SELECT * FROM jobs 
      WHERE 1=1
    `;
    const params: Array<string | number | string[]> = [];
    let paramIndex = 1;

    if (source) {
      query += ` AND source_slug = $${paramIndex++}`;
      params.push(source);
    } else if (sourcesParam) {
      const sources = sourcesParam.split(",").map((s) => s.trim());
      query += ` AND source_slug = ANY($${paramIndex++})`;
      params.push(sources);
    }

    if (remote && remote !== "all") {
      query += ` AND remote = $${paramIndex++}`;
      params.push(remote);
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR company_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY last_seen_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const jobsResult = await pool.query(query, params);
    const jobs = jobsResult.rows;

    const sourcesResult = await pool.query(`
      SELECT slug, label, base_url, description, is_active, sort_order 
      FROM job_sources 
      ORDER BY sort_order
    `);

    const syncResult = await pool.query(`
      SELECT source_slug, status, last_success_at, last_completed_at, last_error, total_active_jobs 
      FROM job_sync_states
    `);

    const syncMap = new Map(syncResult.rows.map((s) => [s.source_slug, s]));

    const formattedJobs = jobs.map((job: JobRow) => ({
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

    const lastSyncedAt = Math.max(
      ...syncResult.rows
        .filter((s) => s.last_success_at)
        .map((s) => new Date(s.last_success_at).getTime()),
      0,
    );

    res.json({
      success: true,
      jobs: formattedJobs,
      total: jobs.length,
      offset,
      limit,
      hasMore: jobs.length === limit,
      source: source || sourcesParam || "all",
      sources: sourcesResult.rows.map((s) => ({
        ...s,
        syncStatus: syncMap.get(s.slug)?.status || "unknown",
        lastSyncedAt: syncMap.get(s.slug)?.last_success_at || null,
        totalActiveJobs: syncMap.get(s.slug)?.total_active_jobs || 0,
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
