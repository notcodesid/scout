import { hostFromUrl } from "./utils";
import type {
  PersonContact,
  ResearchMaterial,
  ResearchPage,
  ResearchSearchResult,
  ResearchSource,
  ResearchStep,
} from "./types";

const JINA_READER = "https://r.jina.ai/";
// Kept lean so calls fit free-tier token-per-minute limits (e.g., Groq's
// 12k TPM on llama-3.3-70b). The AI still gets the meaningful part of each
// page; sources remain clickable for the candidate to read in full.
const MAX_PAGE_CHARS = 5000;
const MAX_RESULT_CHARS = 700;
const SEARCH_RESULTS = 6;
const PAGE_HINTS = ["/team", "/about", "/people", "/founders", "/leadership", "/about-us"];
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IMAGE_TLDS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "css", "js"]);

function isRealEmail(email: string): boolean {
  const tld = email.split(".").pop()?.toLowerCase() ?? "";
  return !IMAGE_TLDS.has(tld) && !email.includes("..");
}

function bareHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractEmails(...texts: string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    for (const m of text.matchAll(EMAIL_RE)) {
      const email = m[0].replace(/[.,;:)\]}>]+$/, "").toLowerCase();
      if (isRealEmail(email)) found.add(email);
    }
  }
  return [...found];
}

export function normalizeUrl(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}\n… [truncated]`;
}

// Fetch one page as LLM-ready markdown via Jina Reader. Free, no key,
// ~20 req/min on the public tier.
async function fetchPage(url: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch(`${JINA_READER}${url}`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      throw new Error(`Jina Reader returned ${res.status}`);
    }
    const text = await res.text();
    if (!text.trim()) throw new Error("Page came back empty");
    return { text: truncate(text, MAX_PAGE_CHARS) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch page";
    return { text: "", error: message };
  }
}

function safeSnippet(result: {
  title?: string;
  url?: string;
  text?: string;
  highlights?: unknown;
  summary?: unknown;
}): string {
  if (Array.isArray(result.highlights) && typeof result.highlights[0] === "string") {
    return truncate(result.highlights[0], 400);
  }
  if (typeof result.summary === "string" && result.summary.trim()) {
    return truncate(result.summary, 400);
  }
  if (typeof result.text === "string" && result.text.trim()) {
    return truncate(result.text, 400);
  }
  return "";
}

// Discover context around the company (team, funding, product, news) via Exa.
// Without a key this is skipped gracefully — the fetched URLs still work.
async function searchExa(query: string): Promise<{
  results: ResearchSearchResult[];
  error?: string;
}> {
  const key = process.env.EXA_API_KEY?.trim();
  if (!key) return { results: [], error: "skipped" };
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        query,
        numResults: SEARCH_RESULTS,
        type: "auto",
        contents: {
          text: { maxCharacters: MAX_RESULT_CHARS },
          highlights: { numSentences: 2 },
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Exa returned ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      results?: Array<{
        url?: string;
        title?: string;
        text?: string;
        highlights?: unknown;
        summary?: unknown;
        publishedDate?: string;
        author?: string;
      }>;
    };
    const results = (data.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({
        url: r.url!,
        title: r.title?.trim() || hostFromUrl(r.url || ""),
        snippet: safeSnippet(r),
        publishedDate: r.publishedDate,
        author: r.author,
      }));
    return { results };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Exa search failed";
    return { results: [], error: message };
  }
}

// One targeted search for a person: find their LinkedIn, X, GitHub, and any
// email attached to their name. Best-effort — returns only what it finds.
async function searchForContact(name: string, company: string): Promise<{
  linkedin?: string;
  x?: string;
  github?: string;
  email?: string;
  sourceUrl?: string;
}> {
  const key = process.env.EXA_API_KEY?.trim();
  if (!key) return {};
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        query: `"${name}" ${company}`,
        numResults: 5,
        type: "auto",
        contents: {
          text: { maxCharacters: 800 },
          highlights: { numSentences: 2 },
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      results?: Array<{
        url?: string;
        title?: string;
        text?: string;
        highlights?: unknown;
      }>;
    };
    const found: {
      linkedin?: string;
      x?: string;
      github?: string;
      email?: string;
      sourceUrl?: string;
    } = {};
    for (const r of data.results ?? []) {
      const url = r.url ?? "";
      const host = bareHost(url);
      const snippet = [
        r.text ?? "",
        Array.isArray(r.highlights) ? r.highlights.join(" ") : "",
        r.title ?? "",
      ].join(" ");
      if (
        !found.linkedin &&
        host === "linkedin.com" &&
        /\/in\//i.test(url)
      ) {
        found.linkedin = url;
        found.sourceUrl ??= url;
      }
      if (!found.x && (host === "x.com" || host === "twitter.com")) {
        found.x = url;
        found.sourceUrl ??= url;
      }
      if (!found.github && host === "github.com") {
        found.github = url;
        found.sourceUrl ??= url;
      }
      if (!found.email) {
        const email = extractEmails(snippet).find(isRealEmail);
        if (email) {
          found.email = email;
          found.sourceUrl ??= url;
        }
      }
    }
    return found;
  } catch {
    return {};
  }
}

// Find team/about pages from the homepage text, then fetch up to two of them.
async function discoverExtraPages(
  websiteText: string,
  websiteUrl: string
): Promise<{ pages: ResearchPage[]; failed: string[] }> {
  if (!websiteUrl) return { pages: [], failed: [] };
  const base = new URL(websiteUrl);
  const candidates: string[] = [];
  const hrefRe = /(?:href|src)=["']([^"']+)["']/gi;
  for (const m of websiteText.matchAll(hrefRe)) {
    const raw = m[1];
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    try {
      const abs = new URL(raw, base).href;
      if (abs.toLowerCase().split("?")[0].split("#")[0].match(
        new RegExp(`(${PAGE_HINTS.map((h) => h.replace("/", "\\/")).join("|")})$`)
      )) {
        candidates.push(abs);
      }
    } catch {
      // ignore malformed links
    }
  }
  const host = base.host;
  const direct = PAGE_HINTS.map((h) => new URL(h, base).href).filter(
    (u) => new URL(u).host === host
  );
  const unique = [
    ...new Set([...direct, ...candidates].filter((u) => new URL(u).host === host)),
  ];
  const pages: ResearchPage[] = [];
  const failed: string[] = [];
  for (const url of unique.slice(0, 4)) {
    if (pages.length >= 2) break;
    const res = await fetchPage(url);
    if (res.text) {
      const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
      pages.push({
        url,
        title: path,
        text: truncate(res.text, MAX_PAGE_CHARS),
      });
    } else {
      failed.push(url);
    }
  }
  return { pages, failed };
}

// Attach contact channels (LinkedIn / X / GitHub / email) to each person.
export async function enrichPeople(
  people: PersonContact[],
  companyName: string,
  pageTexts: string[]
): Promise<PersonContact[]> {
  const pageEmails = extractEmails(...pageTexts);
  const enriched: PersonContact[] = [];
  for (const person of people.slice(0, 5)) {
    const tokens = person.name.trim().split(/\s+/);
    const first = tokens[0]?.toLowerCase() ?? "";
    const last = tokens.length > 1 ? tokens[tokens.length - 1].toLowerCase() : "";
    let email = person.email;
    if (!email && (first || last)) {
      email = pageEmails.find((e) => {
        const local = e.split("@")[0].toLowerCase();
        return (first && local.includes(first)) || (last && last.length > 2 && local.includes(last));
      });
    }
    const found = await searchForContact(person.name, companyName);
    enriched.push({
      name: person.name.trim(),
      role: person.role,
      email: email || found.email || undefined,
      linkedin: person.linkedin || found.linkedin || undefined,
      x: person.x || found.x || undefined,
      github: person.github || found.github || undefined,
      sourceUrl: found.sourceUrl || person.sourceUrl,
    });
  }
  return enriched;
}

export interface ResearchOutcome {
  material: ResearchMaterial;
  steps: ResearchStep[];
}

// Full research pass: fetch the website + job post, search for context, and
// assemble everything the dossier prompt will read. Never throws on a single
// source failure — partial material is still useful, and the steps tell the
// user exactly what worked and what didn't.
export async function runCompanyResearch(opts: {
  name: string;
  url: string;
  jobUrl: string;
  notes: string;
}): Promise<ResearchOutcome> {
  const websiteUrl = normalizeUrl(opts.url);
  const jobUrl = normalizeUrl(opts.jobUrl);
  const steps: ResearchStep[] = [];
  const sources: ResearchSource[] = [];

  const [website, job] = await Promise.all([
    websiteUrl
      ? fetchPage(websiteUrl)
      : Promise.resolve({ text: "", error: "skipped" }),
    jobUrl ? fetchPage(jobUrl) : Promise.resolve({ text: "", error: "skipped" }),
  ]);

  if (websiteUrl) {
    steps.push({
      key: "website",
      label: `Fetched website (${hostFromUrl(websiteUrl)})`,
      status: website.error ? "error" : "ok",
      detail: website.error || `${website.text.length.toLocaleString()} chars`,
    });
    sources.push({
      url: websiteUrl,
      title: `Website — ${hostFromUrl(websiteUrl)}`,
      kind: "website",
      status: website.error ? "error" : "ok",
      detail: website.error,
      excerpt: website.error ? undefined : website.text.slice(0, 280),
    });
  }

  if (jobUrl) {
    steps.push({
      key: "job",
      label: `Fetched job post (${hostFromUrl(jobUrl)})`,
      status: job.error ? "error" : "ok",
      detail: job.error || `${job.text.length.toLocaleString()} chars`,
    });
    sources.push({
      url: jobUrl,
      title: `Job post — ${hostFromUrl(jobUrl)}`,
      kind: "job",
      status: job.error ? "error" : "ok",
      detail: job.error,
      excerpt: job.error ? undefined : job.text.slice(0, 280),
    });
  }

  const host = hostFromUrl(websiteUrl || jobUrl || opts.name || "company");
  const companyName = opts.name.trim() || host;
  const query = `What does ${companyName} do? Company overview, product, team, funding, customers, and recent news.`;
  const search = await searchExa(query);
  const extra = await discoverExtraPages(website.text, websiteUrl);

  if (search.error === "skipped") {
    steps.push({
      key: "search",
      label: "Web search skipped (no EXA_API_KEY)",
      status: "skipped",
    });
  } else if (search.error) {
    steps.push({
      key: "search",
      label: "Web search failed",
      status: "error",
      detail: search.error,
    });
  } else {
    steps.push({
      key: "search",
      label: `Found ${search.results.length} sources on the web`,
      status: search.results.length ? "ok" : "error",
      detail: search.results.length
        ? undefined
        : "No relevant results returned",
    });
    for (const r of search.results) {
      sources.push({
        url: r.url,
        title: r.title,
        kind: "search",
        status: "ok",
        excerpt: r.snippet.slice(0, 280),
      });
    }
  }

  if (extra.pages.length) {
    steps.push({
      key: "pages",
      label: `Fetched ${extra.pages.length} team/about page${extra.pages.length > 1 ? "s" : ""}`,
      status: "ok",
      detail: extra.pages.map((p) => p.url).join(", "),
    });
    for (const p of extra.pages) {
      sources.push({
        url: p.url,
        title: `Team page — ${hostFromUrl(p.url)}`,
        kind: "page",
        status: "ok",
        excerpt: p.text.slice(0, 280),
      });
    }
  } else if (extra.failed.length) {
    steps.push({
      key: "pages",
      label: "Team/about pages not found",
      status: "skipped",
      detail: "No team page discovered on the site",
    });
  }

  const material: ResearchMaterial = {
    companyName,
    websiteUrl,
    jobUrl,
    websiteText: website.text,
    jobText: job.text,
    searchResults: search.results,
    pages: extra.pages,
    people: [],
    observations: [],
    sources,
    generatedAt: Date.now(),
  };

  return { material, steps };
}
