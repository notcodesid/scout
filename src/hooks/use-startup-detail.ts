import { useQuery } from "@tanstack/react-query";
import { YCStartup } from "./use-yc-startups";
import { getRelatedStartups, startups as seededStartups, type StartupFull } from "@/data/startups";

interface StartupDetailResponse {
  success: boolean;
  data: YCStartup;
  related: YCStartup[];
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
    logoUrl: startup.logoUrl,
    ycUrl: undefined,
    regions: [],
    industries: startup.industry ? [startup.industry] : [],
    stage: undefined,
    isTopCompany: false,
    status: "active",
    founders: startup.founders,
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

async function fetchViaSupabase(id: string): Promise<StartupDetailResponse> {
  const response = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-startup-detail?id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Startup not found");
    }
    throw new Error(`Failed to fetch startup: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch startup");
  }

  return result;
}

async function fetchDirectFromYC(id: string): Promise<StartupDetailResponse> {
  const response = await fetchWithTimeout(
    "https://yc-oss.github.io/api/companies/all.json",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch YC startup detail directly: ${response.status}`);
  }

  const companies = (await response.json()) as YCCompanyApi[];
  const company = companies.find((item) => item.id.toString() === id);

  if (!company) {
    throw new Error("Startup not found");
  }

  const related = companies
    .filter((item) => item.id !== company.id)
    .filter(
      (item) =>
        item.industry === company.industry ||
        item.tags?.some((tag) => company.tags?.includes(tag)),
    )
    .slice(0, 3)
    .map(transformCompany);

  return {
    success: true,
    data: transformCompany(company),
    related,
  };
}

function fetchFromSeeded(id: string): StartupDetailResponse {
  const startup = seededStartups.find((item) => item.id === id);

  if (!startup) {
    throw new Error("Startup not found");
  }

  return {
    success: true,
    data: transformSeededStartup(startup),
    related: getRelatedStartups(startup, seededStartups).map(transformSeededStartup),
  };
}

async function fetchStartupDetail(id: string): Promise<StartupDetailResponse> {
  try {
    return await fetchViaSupabase(id);
  } catch (error) {
    console.warn("Falling back to direct YC startup detail", error);
    try {
      return await fetchDirectFromYC(id);
    } catch (directError) {
      console.warn("Falling back to seeded startup detail", directError);
      return fetchFromSeeded(id);
    }
  }
}

export function useStartupDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["startup-detail", id],
    queryFn: () => fetchStartupDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}
