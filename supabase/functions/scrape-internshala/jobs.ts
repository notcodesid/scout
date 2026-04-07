import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml, extractJsonFromScript } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "internshala";
const BASE_URL = "https://internshala.com";

const CATEGORIES = [
  "internships",
  "freshers-jobs",
];

async function fetchInternshalaPage(category: string, page: number): Promise<JobRecord[]> {
  const url = page === 1
    ? `${BASE_URL}/${category}`
    : `${BASE_URL}/${category}?page=${page}`;

  const html = await fetchHtml(url, { timeoutMs: 20000 });

  const raw = extractJsonFromScript(html, `<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)</script>`);
  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;
    const props = (data.props as Record<string, unknown>) || {};
    const pageData = (props.pageProps as Record<string, unknown>) || {};
    const internships = pageData.internships as unknown[] ||
      pageData.jobs as unknown[] ||
      pageData.results as unknown[] ||
      [];
    return parseInternshalaJobs(internships, url);
  }

  return parseInternshalaHtml(html, url);
}

function parseInternshalaJobs(rawJobs: unknown[], sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  for (const raw of rawJobs) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    const id = String(r.id || Math.random());
    const title = String(r.title || r.designation || r.profile || "");
    const company = String(r.companyName || r.company || r.name || "");
    if (!title || !company) continue;

    const location = String(r.location || r.city || r.cities || "");
    const duration = String(r.duration || r.stipend || "");
    const description = String(r.description || r.summary || r.about || "");
    const skills = Array.isArray(r.skills) ? r.skills.slice(0, 15) as string[] :
      typeof r.skills === "string" ? (r.skills as string).split(",").slice(0, 15) : [];

    const isInternship = r.isInternship as boolean || r.type as string === "internship";
    const jobType = isInternship ? "Internship" : humanizeJobType("fulltime");

    jobs.push({
      id: generateJobId(SOURCE_SLUG, id),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: description.slice(0, 100),
      companyLogoUrl: r.logo_url as string || null,
      companyWebsiteUrl: r.website_url as string || null,
      jobType,
      location,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "INR",
      remote: humanizeRemote(String(r.workFromHome || r.wfh || "")),
      skills: skills.map((s) => String(s).trim()).filter(Boolean),
      description,
      applyUrl: String(r.apply_url || r.applyUrl || `${BASE_URL}/apply/${id}`),
      jobUrl: String(r.detail_page_url || r.url || `${BASE_URL}/internships/detail/${id}`),
      seniority: isInternship ? "Intern / Fresher" : "",
      category: isInternship ? "Internship" : "Entry-level",
    });
  }

  return jobs;
}

function parseInternshalaHtml(html: string, sourceUrl: string): JobRecord[] {
  const jobs: JobRecord[] = [];

  const cardMatches = html.matchAll(/<div[^>]+class="[^"]*(?:internship_card|job_card|view_more_block)[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*(?:internship_card|job_card|view_more_block)|$)/gi);
  for (const cardMatch of cardMatches) {
    const card = cardMatch[1];

    const titleMatch = card.match(/class="[^"]*profile[^"]*"[^>]*>\s*<a[^>]*>([^<]+)/i) ||
      card.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const companyMatch = card.match(/class="[^"]*company[^"]*"[^>]*>\s*<a[^>]*>([^<]+)/i) ||
      card.match(/class="[^"]*company_name[^"]*"[^>]*>\s*([^<]+)/i);
    const locationMatch = card.match(/class="[^"]*location[^"]*"[^>]*>\s*([^<]+)/i);
    const stipendMatch = card.match(/(?:stipend|salary)[^:]*:\s*([^<,\n]+)/i);

    const title = titleMatch?.[1]?.trim() || "";
    const company = companyMatch?.[1]?.trim() || "";

    if (!title || !company) continue;

    const salaryInfo = stipendMatch ? extractSalary(stipendMatch[1]) : { min: null, max: null, currency: "INR" };
    const isInternship = sourceUrl.includes("internships");

    jobs.push({
      id: generateJobId(SOURCE_SLUG, `is_${Math.random().toString(36).slice(2)}`),
      sourceSlug: SOURCE_SLUG,
      title,
      companyName: company,
      companySlug: company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: "",
      companyLogoUrl: null,
      companyWebsiteUrl: null,
      jobType: isInternship ? "Internship" : humanizeJobType("fulltime"),
      location: locationMatch?.[1]?.trim() || "",
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency,
      remote: "Unknown",
      skills: [],
      description: "",
      applyUrl: sourceUrl,
      jobUrl: sourceUrl,
      seniority: isInternship ? "Intern / Fresher" : "",
      category: isInternship ? "Internship" : "Entry-level",
    });
  }

  return jobs;
}

async function crawlInternshalaJobs(): Promise<JobRecord[]> {
  const allJobs = new Map<string, JobRecord>();

  for (const category of CATEGORIES) {
    for (let page = 1; page <= 5; page++) {
      try {
        const jobs = await fetchInternshalaPage(category, page);
        for (const job of jobs) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }
        if (jobs.length === 0) break;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.warn(`Internshala: failed ${category} page ${page}:`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlInternshalaJobs };
