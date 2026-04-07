import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml, fetchJson, extractJsonFromScript } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "linkedin";
const BASE_URL = "https://www.linkedin.com";

const SEARCH_JOBS_API = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings";

const SEARCH_QUERIES = [
  "software engineer",
  "frontend developer",
  "backend developer",
  "product manager",
  "data scientist",
  "devops engineer",
];

async function fetchLinkedInPage(query: string, start: number): Promise<JobRecord[]> {
  const params = new URLSearchParams({
    keywords: query,
    location: "United States",
    start: start.toString(),
    count: "25",
  });

  const url = `${SEARCH_JOBS_API}?${params.toString()}`;
  const html = await fetchHtml(url, { timeoutMs: 20000, headers: { "Referer": `${BASE_URL}/jobs` } });

  return parseLinkedInHtml(html);
}

function parseLinkedInHtml(html: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
  if (scriptMatch) {
    try {
      const state = JSON.parse(scriptMatch[1]);
      const elements = state?.elements || state?.included || [];
      return elements.map((e: Record<string, unknown>) => parseLinkedInJob(e)).filter(Boolean) as JobRecord[];
    } catch {
      // fall through
    }
  }

  const jobCards = html.matchAll(/<li[^>]+class="[^"]*job-card-container[^"]*"[^>]*data-job-id="([^"]+)"[^>]*>([\s\S]*?)(?=<li[^>]+class="[^"]*job-card-container|$)/gi);
  for (const cardMatch of jobCards) {
    const jobId = cardMatch[1];
    const card = cardMatch[2];

    const titleMatch = card.match(/<span[^>]+class="[^"]*job-card-list__title[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const companyMatch = card.match(/<img[^>]+class="[^"]*job-card-container__company-logo[^"]*"[^>]*alt="([^"]+)"/i) ||
      card.match(/class="[^"]*job-card-container__primary-description[^"]*"[^>]*>\s*([^<]+)/i);
    const locationMatch = card.match(/class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>\s*([^<]+)/i);

    const title = titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
    const company = companyMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "";

    if (!title) continue;

    jobs.push({
      id: generateJobId(SOURCE_SLUG, jobId),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company || "Unknown",
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: "",
      companyLogoUrl: null,
      companyWebsiteUrl: null,
      jobType: humanizeJobType("fulltime"),
      location: locationMatch?.[1]?.trim() || "",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "USD",
      remote: humanizeRemote(locationMatch?.[1] || "Unknown"),
      skills: [],
      description: "",
      applyUrl: `${BASE_URL}/jobs/view/${jobId}`,
      jobUrl: `${BASE_URL}/jobs/view/${jobId}`,
      seniority: "",
      category: "",
    });
  }

  return jobs;
}

function parseLinkedInJob(raw: Record<string, unknown>): JobRecord | null {
  const id = String(raw.id || raw.jobId || "");
  const title = String(raw.title || raw.jobTitle || raw.position || "");
  const company = String(raw.companyName || raw.company || raw.employer || "");

  if (!id || !title) return null;

  const location = String(raw.location || raw.formattedLocation || "");
  const salary = raw.salary as string | undefined;
  const salaryInfo = salary ? extractSalary(salary) : { min: null, max: null, currency: "USD" };
  const description = String(raw.description || raw.jobDescription || "");
  const skills = extractSkillsFromText(`${title} ${company} ${description}`);

  return {
    id: generateJobId(SOURCE_SLUG, id),
    sourceSlug: SOURCE_SLUG,
    title,
    companyName: company || "Unknown",
    companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    companyOneLiner: "",
    companyLogoUrl: raw.logoUrl as string || null,
    companyWebsiteUrl: null,
    jobType: humanizeJobType(String(raw.employmentType || raw.jobType || "fulltime")),
    location,
    salaryMin: salaryInfo.min,
    salaryMax: salaryInfo.max,
    salaryCurrency: salaryInfo.currency,
    remote: raw.remote as string || humanizeRemote(location),
    skills: skills.slice(0, 15),
    description: description.slice(0, 500),
    applyUrl: String(raw.applyUrl || raw.apply_url || raw.url || `${BASE_URL}/jobs/view/${id}`),
    jobUrl: String(raw.jobUrl || raw.job_url || `${BASE_URL}/jobs/view/${id}`),
    seniority: String(raw.seniority || raw.level || ""),
    category: String(raw.category || ""),
  };
}

async function crawlLinkedInJobs(): Promise<JobRecord[]> {
  const allJobs = new Map<string, JobRecord>();
  const PAGE_SIZE = 25;

  for (const query of SEARCH_QUERIES) {
    for (let start = 0; start < 100; start += PAGE_SIZE) {
      try {
        const jobs = await fetchLinkedInPage(query, start);
        if (jobs.length === 0) break;

        for (const job of jobs) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }

        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.warn(`LinkedIn: failed query "${query}" at ${start}:`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlLinkedInJobs };
