export const PUBLIC_JOBS_SYNC_KEY = "public_jobs";
export const PUBLIC_JOBS_PAGE_SIZE = 30;
export const DEFAULT_PUBLIC_JOBS_STALE_AFTER_MINUTES = 360;

export type PublicJobSourceType = "greenhouse" | "lever" | "ashby";

export interface JobSource {
  id: string;
  source_type: PublicJobSourceType;
  company_name: string;
  source_key: string;
  careers_url: string | null;
}

export interface NormalizedPublicJob {
  id: string;
  source_id: string;
  source_type: PublicJobSourceType;
  external_id: string;
  title: string;
  company_name: string;
  company_slug: string;
  location: string;
  workplace_type: string | null;
  employment_type: string | null;
  department: string | null;
  description: string | null;
  description_text: string | null;
  apply_url: string;
  job_url: string;
  salary_text: string | null;
  tags: string[];
  raw_payload: Record<string, unknown>;
  last_seen_at: string;
  posted_at: string | null;
  updated_at: string | null;
  is_active: boolean;
}

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at?: string;
  location?: { name?: string };
  absolute_url?: string;
  content?: string;
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string }>;
  metadata?: Array<{ name?: string; value?: string }> | null;
}

interface LeverJob {
  id: string;
  text: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
    department?: string;
  };
  descriptionPlain?: string;
  description?: string;
  lists?: Array<{ text?: string; content?: string }>;
}

interface AshbyJob {
  id?: string;
  title: string;
  location?: string;
  department?: string;
  team?: string;
  jobUrl?: string;
  applyUrl?: string;
  isListed?: boolean;
  publishedDate?: string;
  employmentType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: {
    compensationTierSummary?: string;
    scrapeableCompensationSalarySummary?: string;
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function inferWorkplaceType(location: string): string | null {
  const normalized = location.toLowerCase();
  if (normalized.includes("remote")) return "Remote";
  if (normalized.includes("hybrid")) return "Hybrid";
  if (location && location !== "Unknown") return "Onsite";
  return null;
}

function inferTags(title: string, department: string | null, description: string | null): string[] {
  const text = `${title} ${department || ""}`.toLowerCase();
  const tags = new Set<string>();

  const tagRules: Array<[string, RegExp]> = [
    ["Engineering", /(software|engineer|developer|frontend|backend|full.?stack|infrastructure|platform|devops|sre|security)/],
    ["AI", /\b(ai|ml|machine learning|llm|data science|research scientist)\b/],
    ["Product", /(product manager|product designer|product)/],
    ["Design", /(designer|design|ux|ui)/],
    ["Sales", /(sales|account executive|business development)/],
    ["Marketing", /(marketing|growth|content)/],
    ["Operations", /(operations|business operations|strategy)/],
    ["Finance", /(finance|accounting|controller)/],
    ["Legal", /(legal|counsel|compliance)/],
    ["Recruiting", /(recruiter|talent|people)/],
    ["Internship", /(intern|internship|new grad|university)/],
  ];

  for (const [tag, rule] of tagRules) {
    if (rule.test(text)) tags.add(tag);
  }

  return Array.from(tags);
}

function buildJobId(source: JobSource, externalId: string): string {
  return `${source.source_type}:${source.source_key}:${externalId}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ScoutJobsBot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchGreenhouseJobs(source: JobSource, seenAt: string): Promise<NormalizedPublicJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.source_key)}/jobs?content=true`;
  const payload = await fetchJson<{ jobs?: GreenhouseJob[] }>(url);

  return (payload.jobs || [])
    .filter((job) => job.id && job.title && job.absolute_url)
    .map((job) => {
      const department = job.departments?.[0]?.name || null;
      const location = job.location?.name || job.offices?.[0]?.location || job.offices?.[0]?.name || "Unknown";
      const descriptionText = stripHtml(job.content);

      return {
        id: buildJobId(source, String(job.id)),
        source_id: source.id,
        source_type: source.source_type,
        external_id: String(job.id),
        title: job.title,
        company_name: source.company_name,
        company_slug: slugify(source.company_name),
        location,
        workplace_type: inferWorkplaceType(location),
        employment_type: null,
        department,
        description: job.content || null,
        description_text: descriptionText,
        apply_url: job.absolute_url!,
        job_url: job.absolute_url!,
        salary_text: null,
        tags: inferTags(job.title, department, descriptionText),
        raw_payload: job as unknown as Record<string, unknown>,
        last_seen_at: seenAt,
        posted_at: null,
        updated_at: job.updated_at || null,
        is_active: true,
      };
    });
}

export async function fetchLeverJobs(source: JobSource, seenAt: string): Promise<NormalizedPublicJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(source.source_key)}?mode=json`;
  const jobs = await fetchJson<LeverJob[]>(url);

  return jobs
    .filter((job) => job.id && job.text && (job.hostedUrl || job.applyUrl))
    .map((job) => {
      const department = job.categories?.team || job.categories?.department || null;
      const location = job.categories?.location || "Unknown";
      const descriptionText = job.descriptionPlain || stripHtml(job.description) || null;
      const postedAt = job.createdAt ? new Date(job.createdAt).toISOString() : null;

      return {
        id: buildJobId(source, job.id),
        source_id: source.id,
        source_type: source.source_type,
        external_id: job.id,
        title: job.text,
        company_name: source.company_name,
        company_slug: slugify(source.company_name),
        location,
        workplace_type: inferWorkplaceType(location),
        employment_type: job.categories?.commitment || null,
        department,
        description: job.description || null,
        description_text: descriptionText,
        apply_url: job.applyUrl || job.hostedUrl!,
        job_url: job.hostedUrl || job.applyUrl!,
        salary_text: null,
        tags: inferTags(job.text, department, descriptionText),
        raw_payload: job as unknown as Record<string, unknown>,
        last_seen_at: seenAt,
        posted_at: postedAt,
        updated_at: postedAt,
        is_active: true,
      };
    });
}

export async function fetchAshbyJobs(source: JobSource, seenAt: string): Promise<NormalizedPublicJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.source_key)}?includeCompensation=true`;
  const payload = await fetchJson<{ jobs?: AshbyJob[] }>(url);

  return (payload.jobs || [])
    .filter((job) => job.isListed !== false && job.title && (job.jobUrl || job.applyUrl))
    .map((job) => {
      const externalId = job.id || job.jobUrl || `${job.title}-${job.location || "unknown"}`;
      const department = job.department || job.team || null;
      const location = job.location || "Unknown";
      const descriptionText = job.descriptionPlain || stripHtml(job.descriptionHtml) || null;
      const salaryText =
        job.compensation?.scrapeableCompensationSalarySummary ||
        job.compensation?.compensationTierSummary ||
        null;

      return {
        id: buildJobId(source, externalId),
        source_id: source.id,
        source_type: source.source_type,
        external_id: externalId,
        title: job.title,
        company_name: source.company_name,
        company_slug: slugify(source.company_name),
        location,
        workplace_type: inferWorkplaceType(location),
        employment_type: job.employmentType || null,
        department,
        description: job.descriptionHtml || null,
        description_text: descriptionText,
        apply_url: job.applyUrl || job.jobUrl!,
        job_url: job.jobUrl || job.applyUrl!,
        salary_text: salaryText,
        tags: inferTags(job.title, department, descriptionText),
        raw_payload: job as unknown as Record<string, unknown>,
        last_seen_at: seenAt,
        posted_at: job.publishedDate || null,
        updated_at: job.publishedDate || null,
        is_active: true,
      };
    });
}

export async function fetchJobsForSource(source: JobSource, seenAt: string): Promise<NormalizedPublicJob[]> {
  switch (source.source_type) {
    case "greenhouse":
      return fetchGreenhouseJobs(source, seenAt);
    case "lever":
      return fetchLeverJobs(source, seenAt);
    case "ashby":
      return fetchAshbyJobs(source, seenAt);
  }
}
