import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml, extractJsonFromScript } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "wellfound";
const BASE_URL = "https://wellfound.com";
const PAGE_SIZE = 30;

interface WellfoundJob {
  id: string;
  title: string;
  company: {
    name: string;
    slug: string;
    tagline?: string;
    logo_url?: string;
    website_url?: string;
  };
  location?: string;
  job_type?: string;
  remote?: string;
  salary_range?: string;
  role_type?: string;
  apply_url?: string;
  skills?: string[];
  description?: string;
}

interface WellfoundPageData {
  props?: {
    pageProps?: {
      jobs?: WellfoundJob[];
      searchResults?: {
        results?: WellfoundJob[];
      };
    };
  };
}

async function fetchWellfoundPage(url: string): Promise<WellfoundJob[]> {
  const html = await fetchHtml(url);

  const raw = extractJsonFromScript(
    html,
    `<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)</script>`,
  );

  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const pageProps = data.props as Record<string, unknown> | undefined;
    const jobsData = pageProps?.pageProps as Record<string, unknown> | undefined;

    if (jobsData?.jobs) {
      return jobsData.jobs as WellfoundJob[];
    }
    if (jobsData?.searchResults) {
      const sr = jobsData.searchResults as Record<string, unknown>;
      return (sr.results || []) as WellfoundJob[];
    }
  }

  const altMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
  if (altMatch) {
    try {
      const parsed = JSON.parse(altMatch[1]);
      if (parsed?.jobs) return parsed.jobs as WellfoundJob[];
    } catch {
      // ignore
    }
  }

  return [];
}

function parseSalary(salary?: string): { min: number | null; max: number | null; currency: string } {
  if (!salary) return { min: null, max: null, currency: "USD" };

  const numbers = salary
    .replace(/[^0-9\s]/g, " ")
    .split(/\s+/)
    .map((s) => parseFloat(s.replace(/,/g, "")))
    .filter((n) => !isNaN(n) && n > 0);

  if (numbers.length === 0) return { min: null, max: null, currency: "USD" };

  const scaled = numbers.map((n) => (n < 1000 ? n * 1000 : n));
  return {
    min: Math.min(...scaled),
    max: Math.max(...scaled),
    currency: salary.includes("$") ? "USD" : salary.includes("€") ? "EUR" : salary.includes("£") ? "GBP" : salary.includes("₹") ? "INR" : "USD",
  };
}

function normalizeWellfoundJob(raw: WellfoundJob, sourceUrl: string): JobRecord {
  const salary = parseSalary(raw.salary_range);
  const description = raw.description || "";
  const allText = `${raw.title} ${raw.company?.name} ${raw.skills?.join(" ") || ""} ${description}`;
  const skills = raw.skills?.slice(0, 15) || extractSkillsFromText(allText).slice(0, 10);
  const remoteVal = raw.remote ? humanizeRemote(raw.remote) : "Unknown";

  return {
    id: generateJobId(SOURCE_SLUG, raw.id),
    sourceSlug: SOURCE_SLUG,
    title: raw.title,
    companyName: raw.company?.name || "Unknown",
    companySlug: raw.company?.slug || "",
    companyOneLiner: raw.company?.tagline || "",
    companyLogoUrl: raw.company?.logo_url || null,
    companyWebsiteUrl: raw.company?.website_url || null,
    jobType: humanizeJobType(raw.job_type || "fulltime"),
    location: raw.location || remoteVal === "Remote" ? "Remote" : raw.location || "",
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    remote: remoteVal,
    skills,
    description: description.slice(0, 1000),
    applyUrl: raw.apply_url || `${BASE_URL}/jobs/${raw.id}`,
    jobUrl: `${BASE_URL}/jobs/${raw.id}`,
    seniority: raw.role_type || "",
    category: "",
  };
}

async function crawlWellfoundJobs(): Promise<JobRecord[]> {
  const urls = [
    `${BASE_URL}/jobs? Designers=true& engineers=true& marketers=true& sales=true& operators=true& all=true`,
    `${BASE_URL}/jobs/engineering`,
  ];

  const allJobs = new Map<string, WellfoundJob>();

  for (const url of urls) {
    try {
      const jobs = await fetchWellfoundPage(url);
      for (const job of jobs) {
        if (!allJobs.has(job.id)) {
          allJobs.set(job.id, job);
        }
      }

      await new Promise((r) => setTimeout(r, 2000));

      for (let offset = PAGE_SIZE; offset < 300; offset += PAGE_SIZE) {
        const paginatedUrl = `${url}&offset=${offset}`;
        const more = await fetchWellfoundPage(paginatedUrl);
        if (more.length === 0) break;

        for (const job of more) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }
      }
    } catch (e) {
      console.warn(`Wellfound: failed to fetch ${url}:`, e);
    }
  }

  return Array.from(allJobs.values()).map((job) => normalizeWellfoundJob(job, BASE_URL));
}

export { crawlWellfoundJobs };
export type { WellfoundJob };
