import { useQuery } from "@tanstack/react-query";
import { YCStartup } from "./use-yc-startups";

interface StartupDetailResponse {
  success: boolean;
  data: YCStartup;
  related: YCStartup[];
  error?: string;
}

async function fetchStartupDetail(id: string): Promise<StartupDetailResponse> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-startup-detail?id=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
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

export function useStartupDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["startup-detail", id],
    queryFn: () => fetchStartupDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}
