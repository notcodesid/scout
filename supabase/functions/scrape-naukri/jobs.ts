import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml, extractJsonFromScript } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "naukri";
const BASE_URL = "https://www.naukri.com";

const CATEGORIES = [
  "it-software-jobs",
  "engineering-jobs",
  "marketing-jobs",
  "sales-jobs",
  "finance-jobs",
];

async function fetchNaukriPage(category: string, page: number): Promise<JobRecord[]> {
  const url = `${BASE_URL}/${category}${page > 1 ? `-${page}` : ""}`;
  const html = await fetchHtml(url, { timeoutMs: 25000 });

  const raw = extractJsonFromScript(
    html,
    `<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)</script>`,
  );

  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const pageProps = data.props as Record<string, unknown> | undefined;
    const allProps = pageProps?.pageProps as Record<string, unknown> | undefined;

    const jobs = allProps?.jobSearchPage?.jobResults as unknown[] ||
      allProps?.jobListings as unknown[] ||
      allProps?.jobs as unknown[] ||
      [];
    return parseNaukriJobs(jobs, url);
  }

  return parseNaukriHtml(html, url);
}

function parseNaukriJobs(rawJobs: unknown[], sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  for (const raw of rawJobs) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    const id = String(r.jobId || r.id || r.job_id || Math.random());
    const title = String(r.title || r.designation || r.jobTitle || "");
    const company = String(r.companyName || r.company || r.name || "");
    if (!title || !company) continue;

    const salaryInfo = r.salary ? extractSalary(String(r.salary)) : { min: null, max: null, currency: "INR" };
    const location = String(r.location || r.city || r.locations || "");
    const experience = String(r.experience || r.exp || "");
    const skills = Array.isArray(r.skills) ? r.skills.slice(0, 15) as string[] :
      typeof r.skills === "string" ? (r.skills as string).split(",").slice(0, 15) : [];
    const description = String(r.description || r.jobDescription || r.summary || "");

    jobs.push({
      id: generateJobId(SOURCE_SLUG, id),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: description.slice(0, 100),
      companyLogoUrl: r.logoUrl as string || null,
      companyWebsiteUrl: null,
      jobType: humanizeJobType(r.employmentType as string || "fulltime"),
      location,
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency === "INR" ? "INR" : "INR",
      remote: humanizeRemote(location),
      skills: skills.map((s) => String(s).trim()).filter(Boolean),
      description,
      applyUrl: String(r.applyUrl || r.apply_url || r.url || `${BASE_URL}/job-alerts`),
      jobUrl: String(r.jobUrl || r.job_url || r.url || `${BASE_URL}/job-alerts`),
      seniority: experience,
      category: String(r.category || r.subCategory || ""),
    });
  }

  return jobs;
}

function parseNaukriHtml(html: string, sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  const titleMatches = html.matchAll(/<a[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/gi);
  const companyMatches = html.matchAll(/class="[^"]*company[^"]*"[^>]*>\s*<span[^>]*>\s*([^<]+)\s*<\/span>/gi);
  const salaryMatches = html.matchAll(/class="[^"]*salary[^"]*"[^>]*>\s*([^<₹,\d\s]+)/gi);

  const titles: string[] = [];
  for (const m of titleMatches) titles.push(m[1].trim());
  const companies: string[] = [];
  for (const m of companyMatches) companies.push(m[1].trim());

  for (let i = 0; i < Math.min(titles.length, companies.length); i++) {
    const title = titles[i];
    const company = companies[i];
    if (!title || !company) continue;

    jobs.push({
      id: generateJobId(SOURCE_SLUG, `html_${i}_${Date.now()}`),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: "",
      companyLogoUrl: null,
      companyWebsiteUrl: null,
      jobType: humanizeJobType("fulltime"),
      location: "",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "INR",
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

async function crawlNaukriJobs(): Promise<JobRecord[]> {
  const allJobs = new Map<string, JobRecord>();

  for (const category of CATEGORIES) {
    for (let page = 1; page <= 3; page++) {
      try {
        const jobs = await fetchNaukriPage(category, page);
        for (const job of jobs) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }
        if (jobs.length === 0) break;
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.warn(`Naukri: failed ${category} page ${page}:`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlNaukriJobs };
