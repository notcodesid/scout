export interface Job {
  id: string;
  source: string;
  sourceLabel: string;
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
  lastSeenAt: string;
  syncedAt: string;
}

export interface JobSource {
  slug: string;
  label: string;
  base_url: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  syncStatus: string;
  lastSyncedAt: string | null;
  totalActiveJobs: number;
  lastError: string | null;
}

export interface JobsResponse {
  success: boolean;
  jobs: Job[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  source: string;
  sources: JobSource[];
  lastSyncedAt: string | null;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 15000;
const SYNC_TIMEOUT_MS = 120000;

function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => window.clearTimeout(timeoutId));
}

async function fetchJobs(
  source?: string,
  offset = 0,
  limit = 20,
  sources?: string[],
  remote?: string,
  search?: string,
): Promise<JobsResponse> {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
  });

  if (source) params.set("source", source);
  if (sources && sources.length > 0) params.set("sources", sources.join(","));
  if (remote && remote !== "all") params.set("remote", remote);
  if (search) params.set("search", search);

  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_API_URL}/api/jobs?${params.toString()}`,
    { method: "GET" },
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

async function syncAllJobs(force: boolean, targets?: string[]): Promise<SyncResponse> {
  const params = new URLSearchParams({ force: force.toString() });
  if (targets && targets.length > 0) params.set("targets", targets.join(","));

  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all?${params.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    },
    SYNC_TIMEOUT_MS,
  );

  const result = (await response.json()) as SyncResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to sync jobs");
  }

  return result;
}

export function useJobs(options: {
  source?: string;
  sources?: string[];
  remote?: string;
  search?: string;
  limit?: number;
} = {}) {
  const { source, sources, remote, search, limit = 20 } = options;

  return {
    queryKey: ["jobs", source || sources?.join(","), remote, search],
    queryFn: ({ pageParam = 0 }: { pageParam?: number }) =>
      fetchJobs(source, pageParam, limit, sources, remote, search),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  };
}

export function useAllJobs(options: { sources?: string[]; remote?: string; search?: string; limit?: number } = {}) {
  const { sources, remote, search, limit = 20 } = options;
  return useJobs({ sources, remote, search, limit });
}

export function useSyncAllJobs() {
  return {
    mutationFn: ({ force = true, targets }: { force?: boolean; targets?: string[] } = {}) =>
      syncAllJobs(force, targets),
  };
}
