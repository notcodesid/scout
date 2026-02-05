import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Startup } from "@/components/StartupCard";

export interface YCStartup extends Startup {
  longDescription?: string;
  industry?: string;
  subindustry?: string;
  isHiring?: boolean;
  logoUrl?: string;
  ycUrl?: string;
  regions?: string[];
  industries?: string[];
  stage?: string;
  isTopCompany?: boolean;
  status?: string;
}

interface FetchYCStartupsParams {
  category?: "hiring" | "all" | "top" | "nonprofit";
  limit?: number;
  offset?: number;
  industry?: string;
  search?: string;
}

interface YCStartupsResponse {
  success: boolean;
  data: YCStartup[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  error?: string;
}

async function fetchYCStartups(params: FetchYCStartupsParams = {}): Promise<YCStartupsResponse> {
  const { category = "hiring", limit = 50, offset = 0, industry, search } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("category", category);
  queryParams.set("limit", limit.toString());
  queryParams.set("offset", offset.toString());
  if (industry && industry !== "all") {
    queryParams.set("industry", industry);
  }
  if (search) {
    queryParams.set("search", search);
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-yc-startups?${queryParams.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch startups: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch startups");
  }

  return result;
}

export function useYCStartups(params: FetchYCStartupsParams = {}) {
  return useQuery({
    queryKey: ["yc-startups", params],
    queryFn: () => fetchYCStartups(params),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

// Infinite query hook for paginated loading
export function useInfiniteStartups(
  params: Omit<FetchYCStartupsParams, "limit" | "offset"> = {},
  pageSize: number = 18
) {
  return useInfiniteQuery({
    queryKey: ["yc-startups-infinite", params, pageSize],
    queryFn: ({ pageParam = 0 }) =>
      fetchYCStartups({ ...params, limit: pageSize, offset: pageParam as number }),
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

// Helper to flatten paginated results
export function flattenStartups(pages: YCStartupsResponse[] | undefined): YCStartup[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}
