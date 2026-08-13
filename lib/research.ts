import { hostFromUrl } from "./utils";
import type {
  ResearchMaterial,
  ResearchSearchResult,
  ResearchSource,
  ResearchStep,
} from "./types";

const JINA_READER = "https://r.jina.ai/";
const MAX_PAGE_CHARS = 18000;
const MAX_RESULT_CHARS = 1500;
const SEARCH_RESULTS = 6;

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

  const material: ResearchMaterial = {
    companyName,
    websiteUrl,
    jobUrl,
    websiteText: website.text,
    jobText: job.text,
    searchResults: search.results,
    sources,
    generatedAt: Date.now(),
  };

  return { material, steps };
}
