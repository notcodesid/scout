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
  one_liner: string;
  long_description: string;
  tags: string[];
  batch: string;
  status: string;
  isHiring: boolean;
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
  const companyText = `${company.name} ${company.one_liner} ${company.long_description} ${(company.tags || []).join(" ")}`;
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
  fitReasons.push(`Company description and tags align with your resume summary.`);

  return {
    targetType: "startup",
    id: company.slug || String(company.id),
    name: company.name,
    description: company.one_liner || company.long_description || "",
    website: company.website,
    batch: company.batch,
    tags: company.tags || [],
    matchScore: normalizeScore(rawScore),
    fitReasons: fitReasons.slice(0, 3),
  };
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

    const ycResponse = await fetch("https://www.ycombinator.com/api/companies");
    if (!ycResponse.ok) {
      throw new Error(`Failed to fetch YC companies: ${ycResponse.status}`);
    }

    const companies = (await ycResponse.json()) as YCCompany[];
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
