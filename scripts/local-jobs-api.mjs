import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cacheDir = path.join(rootDir, ".scout");
const cachePath = path.join(cacheDir, "jobs-cache.json");
const port = Number(process.env.SCOUT_JOBS_API_PORT || 8787);
const staleAfterMinutes = 360;

const defaultCache = {
  sources: [],
  jobs: [],
  sync: {
    status: "never",
    lastSyncedAt: null,
    lastCompletedAt: null,
    lastError: null,
  },
};

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function unslugify(input) {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripHtml(input) {
  if (!input) return null;
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function inferWorkplaceType(location) {
  const normalized = location.toLowerCase();
  if (normalized.includes("remote")) return "Remote";
  if (normalized.includes("hybrid")) return "Hybrid";
  if (location && location !== "Unknown") return "Onsite";
  return null;
}

function inferTags(title, department, description) {
  const text = `${title} ${department || ""}`.toLowerCase();
  const rules = [
    ["Engineering", /(software|engineer|developer|frontend|backend|full.?stack|infrastructure|platform|devops|sre|security)/],
    ["AI", /\b(ai|ml|machine learning|llm|data science|research scientist)\b/],
    ["Product", /(product manager|product designer|product)/],
    ["Design", /(designer|design|ux|ui)/],
    ["Sales", /(sales|account executive|business development)/],
    ["Marketing", /(marketing|growth|content)/],
    ["Operations", /(operations|business operations|strategy)/],
    ["Finance", /(finance|accounting|controller)/],
    ["Legal", /(legal|counsel|compliance)/],
    ["Recruiting", /(recruiter|talent|people)/],
    ["Internship", /(intern|internship|new grad|university)/],
  ];

  return rules.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

function normalizeCompanyName(input, url) {
  if (input.companyName?.trim()) return input.companyName.trim();
  const guessed = url.hostname.replace(/^www\./, "").split(".")[0] || input.sourceKey || "Unknown Company";
  return guessed
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function ensureCacheDir() {
  await mkdir(cacheDir, { recursive: true });
}

async function readCache() {
  await ensureCacheDir();
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    await writeCache(defaultCache);
    return structuredClone(defaultCache);
  }
}

async function writeCache(cache) {
  await ensureCacheDir();
  await writeFile(cachePath, JSON.stringify(cache, null, 2));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ScoutJobsBot/1.0",
    },
  });

  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

function parseDirectAtsUrl(input) {
  if (!input.careersUrl) return null;
  const url = new URL(input.careersUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const companyName = normalizeCompanyName(input, url);

  if (input.sourceType && input.sourceKey) {
    return { sourceType: input.sourceType, sourceKey: input.sourceKey, companyName, careersUrl: url.toString() };
  }

  if (url.hostname === "boards.greenhouse.io" || url.hostname === "job-boards.greenhouse.io") {
    const sourceKey = pathParts[0];
    if (sourceKey) return { sourceType: "greenhouse", sourceKey, companyName, careersUrl: url.toString() };
  }

  if (url.hostname === "jobs.lever.co") {
    const sourceKey = pathParts[0];
    if (sourceKey) return { sourceType: "lever", sourceKey, companyName, careersUrl: url.toString() };
  }

  if (url.hostname === "jobs.ashbyhq.com") {
    const sourceKey = pathParts[0];
    if (sourceKey) return { sourceType: "ashby", sourceKey, companyName, careersUrl: url.toString() };
  }

  return null;
}

function detectFromHtml(input, url, html) {
  const companyName = normalizeCompanyName(input, url);
  const patterns = [
    ["greenhouse", /boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-zA-Z0-9_-]+)/],
    ["greenhouse", /job-boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/],
    ["lever", /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/],
    ["lever", /api\.lever\.co\/v0\/postings\/([a-zA-Z0-9_-]+)/],
    ["ashby", /jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/],
    ["ashby", /posting-api\/job-board\/([a-zA-Z0-9_-]+)/],
  ];

  for (const [sourceType, pattern] of patterns) {
    const sourceKey = html.match(pattern)?.[1];
    if (sourceKey) return { sourceType, sourceKey, companyName, careersUrl: url.toString() };
  }

  return null;
}

async function detectSource(input) {
  if (input.sourceType && input.sourceKey) {
    const careersUrl = input.careersUrl || `https://${input.sourceType}.local/${input.sourceKey}`;
    return {
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      companyName: input.companyName || input.sourceKey,
      careersUrl,
    };
  }

  const direct = parseDirectAtsUrl(input);
  if (direct) return direct;

  if (!input.careersUrl) throw new Error("Source needs careersUrl or sourceType + sourceKey");

  const url = new URL(input.careersUrl);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "ScoutJobsBot/1.0",
    },
  });

  if (!response.ok) throw new Error(`Failed to inspect ${url.toString()}: ${response.status}`);

  const detected = detectFromHtml(input, url, await response.text());
  if (!detected) throw new Error(`No supported ATS detected for ${url.toString()}`);
  return detected;
}

function buildJobId(source, externalId) {
  return `${source.sourceType}:${source.sourceKey}:${externalId}`;
}

async function fetchGreenhouseJobs(source, seenAt) {
  const payload = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.sourceKey)}/jobs?content=true`,
  );

  return (payload.jobs || [])
    .filter((job) => job.id && job.title && job.absolute_url)
    .map((job) => {
      const department = job.departments?.[0]?.name || null;
      const location = job.location?.name || job.offices?.[0]?.location || job.offices?.[0]?.name || "Unknown";
      const descriptionText = stripHtml(job.content);

      return {
        id: buildJobId(source, String(job.id)),
        sourceType: source.sourceType,
        externalId: String(job.id),
        title: job.title,
        jobType: "Role",
        location,
        roleType: department || "General",
        companyName: source.companyName,
        companySlug: slugify(source.companyName),
        companyBatch: "",
        companyOneLiner: descriptionText?.slice(0, 180) || "",
        companyLogoUrl: null,
        companyLastActiveAt: null,
        applyUrl: job.absolute_url,
        jobUrl: job.absolute_url,
        salaryText: null,
        workplaceType: inferWorkplaceType(location),
        tags: inferTags(job.title, department, descriptionText),
        lastSeenAt: seenAt,
      };
    });
}

async function fetchLeverJobs(source, seenAt) {
  const jobs = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(source.sourceKey)}?mode=json`);

  return jobs
    .filter((job) => job.id && job.text && (job.hostedUrl || job.applyUrl))
    .map((job) => {
      const department = job.categories?.team || job.categories?.department || null;
      const location = job.categories?.location || "Unknown";
      const descriptionText = job.descriptionPlain || stripHtml(job.description);

      return {
        id: buildJobId(source, job.id),
        sourceType: source.sourceType,
        externalId: job.id,
        title: job.text,
        jobType: job.categories?.commitment || "Role",
        location,
        roleType: department || "General",
        companyName: source.companyName,
        companySlug: slugify(source.companyName),
        companyBatch: "",
        companyOneLiner: descriptionText?.slice(0, 180) || "",
        companyLogoUrl: null,
        companyLastActiveAt: null,
        applyUrl: job.applyUrl || job.hostedUrl,
        jobUrl: job.hostedUrl || job.applyUrl,
        salaryText: null,
        workplaceType: inferWorkplaceType(location),
        tags: inferTags(job.text, department, descriptionText),
        lastSeenAt: seenAt,
      };
    });
}

async function fetchAshbyJobs(source, seenAt) {
  const payload = await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.sourceKey)}?includeCompensation=true`,
  );

  return (payload.jobs || [])
    .filter((job) => job.isListed !== false && job.title && (job.jobUrl || job.applyUrl))
    .map((job) => {
      const externalId = job.id || job.jobUrl || `${job.title}-${job.location || "unknown"}`;
      const department = job.department || job.team || null;
      const location = job.location || "Unknown";
      const descriptionText = job.descriptionPlain || stripHtml(job.descriptionHtml);
      const salaryText =
        job.compensation?.scrapeableCompensationSalarySummary ||
        job.compensation?.compensationTierSummary ||
        null;

      return {
        id: buildJobId(source, externalId),
        sourceType: source.sourceType,
        externalId,
        title: job.title,
        jobType: job.employmentType || "Role",
        location,
        roleType: department || "General",
        companyName: source.companyName,
        companySlug: slugify(source.companyName),
        companyBatch: "",
        companyOneLiner: descriptionText?.slice(0, 180) || "",
        companyLogoUrl: null,
        companyLastActiveAt: null,
        applyUrl: job.applyUrl || job.jobUrl,
        jobUrl: job.jobUrl || job.applyUrl,
        salaryText,
        workplaceType: inferWorkplaceType(location),
        tags: inferTags(job.title, department, descriptionText),
        lastSeenAt: seenAt,
      };
    });
}

async function fetchJobsForSource(source, seenAt) {
  if (source.sourceType === "greenhouse") return fetchGreenhouseJobs(source, seenAt);
  if (source.sourceType === "lever") return fetchLeverJobs(source, seenAt);
  if (source.sourceType === "ashby") return fetchAshbyJobs(source, seenAt);
  throw new Error(`Unsupported source type: ${source.sourceType}`);
}

function roleLinksFor(jobs) {
  const counts = new Map();
  for (const job of jobs) {
    for (const tag of job.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }

  return [
    { label: "All", slug: "all", path: "/jobs", count: jobs.length },
    ...Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([label, count]) => ({ label, slug: slugify(label), path: `/jobs?category=${slugify(label)}`, count })),
  ];
}

function categoryMatches(job, category) {
  if (!category || category === "all") return true;
  const label = unslugify(category);
  return (job.tags || []).some((tag) => tag.toLowerCase() === label.toLowerCase());
}

async function handleFetchJobs(url, response) {
  const cache = await readCache();
  const category = url.searchParams.get("category") || "all";
  const offset = Number(url.searchParams.get("offset") || 0);
  const limit = Number(url.searchParams.get("limit") || 30);
  const filteredJobs = cache.jobs.filter((job) => categoryMatches(job, category));
  const jobs = filteredJobs.slice(offset, offset + limit);
  const lastSyncedAt = cache.sync.lastSyncedAt;
  const isStale = lastSyncedAt
    ? Date.now() - Date.parse(lastSyncedAt) > staleAfterMinutes * 60 * 1000
    : false;

  sendJson(response, 200, {
    success: true,
    title: "Startup roles",
    metaDescription: "Local startup jobs aggregated from imported ATS sources.",
    category,
    jobs,
    offset,
    limit,
    total: filteredJobs.length,
    hasMore: offset + jobs.length < filteredJobs.length,
    roleLinks: roleLinksFor(cache.jobs),
    sourceUrl: "local",
    lastSyncedAt,
    lastCompletedAt: cache.sync.lastCompletedAt,
    syncStatus: cache.sync.status,
    syncError: cache.sync.lastError,
    isStale,
    needsSync: cache.sources.length === 0 || cache.jobs.length === 0,
    staleAfterMinutes,
  });
}

async function handleImportSources(request, response) {
  const body = await readJsonBody(request);
  const sources = Array.isArray(body.sources) ? body.sources : [];
  if (!sources.length) throw new Error("sources must be a non-empty array");

  const cache = await readCache();
  const imported = [];
  const failed = [];

  for (const input of sources) {
    try {
      const source = await detectSource(input);
      const id = `${source.sourceType}:${source.sourceKey}`;
      const nextSource = {
        ...source,
        id,
        isActive: true,
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastJobCount: 0,
      };
      const existingIndex = cache.sources.findIndex((item) => item.id === id);
      if (existingIndex >= 0) cache.sources[existingIndex] = nextSource;
      else cache.sources.push(nextSource);
      imported.push(nextSource);
    } catch (error) {
      failed.push({ input, error: error instanceof Error ? error.message : "Failed to import source" });
    }
  }

  await writeCache(cache);
  sendJson(response, imported.length ? 200 : 400, {
    success: imported.length > 0,
    importedCount: imported.length,
    failedCount: failed.length,
    imported,
    failed,
  });
}

async function handleSyncJobs(response) {
  const cache = await readCache();
  const seenAt = new Date().toISOString();
  cache.sync.status = "running";
  cache.sync.lastError = null;
  await writeCache(cache);

  const fetchedJobs = [];
  const sourceResults = [];

  for (const source of cache.sources.filter((item) => item.isActive)) {
    try {
      const jobs = await fetchJobsForSource(source, seenAt);
      fetchedJobs.push(...jobs);
      source.lastAttemptAt = seenAt;
      source.lastSuccessAt = seenAt;
      source.lastError = null;
      source.lastJobCount = jobs.length;
      sourceResults.push({ companyName: source.companyName, sourceType: source.sourceType, jobCount: jobs.length, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch source";
      source.lastAttemptAt = seenAt;
      source.lastError = message;
      source.lastJobCount = 0;
      sourceResults.push({ companyName: source.companyName, sourceType: source.sourceType, jobCount: 0, error: message });
    }
  }

  const byId = new Map(cache.jobs.map((job) => [job.id, job]));
  for (const job of fetchedJobs) byId.set(job.id, job);

  cache.jobs = Array.from(byId.values()).filter((job) => job.lastSeenAt === seenAt);
  cache.sync.status = "idle";
  cache.sync.lastSyncedAt = seenAt;
  cache.sync.lastCompletedAt = new Date().toISOString();
  cache.sync.lastError = sourceResults.some((result) => result.error)
    ? `${sourceResults.filter((result) => result.error).length} sources failed`
    : null;

  await writeCache(cache);
  sendJson(response, 200, {
    success: true,
    skipped: false,
    syncedAt: cache.sync.lastCompletedAt,
    fetchedJobs: fetchedJobs.length,
    totalActiveJobs: cache.jobs.length,
    successfulSources: sourceResults.filter((result) => !result.error).length,
    failedSources: sourceResults.filter((result) => result.error).length,
    sourceResults,
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});

  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/jobs") return await handleFetchJobs(url, response);
    if (request.method === "POST" && url.pathname === "/api/job-sources/import") return await handleImportSources(request, response);
    if (request.method === "POST" && url.pathname === "/api/jobs/sync") return await handleSyncJobs(response);

    sendJson(response, 404, { success: false, error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      success: false,
      error: error instanceof Error ? error.message : "Local jobs API failed",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Scout local jobs API listening on http://localhost:${port}`);
  console.log(`Cache: ${cachePath}`);
});
