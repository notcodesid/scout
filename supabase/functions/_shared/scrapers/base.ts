export interface JobRecord {
  id: string;
  sourceSlug: string;
  title: string;
  companyName: string;
  companySlug: string;
  companyOneLiner: string;
  companyLogoUrl: string | null;
  companyWebsiteUrl: string | null;
  jobType: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  remote: string;
  skills: string[];
  description: string;
  applyUrl: string;
  jobUrl: string;
  seniority: string;
  category: string;
}

export interface SourceConfig {
  slug: string;
  label: string;
  baseUrl: string;
  description: string;
  defaultStaleAfterMinutes: number;
}

export interface SyncResult {
  sourceSlug: string;
  success: boolean;
  jobsCrawled: number;
  jobsUpserted: number;
  error?: string;
  durationMs: number;
}

export const SYNC_COOLDOWN_MS = 10 * 60 * 1000;
export const RUNNING_TIMEOUT_MS = 20 * 60 * 1000;
export const UPSERT_CHUNK_SIZE = 250;

export const USER_AGENT = "Mozilla/5.0 (compatible; ScoutBot/2.0; +https://scout.dev)";

export const JOB_TYPE_MAP: Record<string, string> = {
  fulltime: "Full-time",
  full_time: "Full-time",
  "full-time": "Full-time",
  parttime: "Part-time",
  part_time: "Part-time",
  "part-time": "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  intern: "Internship",
  internship: "Internship",
  temporary: "Temporary",
};

export const REMOTE_MAP: Record<string, string> = {
  remote: "Remote",
  "remote-only": "Remote",
  "worldwide": "Remote",
  "100-remote": "Remote",
  "hybrid": "Hybrid",
  onsite: "On-site",
  "on-site": "On-site",
  office: "On-site",
  "not-specified": "Unknown",
  unknown: "Unknown",
};

export function humanizeJobType(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  return JOB_TYPE_MAP[normalized] ?? raw;
}

export function humanizeRemote(raw: string): string {
  const normalized = raw.toLowerCase().trim();
  return REMOTE_MAP[normalized] ?? "Unknown";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractSalary(raw: string): {
  min: number | null;
  max: number | null;
  currency: string;
} {
  const cleaned = raw.replace(/[^0-9kKk$,.\s]/g, " ").trim();

  const currencyMatch = cleaned.match(/([₹$€£¥])/);
  const currency = currencyMatch
    ? currencyMatch[1] === "$"
      ? "USD"
      : currencyMatch[1] === "€"
        ? "EUR"
        : currencyMatch[1] === "£"
          ? "GBP"
          : currencyMatch[1] === "¥"
            ? "JPY"
            : currencyMatch[1] === "₹"
              ? "INR"
              : "USD"
    : "USD";

  const numbers = cleaned
    .replace(/[^0-9\s]/g, " ")
    .split(/\s+/)
    .map((s) => {
      const n = parseFloat(s.replace(/,/g, ""));
      return isNaN(n) ? null : n;
    })
    .filter((n): n is number => n !== null && n > 0);

  if (numbers.length === 0) return { min: null, max: null, currency };

  let min: number | null = null;
  let max: number | null = null;

  for (const num of numbers) {
    if (num < 20 && num > 0) continue;
    const scaled = num < 1000 ? num * 1000 : num;

    if (!min || scaled < min) min = scaled;
    if (!max || scaled > max) max = scaled;
  }

  return { min, max, currency };
}

export function extractSkillsFromText(text: string): string[] {
  const TECH_KEYWORDS = [
    "python", "javascript", "typescript", "java", "go", "golang", "rust", "c++", "c#",
    "react", "vue", "angular", "svelte", "next.js", "nextjs", "node.js", "nodejs",
    "django", "flask", "fastapi", "spring", "rails", "laravel", "express",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
    "tensorflow", "pytorch", "machine learning", "ml", "ai", "llm", "nlp",
    "html", "css", "tailwind", "sass", "graphql", "rest", "api",
    "git", "github", "gitlab", "ci/cd", "devops", "sre",
    "ios", "android", "swift", "kotlin", "react native", "flutter",
    "figma", "sketch", "product design", "ui/ux",
    "data science", "analytics", "tableau", "power bi", "sql",
    "blockchain", "web3", "solidity", "ethereum",
    "rust", "c", "ruby", "php", "perl", "scala", "r",
    "agile", "scrum", "kanban", "jira",
    "linux", "unix", "bash", "shell",
    "microservices", "serverless", "lambda", "cloudflare",
  ];

  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const tech of TECH_KEYWORDS) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) {
      found.push(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  }

  return [...new Set(found)];
}

export function generateJobId(sourceSlug: string, rawId: string | number): string {
  return `${sourceSlug}__${rawId}`;
}

export function parseTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
