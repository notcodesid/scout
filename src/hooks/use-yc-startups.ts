import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Startup } from "@/components/StartupCard";
import { startups as seededStartups, type StartupFull } from "@/data/startups";

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

interface YCCompanyApi {
  id: number;
  name: string;
  slug: string;
  website: string;
  all_locations: string;
  long_description: string;
  one_liner: string;
  team_size: number;
  industry: string;
  subindustry?: string;
  tags: string[];
  batch: string;
  status: string;
  launched_at: number;
  isHiring: boolean;
  small_logo_thumb_url?: string;
  url?: string;
  regions?: string[];
  industries?: string[];
  stage?: string;
  top_company?: boolean;
}

const FETCH_TIMEOUT_MS = 4000;

function extractYear(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.getFullYear().toString();
}

function transformCompany(company: YCCompanyApi): YCStartup {
  return {
    id: company.id.toString(),
    name: company.name,
    description: company.one_liner || company.long_description?.substring(0, 200) || "",
    longDescription: company.long_description,
    website: company.website || `https://www.ycombinator.com/companies/${company.slug}`,
    tags: company.tags || [],
    founded: extractYear(company.launched_at),
    teamSize: company.team_size || 0,
    location: company.all_locations || "Unknown",
    batch: company.batch || "",
    industry: company.industry || "Technology",
    subindustry: company.subindustry,
    isHiring: company.isHiring || false,
    logoUrl: company.small_logo_thumb_url,
    ycUrl: company.url || `https://www.ycombinator.com/companies/${company.slug}`,
    regions: company.regions || [],
    industries: company.industries || [],
    stage: company.stage,
    isTopCompany: company.top_company || false,
    status: company.status,
    founders: [],
  };
}

function filterStartups(startups: YCStartup[], params: FetchYCStartupsParams): YCStartup[] {
  const { industry, search } = params;
  let filtered = startups;

  if (industry && industry !== "all") {
    const normalizedIndustry = industry.toLowerCase();
    filtered = filtered.filter(
      (startup) =>
        startup.industry?.toLowerCase().includes(normalizedIndustry) ||
        startup.tags.some((tag) => tag.toLowerCase().includes(normalizedIndustry)),
    );
  }

  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (startup) =>
        startup.name.toLowerCase().includes(query) ||
        startup.description.toLowerCase().includes(query) ||
        startup.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  return filtered;
}

function transformSeededStartup(startup: StartupFull): YCStartup {
  return {
    id: startup.id,
    name: startup.name,
    description: startup.description,
    longDescription: startup.longDescription,
    website: startup.website,
    tags: startup.tags,
    founded: startup.founded,
    teamSize: startup.teamSize,
    location: startup.location,
    batch: startup.batch,
    industry: startup.industry,
    isHiring: startup.isHiring ?? true,
    ycUrl: undefined,
    logoUrl: startup.logoUrl,
    regions: [],
    industries: startup.industry ? [startup.industry] : [],
    stage: undefined,
    isTopCompany: false,
    status: "active",
    founders: startup.founders,
  };
}

function createSeededResponse(params: FetchYCStartupsParams = {}): YCStartupsResponse {
  const { limit = 50, offset = 0 } = params;
  const filtered = filterStartups(seededStartups.map(transformSeededStartup), params);
  const paginatedStartups = filtered.slice(offset, offset + limit);

  return {
    success: true,
    data: paginatedStartups,
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + limit < filtered.length,
  };
}

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

async function fetchViaSupabase(params: FetchYCStartupsParams = {}): Promise<YCStartupsResponse> {
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

  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-yc-startups?${queryParams.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch startups: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch startups");
  }

  if (
    result.total === 0 &&
    offset === 0 &&
    category === "hiring" &&
    !industry &&
    !search
  ) {
    throw new Error("Supabase returned an empty startup feed");
  }

  return result;
}

async function fetchDirectFromYC(params: FetchYCStartupsParams = {}): Promise<YCStartupsResponse> {
  const { category = "hiring", limit = 50, offset = 0 } = params;
  const response = await fetchWithTimeout(
    `https://yc-oss.github.io/api/companies/${category}.json`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch YC startups directly: ${response.status}`);
  }

  const companies = (await response.json()) as YCCompanyApi[];
  const startups = filterStartups(companies.map(transformCompany), params);
  const paginatedStartups = startups.slice(offset, offset + limit);

  return {
    success: true,
    data: paginatedStartups,
    total: startups.length,
    offset,
    limit,
    hasMore: offset + limit < startups.length,
  };
}

async function fetchYCStartups(params: FetchYCStartupsParams = {}): Promise<YCStartupsResponse> {
  try {
    return await fetchViaSupabase(params);
  } catch (error) {
    console.warn("Falling back to direct YC startup feed", error);
    try {
      return await fetchDirectFromYC(params);
    } catch (directError) {
      console.warn("Falling back to seeded startup data", directError);
      return createSeededResponse(params);
    }
  }
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
