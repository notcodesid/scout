import { useQuery } from "@tanstack/react-query";
import { Startup } from "@/components/StartupCard";

export interface YCStartup extends Startup {
  longDescription?: string;
  industry?: string;
  isHiring?: boolean;
  logoUrl?: string;
}

interface FetchYCStartupsParams {
  category?: "hiring" | "all" | "top" | "nonprofit";
  limit?: number;
  industry?: string;
  search?: string;
}

interface YCStartupsResponse {
  success: boolean;
  data: YCStartup[];
  total: number;
  filtered: number;
  error?: string;
}

async function fetchYCStartups(params: FetchYCStartupsParams = {}): Promise<YCStartupsResponse> {
  const { category = "hiring", limit = 200, industry, search } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("category", category);
  queryParams.set("limit", limit.toString());
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

// Export a simple hook for the main startup list
export function useStartups(category: "hiring" | "all" | "top" = "hiring") {
  return useYCStartups({ category, limit: 200 });
}
