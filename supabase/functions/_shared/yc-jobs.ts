export const YC_JOBS_BASE_URL = "https://www.workatastartup.com";
export const DEFAULT_CATEGORY = "software-engineer";
export const PAGE_SIZE = 30;
export const DEFAULT_SYNC_STALE_AFTER_MINUTES = 360;

export interface YCJobCategorySeed {
  slug: string;
  label: string;
  path: string;
  sortOrder: number;
}

export interface YCJobRecord {
  id: string;
  title: string;
  jobType: string;
  location: string;
  roleType: string;
  companyName: string;
  companySlug: string;
  companyBatch: string;
  companyOneLiner: string;
  companyLogoUrl: string | null;
  companyLastActiveAt: string | null;
  applyUrl: string;
  jobUrl: string;
}

export interface YCJobMembershipRecord {
  jobId: string;
  categorySlug: string;
  rank: number;
  sourceUrl: string;
}

interface YCJobsPageData {
  props?: {
    jobs?: YCJobApi[];
  };
}

interface YCJobApi {
  id: number;
  title: string;
  jobType: string;
  location: string;
  roleType?: string;
  companyName: string;
  companySlug: string;
  companyBatch?: string;
  companyOneLiner?: string;
  companyLogoUrl?: string;
  companyLastActiveAt?: string | null;
  applyUrl: string;
}

export const YC_JOB_CATEGORIES: YCJobCategorySeed[] = [
  { slug: "software-engineer", label: "Engineering", path: "/jobs", sortOrder: 0 },
  { slug: "designer", label: "Design", path: "/jobs/l/designer", sortOrder: 1 },
  { slug: "recruiting", label: "Recruiting", path: "/jobs/l/recruiting", sortOrder: 2 },
  { slug: "science", label: "Science", path: "/jobs/l/science", sortOrder: 3 },
  { slug: "product-manager", label: "Product", path: "/jobs/l/product-manager", sortOrder: 4 },
  { slug: "operations", label: "Operations", path: "/jobs/l/operations", sortOrder: 5 },
  { slug: "sales-manager", label: "Sales", path: "/jobs/l/sales-manager", sortOrder: 6 },
  { slug: "marketing", label: "Marketing", path: "/jobs/l/marketing", sortOrder: 7 },
  { slug: "legal", label: "Legal", path: "/jobs/l/legal", sortOrder: 8 },
  { slug: "finance", label: "Finance", path: "/jobs/l/finance", sortOrder: 9 },
];

const categoryMap = new Map(YC_JOB_CATEGORIES.map((category) => [category.slug, category]));

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractPageData(html: string): YCJobsPageData {
  const match = html.match(
    /<div data-page="([\s\S]*?)" id="jobs\/public\/pages\/JobsPage[^"]*"><\/div>/,
  );

  if (!match) {
    throw new Error("Unable to parse YC jobs page payload");
  }

  return JSON.parse(decodeHtmlEntities(match[1])) as YCJobsPageData;
}

export function normalizeCategory(input: string | null): string {
  if (!input) {
    return DEFAULT_CATEGORY;
  }

  const normalized = input.trim().toLowerCase();
  if (!categoryMap.has(normalized)) {
    throw new Error(`Unsupported category: ${input}`);
  }

  return normalized;
}

export function getCategorySeed(categorySlug: string): YCJobCategorySeed {
  return categoryMap.get(categorySlug) ?? categoryMap.get(DEFAULT_CATEGORY)!;
}

export function buildJobsUrl(categorySlug: string, offset = 0): string {
  const category = getCategorySeed(categorySlug);
  const url = new URL(`${YC_JOBS_BASE_URL}${category.path}`);

  if (offset > 0) {
    url.searchParams.set("offset", offset.toString());
  }

  return url.toString();
}

function humanizeJobType(jobType: string): string {
  switch (jobType) {
    case "fulltime":
      return "Full-time";
    case "parttime":
      return "Part-time";
    case "intern":
      return "Internship";
    default:
      return jobType;
  }
}

function normalizeJob(job: YCJobApi): YCJobRecord {
  return {
    id: job.id.toString(),
    title: job.title,
    jobType: humanizeJobType(job.jobType),
    location: job.location,
    roleType: job.roleType || "General",
    companyName: job.companyName,
    companySlug: job.companySlug,
    companyBatch: job.companyBatch || "",
    companyOneLiner: job.companyOneLiner || "",
    companyLogoUrl: job.companyLogoUrl || null,
    companyLastActiveAt: job.companyLastActiveAt || null,
    applyUrl: job.applyUrl,
    jobUrl: `${YC_JOBS_BASE_URL}/jobs/${job.id}`,
  };
}

function dedupeJobsById(jobs: YCJobRecord[]): YCJobRecord[] {
  const seen = new Set<string>();
  const deduped: YCJobRecord[] = [];

  for (const job of jobs) {
    if (seen.has(job.id)) {
      continue;
    }

    seen.add(job.id);
    deduped.push(job);
  }

  return deduped;
}

function mergeJobRecords(existing: YCJobRecord | undefined, next: YCJobRecord): YCJobRecord {
  if (!existing) {
    return next;
  }

  return {
    ...existing,
    ...next,
    companyBatch: next.companyBatch || existing.companyBatch,
    companyOneLiner: next.companyOneLiner || existing.companyOneLiner,
    companyLogoUrl: next.companyLogoUrl || existing.companyLogoUrl,
    companyLastActiveAt: next.companyLastActiveAt || existing.companyLastActiveAt,
  };
}

async function fetchCategoryPage(categorySlug: string, offset: number): Promise<YCJobRecord[]> {
  const sourceUrl = buildJobsUrl(categorySlug, offset);
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; ScoutBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YC jobs page: ${response.status}`);
  }

  const html = await response.text();
  const pageData = extractPageData(html);
  return dedupeJobsById((pageData.props?.jobs || []).map(normalizeJob));
}

export async function fetchCategoryPageRecords(categorySlug: string, offset: number): Promise<YCJobRecord[]> {
  return fetchCategoryPage(categorySlug, offset);
}

export async function crawlCategoryYCJobs(categorySlug: string): Promise<{
  category: YCJobCategorySeed;
  jobs: YCJobRecord[];
  memberships: YCJobMembershipRecord[];
}> {
  const category = getCategorySeed(categorySlug);
  const jobs = new Map<string, YCJobRecord>();
  const memberships: YCJobMembershipRecord[] = [];
  let offset = 0;

  while (true) {
    const pageJobs = await fetchCategoryPage(category.slug, offset);

    if (pageJobs.length === 0) {
      break;
    }

    pageJobs.forEach((job, index) => {
      jobs.set(job.id, mergeJobRecords(jobs.get(job.id), job));
      memberships.push({
        jobId: job.id,
        categorySlug: category.slug,
        rank: offset + index,
        sourceUrl: buildJobsUrl(category.slug, offset),
      });
    });

    if (pageJobs.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return {
    category,
    jobs: Array.from(jobs.values()),
    memberships,
  };
}

export async function crawlAllYCJobs(): Promise<{
  categories: YCJobCategorySeed[];
  jobs: YCJobRecord[];
  memberships: YCJobMembershipRecord[];
}> {
  const jobs = new Map<string, YCJobRecord>();
  const memberships: YCJobMembershipRecord[] = [];

  for (const category of YC_JOB_CATEGORIES) {
    let offset = 0;

    while (true) {
      const pageJobs = await fetchCategoryPage(category.slug, offset);

      if (pageJobs.length === 0) {
        break;
      }

      pageJobs.forEach((job, index) => {
        jobs.set(job.id, mergeJobRecords(jobs.get(job.id), job));
        memberships.push({
          jobId: job.id,
          categorySlug: category.slug,
          rank: offset + index,
          sourceUrl: buildJobsUrl(category.slug, offset),
        });
      });

      if (pageJobs.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }
  }

  return {
    categories: YC_JOB_CATEGORIES,
    jobs: Array.from(jobs.values()),
    memberships,
  };
}
