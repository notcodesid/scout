import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchHtml } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "indeed";
const BASE_URL = "https://www.indeed.com";
const PAGE_SIZE = 15;

const SEARCH_QUERIES = [
  { q: "software engineer", l: "United States" },
  { q: "frontend developer", l: "Remote" },
  { q: "backend developer", l: "Remote" },
];

const MAX_PAGES_PER_QUERY = 3;

async function fetchIndeedPage(query: string, location: string, start: number): Promise<JobRecord[]> {
  const params = new URLSearchParams({
    q: query,
    l: location,
    start: start.toString(),
    radius: "25",
    sort: "date",
  });

  const url = `${BASE_URL}/jobs?${params.toString()}`;
  const html = await fetchHtml(url, { timeoutMs: 20000 });

  const scriptMatch = html.match(/window\.MOSAIC\.initialState\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (scriptMatch) {
    try {
      const state = JSON.parse(scriptMatch[1]);
      const jobs = state?.jobSearchPage?.jobResults || state?.mosaicProviderJobCardsModel?.results || [];
      return jobs.slice(0, PAGE_SIZE).map((j: Record<string, unknown>) => {
        const rawSalary = j.salarySnippetHtml as string || j.salary as string || "";
        const salaryInfo = extractSalary(rawSalary);
        const snippet = j.snippet as string || j.jobSnippet as string || "";
        const allText = `${j.jobTitle} ${j.companyName || j.company} ${snippet}`;
        const skills = extractSkillsFromText(allText).slice(0, 15);
        const remoteLoc = j.remoteLocation as string;
        const locationVal = j.jobLocationCity as string || j.location as string || remoteLoc || location;

        return {
          id: generateJobId(SOURCE_SLUG, j.jobKey as string || j.jobkey as string),
          sourceSlug: SOURCE_SLUG,
          title: (j.jobTitle as string || j.title as string || "Unknown").replace(/<[^>]*>/g, ""),
          companyName: (j.companyName as string || j.company as string || "Unknown").replace(/<[^>]*>/g, ""),
          companySlug: ((j.companyName as string || j.company as string || "unknown")).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          companyOneLiner: "",
          companyLogoUrl: null,
          companyWebsiteUrl: null,
          jobType: humanizeJobType("fulltime"),
          location: locationVal,
          salaryMin: salaryInfo.min,
          salaryMax: salaryInfo.max,
          salaryCurrency: salaryInfo.currency,
          remote: remoteLoc ? "Remote" : humanizeRemote(locationVal),
          skills,
          description: snippet.replace(/<[^>]*>/g, ""),
          applyUrl: j.absoluteUrl as string || `${BASE_URL}/pagead/clk?mo=r&d=0&j=${j.jobKey || j.jobkey}`,
          jobUrl: j.absoluteUrl as string || `${BASE_URL}/pagead/clk?mo=r&d=0&j=${j.jobKey || j.jobkey}`,
          seniority: "",
          category: query,
        } as JobRecord;
      });
    } catch {
      // fall through to empty
    }
  }

  return [];
}

async function crawlIndeedJobs(): Promise<JobRecord[]> {
  const allJobs = new Map<string, JobRecord>();

  for (const search of SEARCH_QUERIES) {
    for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
      const start = page * PAGE_SIZE;
      try {
        const jobs = await fetchIndeedPage(search.q, search.l, start);
        if (jobs.length === 0) break;

        for (const job of jobs) {
          if (!allJobs.has(job.id)) {
            allJobs.set(job.id, job);
          }
        }

        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.warn(`Indeed: failed page ${page} for "${search.q}" in "${search.l}":`, e);
        break;
      }
    }
  }

  return Array.from(allJobs.values());
}

export { crawlIndeedJobs };
