import { CandidateProfile, MatchStartupResult, candidateKeywordPool, coerceCandidateProfile, keywordOverlap, normalizeScore, tokenize } from "../_shared/mvp1.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YCCompany {
  id: number;
  name: string;
  slug: string;
  website: string;
  all_locations: string;
  long_description: string;
  one_liner: string;
  team_size: number;
  industry: string;
  tags: string[];
  batch: string;
  status: string;
  launched_at: number;
  isHiring: boolean;
  small_logo_thumb_url?: string;
}

function parseList(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function coerceLegacyCandidate(input: Record<string, unknown>): CandidateProfile {
  const legacySkills = typeof input.skills === "string" ? parseList(input.skills) : [];
  const legacyRoles = typeof input.preferredRoles === "string" ? parseList(input.preferredRoles) : [];

  return coerceCandidateProfile({
    fullName: typeof input.fullName === "string" ? input.fullName : "",
    email: typeof input.email === "string" ? input.email : "",
    phone: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    skills: legacySkills,
    experienceYears: typeof input.experienceYears === "string" ? Number.parseInt(input.experienceYears, 10) : 0,
    education: typeof input.education === "string" ? input.education : "",
    preferredRoles: legacyRoles,
    summary: typeof input.bio === "string" ? input.bio : "",
  });
}

function scoreCompany(company: YCCompany, profile: CandidateProfile): MatchStartupResult {
  const companyText = `${company.name} ${company.one_liner} ${company.long_description} ${company.industry} ${(company.tags || []).join(" ")}`;
  const companyTokens = new Set(tokenize(companyText));
  const roleTokens = profile.preferredRoles.flatMap((role) => tokenize(role));
  const keywordTokens = candidateKeywordPool(profile);
  const skillTokens = profile.skills.flatMap((skill) => tokenize(skill));

  let rawScore = 22;
  rawScore += keywordOverlap(companyTokens, roleTokens) * 16;
  rawScore += Math.min(keywordOverlap(companyTokens, skillTokens) * 8, 24);
  rawScore += Math.min(keywordOverlap(companyTokens, keywordTokens) * 4, 24);
  rawScore += company.isHiring ? 8 : 0;

  const fitReasons: string[] = [];
  if (profile.preferredRoles.length > 0) {
    fitReasons.push(`Strong overlap with ${profile.preferredRoles[0]} roles.`);
  }
  if (profile.skills.length > 0) {
    fitReasons.push(`Relevant overlap with ${profile.skills.slice(0, 3).join(", ")}.`);
  }
  if (company.industry || company.tags?.length) {
    fitReasons.push(`Company focus aligns with your portfolio summary and skills.`);
  }

  return {
    targetType: "startup",
    id: company.id?.toString() || company.slug,
    name: company.name,
    description: company.one_liner || company.long_description || "",
    website: company.website || `https://www.ycombinator.com/companies/${company.slug}`,
    batch: company.batch,
    tags: company.tags || [],
    matchScore: normalizeScore(rawScore),
    fitReasons: fitReasons.slice(0, 3),
  };
}

async function fetchCompanies(): Promise<YCCompany[]> {
  const urls = [
    "https://yc-oss.github.io/api/companies/hiring.json",
    "https://yc-oss.github.io/api/companies/all.json",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; ScoutBot/1.0)",
        },
      });

      if (!response.ok) {
        continue;
      }

      const companies = (await response.json()) as YCCompany[];
      if (Array.isArray(companies) && companies.length > 0) {
        return companies;
      }
    } catch (error) {
      console.error("Startup source fetch failed:", url, error);
    }
  }

  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const candidateProfile = payload.candidateProfile
      ? coerceCandidateProfile(payload.candidateProfile)
      : coerceLegacyCandidate(payload.candidate || {});
    const limit = Math.max(1, Math.min(Number(payload.limit) || 8, 20));

    const companies = await fetchCompanies();
    if (companies.length === 0) {
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ranked = companies
      .filter((company) => company.status !== "Inactive")
      .map((company) => scoreCompany(company, candidateProfile))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return new Response(JSON.stringify({ data: ranked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in match-startups:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to match startups",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
