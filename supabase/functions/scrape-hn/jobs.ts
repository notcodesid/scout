import {
  humanizeJobType,
  humanizeRemote,
  generateJobId,
  extractSalary,
  extractSkillsFromText,
  type JobRecord,
} from "../_shared/scrapers/base.ts";
import { fetchJson, fetchHtml, decodeHtmlEntities } from "../_shared/scrapers/http.ts";

const SOURCE_SLUG = "hn";
const HN_BASE = "https://hacker-news.firebaseio.com/v0";

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  kids?: number[];
  time: number;
  by: string;
  type: string;
}

interface HNComment {
  id: number;
  text?: string;
  by?: string;
  time: number;
  kids?: number[];
}

function getCurrentHiringThreadId(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const title = `Ask HN: Who is hiring? (${monthNames[month]} ${year})`;

  const KNOWN_THREADS: Record<string, number> = {
    "Ask HN: Who is hiring? (April 2026)": 41907000,
  };

  return (
    KNOWN_THREADS[title] ||
    findThreadByMonth(year, month) ||
    41907000
  );
}

function findThreadByMonth(year: number, month: number): number | null {
  return null;
}

async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    return await fetchJson<HNItem>(`${HN_BASE}/item/${id}.json`);
  } catch {
    return null;
  }
}

async function fetchHNComments(ids: number[]): Promise<HNComment[]> {
  const comments: HNComment[] = [];
  for (const id of ids.slice(0, 100)) {
    try {
      const comment = await fetchJson<HNComment>(`${HN_BASE}/item/${id}.json`);
      if (comment && comment.text) {
        comments.push(comment);
      }
    } catch {
      // skip
    }
  }
  return comments;
}

function parseJobFromComment(comment: HNComment): JobRecord | null {
  const raw = decodeHtmlEntities(comment.text || "");

  const companyMatch = raw.match(/^\s*\*\s*([A-Z][A-Za-z0-9\s&.,-]+?)\s*[-–—]/);
  if (!companyMatch) return null;

  const companyName = companyMatch[1].trim();
  const rest = raw.slice(companyMatch[0].length);

  const titleMatch = rest.match(/^\s*\*\s*(.+?)\s*(?:[-–—]|\n|$)/);
  const title = titleMatch ? titleMatch[1].trim() : "Unknown Role";

  let location = "";
  let remote = "Unknown";
  const remotePatterns = [
    { regex: /\b(100%|fully)\s*remote\b/gi, value: "Remote" },
    { regex: /\bremote\b/gi, value: "Remote" },
    { regex: /\bhybrid\b/gi, value: "Hybrid" },
    { regex: /\b(onsite|on-site|office)\b/gi, value: "On-site" },
  ];
  for (const p of remotePatterns) {
    if (p.regex.test(raw)) {
      remote = p.value;
      break;
    }
  }

  const locationMatch = raw.match(/(?:location|location:|based in|🇺🇸|🇬🇧|🇮🇳|🇨🇦|🇦🇺)(?:\s*:\s*)([^\n,]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }

  const salaryMatch = raw.match(/[$₹€£¥][\d,]+(?:\s*[-–—]\s*[$₹€£¥][\d,]+|\s*(?:k|K)?(?:\/\s*y(?:ear)?r?)?)/);
  const salaryInfo = salaryMatch ? extractSalary(salaryMatch[0]) : { min: null, max: null, currency: "USD" };

  const applyMatch = raw.match(/(?:apply|email|mailto|https?:\/\/[^\s]+(?:apply|jobs|careers)[^\s]*)/i);
  const applyUrl = applyMatch ? applyMatch[0].replace(/apply:|email:/i, "").trim() : "";

  const skills = extractSkillsFromText(raw);

  const id = `hn_${comment.id}`;
  return {
    id: generateJobId(SOURCE_SLUG, id),
    sourceSlug: SOURCE_SLUG,
    title,
    companyName,
    companySlug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    companyOneLiner: "",
    companyLogoUrl: null,
    companyWebsiteUrl: null,
    jobType: humanizeJobType("fulltime"),
    location: location || "Remote",
    salaryMin: salaryInfo.min,
    salaryMax: salaryInfo.max,
    salaryCurrency: salaryInfo.currency,
    remote,
    skills: skills.slice(0, 15),
    description: raw.slice(0, 500),
    applyUrl: applyUrl || "https://news.ycombinator.com",
    jobUrl: `https://news.ycombinator.com/item?id=${comment.id}`,
    seniority: "",
    category: "",
  };
}

async function fetchHNHiringJobs(): Promise<JobRecord[]> {
  const threadId = getCurrentHiringThreadId();
  const item = await fetchHNItem(threadId);

  if (!item || !item.kids) {
    const fallbackHtml = await fetchHtml("https://hn.algolia.com/?q=who+is+hiring&tags=ask_hn");
    console.log("Fallback: using empty HN jobs (thread fetch failed)");
    return [];
  }

  const comments = await fetchHNComments(item.kids);
  const jobs: JobRecord[] = [];

  for (const comment of comments) {
    try {
      const job = parseJobFromComment(comment);
      if (job && job.title !== "Unknown Role") {
        jobs.push(job);
      }
    } catch {
      // skip malformed comments
    }
  }

  return jobs;
}

export { fetchHNHiringJobs };
