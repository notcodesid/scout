import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "yc";
const YC_JOBS_BASE_URL = "https://www.workatastartup.com";
const PAGE_SIZE = 30;

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

interface YCJobsPageData {
  props?: {
    jobs?: YCJobApi[];
  };
}

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
  if (!match) throw new Error("Unable to parse YC jobs page payload");
  return JSON.parse(decodeHtmlEntities(match[1])) as YCJobsPageData;
}

function humanizeYcJobType(jobType: string): string {
  switch (jobType) {
    case "fulltime": return "Full-time";
    case "parttime": return "Part-time";
    case "intern": return "Internship";
    default: return jobType;
  }
}

async function fetchCategoryPage(categoryPath: string, offset = 0): Promise<YCJobApi[]> {
  const url = new URL(`${YC_JOBS_BASE_URL}${categoryPath}`);
  if (offset > 0) url.searchParams.set("offset", offset.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; ScoutBot/2.0)",
    },
  });

  if (!response.ok) throw new Error(`YC fetch failed: ${response.status}`);
  const html = await response.text();
  const pageData = extractPageData(html);
  return pageData.props?.jobs || [];
}

async function crawlYCJobs(): Promise<JobRecord[]> {
  const categories = [
    { path: "/jobs", slug: "engineering" },
    { path: "/jobs/l/designer", slug: "design" },
    { path: "/jobs/l/recruiting", slug: "recruiting" },
    { path: "/jobs/l/science", slug: "science" },
    { path: "/jobs/l/product-manager", slug: "product" },
    { path: "/jobs/l/operations", slug: "operations" },
    { path: "/jobs/l/sales-manager", slug: "sales" },
    { path: "/jobs/l/marketing", slug: "marketing" },
    { path: "/jobs/l/legal", slug: "legal" },
    { path: "/jobs/l/finance", slug: "finance" },
  ];

  const allJobs = new Map<string, JobRecord>();

  for (const cat of categories) {
    let offset = 0;
    while (true) {
      try {
        const rawJobs = await fetchCategoryPage(cat.path, offset);

        for (const raw of rawJobs) {
          if (!raw.id) continue;

          const id = generateJobId(SOURCE_SLUG, raw.id);
          if (!allJobs.has(id)) {
            allJobs.set(id, {
              id,
              sourceSlug: SOURCE_SLUG,
              title: raw.title,
              companyName: raw.companyName,
              companySlug: raw.companySlug,
              companyOneLiner: raw.companyOneLiner || "",
              companyLogoUrl: raw.companyLogoUrl || null,
              companyWebsiteUrl: null,
              jobType: humanizeYcJobType(raw.jobType),
              location: raw.location,
              salaryMin: null,
              salaryMax: null,
              salaryCurrency: "USD",
              remote: humanizeRemote(raw.location),
              skills: [],
              description: "",
              applyUrl: raw.applyUrl,
              jobUrl: `${YC_JOBS_BASE_URL}/jobs/${raw.id}`,
              seniority: raw.roleType || "General",
              category: cat.slug,
            });
          }
        }

        if (rawJobs.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      } catch (e) {
        console.warn(`YC ${cat.path}:`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlYCJobs };
