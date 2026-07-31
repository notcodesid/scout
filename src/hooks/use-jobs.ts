import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

export interface JobListing {
  id: string;
  title: string;
  jobType: string;
  location: string;
  roleType: string;
  companyName: string;
  companySlug: string;
  companyBatch: string;
  companyOneLiner: string;
  companyLogoUrl: string | null;
  companyLastActiveAt: string | null;
  applyUrl: string;
  jobUrl: string;
  sourceType: "greenhouse" | "lever" | "ashby" | "yc";
  salaryText: string | null;
  workplaceType: string | null;
  tags: string[];
}

export interface JobRoleLink {
  label: string;
  path: string;
  slug: string;
  count?: number;
}

export interface JobsResponse {
  success: boolean;
  title: string;
  metaDescription: string;
  category: string;
  jobs: JobListing[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  roleLinks: JobRoleLink[];
  sourceUrl: string;
  lastSyncedAt: string | null;
  lastCompletedAt: string | null;
  syncStatus: "idle" | "running" | "error" | "never";
  syncError: string | null;
  isStale: boolean;
  needsSync: boolean;
  staleAfterMinutes: number;
  error?: string;
}

interface JobsSyncResponse {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  syncedAt?: string;
  fetchedJobs?: number;
  totalActiveJobs?: number;
  successfulSources?: number;
  failedSources?: number;
  error?: string;
}

const FETCH_TIMEOUT_MS = 10000;
const SYNC_TIMEOUT_MS = 65000;
const PAGE_SIZE = 30;
export const DEFAULT_JOB_CATEGORY = "all";
const JOBS_API_BASE_URL = import.meta.env.VITE_JOBS_API_BASE_URL || "/api";

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchJobs(category: string, offset: number): Promise<JobsResponse> {
  const queryParams = new URLSearchParams({
    category,
    offset: offset.toString(),
    limit: PAGE_SIZE.toString(),
  });

  const response = await fetchWithTimeout(
    `${JOBS_API_BASE_URL}/jobs?${queryParams.toString()}`,
    {
      method: "GET",
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status}`);
  }

  const result = (await response.json()) as JobsResponse;
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch jobs");
  }

  return result;
}

async function syncJobs(force: boolean): Promise<JobsSyncResponse> {
  const response = await fetchWithTimeout(
    `${JOBS_API_BASE_URL}/jobs/sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        force,
        reason: force ? "manual-refresh" : "cache-hydration",
      }),
    },
    SYNC_TIMEOUT_MS,
  );

  const result = (await response.json()) as JobsSyncResponse;

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to refresh jobs");
  }

  return result;
}

export function useInfiniteJobs(category: string = DEFAULT_JOB_CATEGORY) {
  return useInfiniteQuery({
    queryKey: ["jobs", category],
    queryFn: ({ pageParam = 0 }) => fetchJobs(category, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useJobsSync() {
  return useMutation({
    mutationFn: ({ force = true }: { force?: boolean } = {}) => syncJobs(force),
  });
}

export function flattenJobs(pages: JobsResponse[] | undefined): JobListing[] {
  if (!pages) return [];

  const dedupedJobs: JobListing[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const job of page.jobs) {
      if (seen.has(job.id)) continue;

      seen.add(job.id);
      dedupedJobs.push(job);
    }
  }

  return dedupedJobs;
}
