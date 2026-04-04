import { useInfiniteQuery, useMutation } from "@tanstack/react-query";

export interface YCJob {
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
}

export interface YCJobRoleLink {
  label: string;
  path: string;
  slug: string;
}

export interface YCJobsResponse {
  success: boolean;
  title: string;
  metaDescription: string;
  category: string;
  jobs: YCJob[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  roleLinks: YCJobRoleLink[];
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

interface YCJobsSyncResponse {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  syncedAt?: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 8000;
const SYNC_TIMEOUT_MS = 65000;
const PAGE_SIZE = 30;
export const DEFAULT_YC_JOB_CATEGORY = "software-engineer";

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

async function fetchYCJobs(category: string, offset: number): Promise<YCJobsResponse> {
  const queryParams = new URLSearchParams({
    category,
    offset: offset.toString(),
    limit: PAGE_SIZE.toString(),
  });

  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-yc-jobs?${queryParams.toString()}`,
    {
      method: "GET",
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch YC jobs: ${response.status}`);
  }

  const result = (await response.json()) as YCJobsResponse;
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch YC jobs");
  }

  return result;
}

async function syncYCJobs(force: boolean): Promise<YCJobsSyncResponse> {
  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-yc-jobs`,
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

  const result = (await response.json()) as YCJobsSyncResponse;

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to refresh YC jobs");
  }

  return result;
}

export function useInfiniteYCJobs(category: string = DEFAULT_YC_JOB_CATEGORY) {
  return useInfiniteQuery({
    queryKey: ["yc-jobs", category],
    queryFn: ({ pageParam = 0 }) => fetchYCJobs(category, pageParam as number),
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

export function useYCJobsSync() {
  return useMutation({
    mutationFn: ({ force = true }: { force?: boolean } = {}) => syncYCJobs(force),
  });
}

export function flattenJobs(pages: YCJobsResponse[] | undefined): YCJob[] {
  if (!pages) return [];

  const dedupedJobs: YCJob[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const job of page.jobs) {
      if (seen.has(job.id)) {
        continue;
      }

      seen.add(job.id);
      dedupedJobs.push(job);
    }
  }

  return dedupedJobs;
}
