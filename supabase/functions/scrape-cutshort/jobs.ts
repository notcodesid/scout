import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml, extractJsonFromScript } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "cutshort";
const BASE_URL = "https://cutshort.io";

const TECH_TAGS = [
  "software-engineer",
  "frontend-developer",
  "backend-developer",
  "full-stack-developer",
  "product-manager",
  "data-scientist",
  "devops-engineer",
  "mobile-developer",
];

async function fetchCutshortPage(tag: string, page: number): Promise<JobRecord[]> {
  const url = page === 1
    ? `${BASE_URL}/jobs/${tag}`
    : `${BASE_URL}/jobs/${tag}?page=${page}`;

  const html = await fetchHtml(url, { timeoutMs: 20000 });

  const raw = extractJsonFromScript(html, `<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)</script>`);
  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const props = (data.props as Record<string, unknown>) || {};
    const pageData = (props.pageProps as Record<string, unknown>) || {};
    const jobs = pageData.jobs as unknown[] ||
      pageData.jobListings as unknown[] ||
      pageData.data as unknown[] ||
      [];
    return parseCutshortJobs(jobs, url);
  }

  return parseCutshortHtml(html, url);
}

function parseCutshortJobs(rawJobs: unknown[], sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  for (const raw of rawJobs) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    const id = String(r.id || r.jobId || Math.random());
    const title = String(r.title || r.designation || r.position || "");
    const company = String(r.companyName || r.company || r.name || "");
    if (!title || !company) continue;

    const location = String(r.location || r.city || "");
    const experience = String(r.experience || r.minExperience || "");
    const salaryInfo = r.salary
      ? extractSalary(String(r.salary))
      : r.salaryRange
        ? extractSalary(String(r.salaryRange))
        : { min: null, max: null, currency: "INR" };
    const description = String(r.description || r.summary || "");
    const skills = Array.isArray(r.skills) ? r.skills.slice(0, 15) as string[] :
      typeof r.skills === "string" ? (r.skills as string).split(",").slice(0, 15) : extractSkillsFromText(description).slice(0, 10);

    jobs.push({
      id: generateJobId(SOURCE_SLUG, id),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: (r.companySlug as string || company).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: description.slice(0, 100),
      companyLogoUrl: r.logoUrl as string || r.logo_url as string || null,
      companyWebsiteUrl: r.websiteUrl as string || null,
      jobType: humanizeJobType(String(r.jobType || r.employmentType || "fulltime")),
      location,
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency === "INR" ? "INR" : "INR",
      remote: r.remote as string || humanizeRemote(location),
      skills: skills.map((s) => String(s).trim()).filter(Boolean),
      description,
      applyUrl: String(r.applyUrl || r.apply_url || r.url || `${BASE_URL}/jobs/${id}`),
      jobUrl: String(r.jobUrl || r.job_url || r.url || `${BASE_URL}/jobs/${id}`),
      seniority: experience,
      category: tag,
    });
  }

  return jobs;
}

function parseCutshortHtml(html: string, sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  const cardMatches = html.matchAll(/<div[^>]+class="[^"]*(?:job-card|jobItem|jobs-list_item)[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*(?:job-card|jobItem|jobs-list_item)|$)/gi);
  for (const cardMatch of cardMatches) {
    const card = cardMatch[1];

    const titleMatch = card.match(/<a[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)/i) ||
      card.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
    const companyMatch = card.match(/class="[^"]*company[^"]*"[^>]*>\s*([^<]+)/i);
    const locationMatch = card.match(/class="[^"]*location[^"]*"[^>]*>\s*([^<]+)/i);
    const salaryMatch = card.match(/class="[^"]*salary[^"]*"[^>]*>\s*([^<]+)/i);

    const title = titleMatch?.[1]?.trim() || "";
    const company = companyMatch?.[1]?.trim() || "";

    if (!title || !company) continue;

    const salaryInfo = salaryMatch ? extractSalary(salaryMatch[1]) : { min: null, max: null, currency: "INR" };

    jobs.push({
      id: generateJobId(SOURCE_SLUG, `cs_${Math.random().toString(36).slice(2)}`),
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

async function crawlCutshortJobs(): Promise<JobRecord[]> {
  const allJobs = new Map<string, JobRecord>();

  for (const tag of TECH_TAGS) {
    for (let page = 1; page <= 3; page++) {
      try {
        const jobs = await fetchCutshortPage(tag, page);
        for (const job of jobs) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }
        if (jobs.length === 0) break;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.warn(`Cutshort: failed ${tag} page ${page}:`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlCutshortJobs };
