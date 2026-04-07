import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml, extractJsonFromScript } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "glassdoor";
const BASE_URL = "https://www.glassdoor.com";

const SEARCH_QUERIES = [
  "software engineer",
  "frontend developer",
  "data scientist",
  "product manager",
  "devops engineer",
];

async function fetchGlassdoorPage(query: string, page: number): Promise<JobRecord[]> {
  const encodedQ = encodeURIComponent(query);
  const url = page === 1
    ? `${BASE_URL}/Job/jobs.htm?sc.keyword=${encodedQ}&locT=C`
    : `${BASE_URL}/Job/jobs.htm?sc.keyword=${encodedQ}&locT=C&page=${page}`;

  const html = await fetchHtml(url, { timeoutMs: 20000 });

  const raw = extractJsonFromScript(html, `<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)</script>`);
  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const props = (data.props as Record<string, unknown>) || {};
    const pageData = (props.pageProps as Record<string, unknown>) || {};
    const jobs = pageData.jobs as unknown[] || pageData.jobListings as unknown[] || [];
    return parseGlassdoorJobs(jobs, url);
  }

  const scriptState = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
  if (scriptState) {
    try {
      const parsed = JSON.parse(scriptState[1]);
      const jobs = parsed?.jobs || parsed?.jobListings || parsed?.results || [];
      return parseGlassdoorJobs(jobs, url);
    } catch {
      // ignore
    }
  }

  return parseGlassdoorHtml(html, url);
}

function parseGlassdoorJobs(rawJobs: unknown[], sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  for (const raw of rawJobs) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    const id = String(r.jobId || r.id || Math.random());
    const title = String(r.jobTitle || r.title || r.position || "");
    const company = String(r.employerName || r.company || r.employer || "");
    if (!title || !company) continue;

    const salaryInfo = r.salary ? extractSalary(String(r.salary)) : { min: null, max: null, currency: "USD" };
    const location = String(r.location || r.city || "");
    const description = String(r.snippet || r.description || r.summary || "");
    const skills = extractSkillsFromText(`${title} ${company} ${description}`);

    jobs.push({
      id: generateJobId(SOURCE_SLUG, id),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: description.slice(0, 100),
      companyLogoUrl: r.logoUrl as string || null,
      companyWebsiteUrl: null,
      jobType: humanizeJobType(String(r.employmentType || "fulltime")),
      location,
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency,
      remote: r.remote as string || humanizeRemote(location),
      skills: skills.slice(0, 15),
      description,
      applyUrl: String(r.applyUrl || r.apply_url || `${BASE_URL}/Job/viewjob.htm?jobId=${id}`),
      jobUrl: String(r.jobUrl || r.job_url || `${BASE_URL}/Job/viewjob.htm?jobId=${id}`),
      seniority: String(r.seniority || r.level || ""),
      category: String(r.department || r.category || ""),
    });
  }

  return jobs;
}

function parseGlassdoorHtml(html: string, sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  const jobCards = html.matchAll(/<li[^>]*class="[^"]*JobCard[^"]*"[^>]*>([\s\S]*?)<\/li>/gi);
  for (const cardMatch of jobCards) {
    const card = cardMatch[1];
    const titleMatch = card.match(/<a[^>]*title="([^"]+)"/);
    const companyMatch = card.match(/class="[^"]*employerName[^"]*"[^>]*>\s*([^<]+)/);
    const salaryMatch = card.match(/class="[^"]*salary[^"]*"[^>]*>\s*([^<]+)/);
    const locationMatch = card.match(/class="[^"]*location[^"]*"[^>]*>\s*([^<]+)/);

    const title = titleMatch?.[1]?.trim() || "";
    const company = companyMatch?.[1]?.trim() || "";

    if (!title || !company) continue;

    const salaryInfo = salaryMatch ? extractSalary(salaryMatch[1]) : { min: null, max: null, currency: "USD" };

    jobs.push({
      id: generateJobId(SOURCE_SLUG, `gd_${Math.random().toString(36).slice(2)}`),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: "",
      companyLogoUrl: null,
      companyWebsiteUrl: null,
      jobType: humanizeJobType("fulltime"),
      location: locationMatch?.[1]?.trim() || "",
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency,
      remote: "Unknown",
      skills: [],
      description: "",
      applyUrl: sourceUrl,
      jobUrl: sourceUrl,
      seniority: "",
      category: "",
    });
  }

  return jobs;
}

async function crawlGlassdoorJobs(): Promise<JobRecord[]> {
  const allJobs = new Map<string, JobRecord>();

  for (const query of SEARCH_QUERIES) {
    for (let page = 1; page <= 2; page++) {
      try {
        const jobs = await fetchGlassdoorPage(query, page);
        for (const job of jobs) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }
        if (jobs.length === 0) break;
        await new Promise((r) => setTimeout(r, 2500));
      } catch (e) {
        console.warn(`Glassdoor: failed ${query} page ${page}:`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlGlassdoorJobs };
