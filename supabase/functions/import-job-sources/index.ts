import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { PublicJobSourceType } from "../_shared/public-jobs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SourceInput {
  companyName?: string;
  careersUrl?: string;
  sourceType?: PublicJobSourceType;
  sourceKey?: string;
}

interface ImportRequestBody {
  sources?: SourceInput[];
}

interface DetectedSource {
  sourceType: PublicJobSourceType;
  sourceKey: string;
  companyName: string;
  careersUrl: string;
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeCompanyName(input: SourceInput, url: URL): string {
  if (input.companyName?.trim()) return input.companyName.trim();

  const hostParts = url.hostname.replace(/^www\./, "").split(".");
  const guessed = hostParts[0] || input.sourceKey || "Unknown Company";
  return guessed
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseDirectAtsUrl(input: SourceInput): DetectedSource | null {
  if (!input.careersUrl) return null;

  const url = new URL(input.careersUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const companyName = normalizeCompanyName(input, url);

  if (input.sourceType && input.sourceKey) {
    return {
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      companyName,
      careersUrl: url.toString(),
    };
  }

  if (
    url.hostname === "boards.greenhouse.io" ||
    url.hostname === "job-boards.greenhouse.io"
  ) {
    const sourceKey = pathParts[0];
    if (sourceKey) {
      return { sourceType: "greenhouse", sourceKey, companyName, careersUrl: url.toString() };
    }
  }

  if (url.hostname === "jobs.lever.co") {
    const sourceKey = pathParts[0];
    if (sourceKey) {
      return { sourceType: "lever", sourceKey, companyName, careersUrl: url.toString() };
    }
  }

  if (url.hostname === "jobs.ashbyhq.com") {
    const sourceKey = pathParts[0];
    if (sourceKey) {
      return { sourceType: "ashby", sourceKey, companyName, careersUrl: url.toString() };
    }
  }

  return null;
}

function detectFromHtml(input: SourceInput, url: URL, html: string): DetectedSource | null {
  const companyName = normalizeCompanyName(input, url);
  const patterns: Array<[PublicJobSourceType, RegExp]> = [
    ["greenhouse", /boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-zA-Z0-9_-]+)/],
    ["greenhouse", /job-boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/],
    ["lever", /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/],
    ["lever", /api\.lever\.co\/v0\/postings\/([a-zA-Z0-9_-]+)/],
    ["ashby", /jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/],
    ["ashby", /posting-api\/job-board\/([a-zA-Z0-9_-]+)/],
  ];

  for (const [sourceType, pattern] of patterns) {
    const match = html.match(pattern);
    const sourceKey = match?.[1];
    if (sourceKey) {
      return {
        sourceType,
        sourceKey,
        companyName,
        careersUrl: url.toString(),
      };
    }
  }

  return null;
}

async function detectSource(input: SourceInput): Promise<DetectedSource> {
  if (!input.careersUrl && (!input.sourceType || !input.sourceKey)) {
    throw new Error("Each source needs either careersUrl or sourceType + sourceKey");
  }

  if (input.sourceType && input.sourceKey) {
    const careersUrl = input.careersUrl || `https://${input.sourceType}.example/${input.sourceKey}`;
    const url = new URL(careersUrl);
    return {
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      companyName: normalizeCompanyName(input, url),
      careersUrl,
    };
  }

  const direct = parseDirectAtsUrl(input);
  if (direct) return direct;

  const url = new URL(input.careersUrl!);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "ScoutJobsBot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to inspect ${url.toString()}: ${response.status}`);
  }

  const html = await response.text();
  const detected = detectFromHtml(input, url, html);
  if (!detected) {
    throw new Error(`No supported ATS detected for ${url.toString()}`);
  }

  return detected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as ImportRequestBody;
    const sources = body.sources || [];

    if (!Array.isArray(sources) || sources.length === 0) {
      throw new Error("sources must be a non-empty array");
    }

    const supabase = createAdminClient();
    const imported = [];
    const failed = [];
    const now = new Date().toISOString();

    for (const input of sources) {
      try {
        const detected = await detectSource(input);
        const row = {
          source_type: detected.sourceType,
          company_name: detected.companyName,
          source_key: detected.sourceKey,
          careers_url: detected.careersUrl,
          is_active: true,
          metadata: {
            importedAt: now,
            importMode: input.sourceType && input.sourceKey ? "explicit" : "detected",
          },
          updated_at: now,
        };

        const { error } = await supabase
          .from("ats_job_sources")
          .upsert(row, { onConflict: "source_type,source_key" });

        if (error) throw error;
        imported.push(row);
      } catch (error) {
        failed.push({
          input,
          error: error instanceof Error ? error.message : "Failed to import source",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: failed.length < sources.length,
        importedCount: imported.length,
        failedCount: failed.length,
        imported,
        failed,
      }),
      {
        status: imported.length > 0 ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to import job sources",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
