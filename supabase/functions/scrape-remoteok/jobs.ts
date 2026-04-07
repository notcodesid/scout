import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchJson } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "remoteok";
const BASE_URL = "https://remoteok.com";
const API_URL = `${BASE_URL}/api`;

interface RemoteOkJob {
  id: number;
  position: string;
  company: string;
  location: string;
  tags: Array<{ name: string }>;
  salary?: string;
  url: string;
  "remote-only"?: boolean;
  "100-remote"?: boolean;
  description?: string;
}

async function fetchRemoteOkJobs(): Promise<JobRecord[]> {
  const data = await fetchJson<RemoteOkJob[]>(API_URL, { timeoutMs: 20000 });

  const jobs: JobRecord[] = [];
  for (const raw of data) {
    if (!raw.id || !raw.position || !raw.company) continue;

    const salaryInfo = raw.salary ? extractSalary(raw.salary) : { min: null, max: null, currency: "USD" };
    const description = typeof raw.description === "string" ? raw.description : "";
    const skills = raw.tags
      ? raw.tags
          .slice(0, 15)
          .map((t) => t.name)
          .filter((n) => n.length > 1 && n.length < 30)
      : [];

    const tagsText = raw.tags ? raw.tags.map((t) => t.name).join(" ") : "";
    const allText = `${raw.position} ${raw.company} ${tagsText} ${description}`;
    const extractedSkills = extractSkillsFromText(allText);
    const combinedSkills = [...new Set([...skills, ...extractedSkills])].slice(0, 20);

    const isRemote = raw["remote-only"] || raw["100-remote"] || tagsText.toLowerCase().includes("remote");

    jobs.push({
      id: generateJobId(SOURCE_SLUG, raw.id),
      sourceSlug: SOURCE_SLUG,
      title: raw.position,
      companyName: raw.company,
      companySlug: raw.company.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      companyOneLiner: raw.tags?.slice(0, 3).map((t) => t.name).join(", ") || "",
      companyLogoUrl: null,
      companyWebsiteUrl: null,
      jobType: humanizeJobType("fulltime"),
      location: raw.location || "Remote",
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency,
      remote: isRemote ? "Remote" : humanizeRemote(raw.location || "Unknown"),
      skills: combinedSkills,
      description,
      applyUrl: raw.url || `${BASE_URL}/remote-jobs/${raw.id}`,
      jobUrl: raw.url || `${BASE_URL}/remote-jobs/${raw.id}`,
      seniority: "",
      category: raw.tags?.[0]?.name || "",
    });
  }

  return jobs;
}

export { fetchRemoteOkJobs };
export type { RemoteOkJob };
