const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateInput {
  fullName?: string;
  email?: string;
  skills?: string;
  experienceYears?: string;
  education?: string;
  preferredRoles?: string;
  bio?: string;
  inputMethod?: "resume" | "manual";
  resume?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  } | null;
}

interface CandidateProfile {
  skills: string[];
  preferredRoles: string[];
  keywords: string[];
  experienceYears: number;
  experienceLevel: "entry" | "mid" | "senior";
  summary: string;
}

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
  top_company?: boolean;
}

interface RankedCompany {
  company: YCCompany;
  score: number;
  reason: string;
  emailAngle: string;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "you",
  "your",
]);

function parseList(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function tokenize(input: string): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function unique(input: string[]): string[] {
  return Array.from(new Set(input));
}

function inferRolesFromSkills(skills: string[]): string[] {
  const skillText = skills.join(" ").toLowerCase();
  const roles = new Set<string>();

  if (/(react|next|vue|angular|css|ui|frontend)/.test(skillText)) {
    roles.add("frontend engineer");
  }
  if (/(node|api|backend|golang|java|python|database|postgres|redis)/.test(skillText)) {
    roles.add("backend engineer");
  }
  if (/(fullstack|full stack)/.test(skillText)) {
    roles.add("full stack engineer");
  }
  if (/(ml|machine learning|llm|ai|data science|nlp)/.test(skillText)) {
    roles.add("ml engineer");
  }
  if (/(devops|aws|kubernetes|docker|infra|terraform|sre)/.test(skillText)) {
    roles.add("devops engineer");
  }
  if (roles.size === 0) {
    roles.add("software engineer");
  }

  return Array.from(roles);
}

function buildCandidateProfile(candidate: CandidateInput): CandidateProfile {
  const skills = parseList(candidate.skills);
  const preferredRoles = parseList(candidate.preferredRoles);
  const inferredRoles = preferredRoles.length > 0 ? preferredRoles : inferRolesFromSkills(skills);
  const experienceYears = Number.parseInt(candidate.experienceYears || "0", 10) || 0;

  const keywordPool = [
    ...skills,
    ...inferredRoles,
    ...(candidate.education ? tokenize(candidate.education) : []),
    ...(candidate.bio ? tokenize(candidate.bio) : []),
    ...(candidate.resume?.fileName ? tokenize(candidate.resume.fileName) : []),
  ];

  const keywords = unique(keywordPool.map((word) => word.toLowerCase())).slice(0, 60);

  let experienceLevel: CandidateProfile["experienceLevel"] = "entry";
  if (experienceYears >= 5) {
    experienceLevel = "senior";
  } else if (experienceYears >= 2) {
    experienceLevel = "mid";
  }

  const summaryParts = [
    inferredRoles.length ? `Roles: ${inferredRoles.join(", ")}` : "",
    skills.length ? `Skills: ${skills.join(", ")}` : "",
    experienceYears ? `Experience: ${experienceYears} years` : "",
    candidate.inputMethod === "resume" ? "Input: resume upload" : "Input: manual form",
  ].filter(Boolean);

  return {
    skills,
    preferredRoles: inferredRoles,
    keywords,
    experienceYears,
    experienceLevel,
    summary: summaryParts.join(" | "),
  };
}

function keywordOverlapScore(companyTokens: Set<string>, profileTokens: string[]): number {
  let overlap = 0;
  for (const token of profileTokens) {
    if (companyTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap;
}

function experienceFitScore(teamSize: number, experienceLevel: CandidateProfile["experienceLevel"]): number {
  if (experienceLevel === "entry") {
    if (teamSize <= 50) return 8;
    if (teamSize <= 150) return 5;
    return 2;
  }
  if (experienceLevel === "mid") {
    if (teamSize >= 10 && teamSize <= 200) return 8;
    return 5;
  }
  if (teamSize >= 20) return 8;
  return 4;
}

function deterministicReason(profile: CandidateProfile, company: YCCompany, overlap: number): string {
  const roleHint = profile.preferredRoles[0] || "software engineer";
  if (overlap >= 4) {
    return `Strong keyword overlap for ${roleHint} with ${company.name}'s focus areas.`;
  }
  if ((company.tags || []).length > 0) {
    return `Good fit for ${roleHint} based on ${company.name}'s tags and industry focus.`;
  }
  return `Potential fit for ${roleHint} based on company description and hiring status.`;
}

function deterministicEmailAngle(profile: CandidateProfile, company: YCCompany): string {
  const primaryRole = profile.preferredRoles[0] || "engineer";
  const primarySkill = profile.skills[0] || "product engineering";
  return `Highlight ${primarySkill} experience and interest in ${company.name}'s ${primaryRole}-related work.`;
}

function scoreCompany(company: YCCompany, profile: CandidateProfile): RankedCompany {
  const companyText = [
    company.name,
    company.one_liner || "",
    company.long_description || "",
    company.industry || "",
    ...(company.tags || []),
  ].join(" ");

  const companyTokens = new Set(tokenize(companyText));
  const overlap = keywordOverlapScore(companyTokens, profile.keywords);

  let score = 25;
  score += Math.min(overlap * 6, 36);
  score += experienceFitScore(company.team_size || 0, profile.experienceLevel);

  const roleTokens = profile.preferredRoles.flatMap((role) => tokenize(role));
  if (keywordOverlapScore(companyTokens, roleTokens) > 0) {
    score += 12;
  }

  if (company.top_company) {
    score += 4;
  }
  if (company.isHiring) {
    score += 6;
  }

  return {
    company,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reason: deterministicReason(profile, company, overlap),
    emailAngle: deterministicEmailAngle(profile, company),
  };
}

function normalizeAiResponse(content: string): { results: Array<{ id: string; matchScore?: number; reason?: string; emailAngle?: string }> } | null {
  if (!content) return null;

  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function rerankWithAi(
  profile: CandidateProfile,
  ranked: RankedCompany[],
  limit: number,
): Promise<RankedCompany[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return ranked.slice(0, limit);
  }

  const candidates = ranked.slice(0, 40).map((item) => ({
    id: String(item.company.id),
    name: item.company.name,
    description: item.company.one_liner || item.company.long_description || "",
    industry: item.company.industry || "",
    tags: item.company.tags || [],
    batch: item.company.batch || "",
    location: item.company.all_locations || "",
    teamSize: item.company.team_size || 0,
    baselineScore: item.score,
  }));

  const prompt = `Rank the best startup matches for this candidate profile.
Return strict JSON only:
{
  "results": [
    { "id": "123", "matchScore": 88, "reason": "short reason", "emailAngle": "short angle" }
  ]
}
Rules:
- Return exactly ${limit} results.
- Use only IDs from the candidate list.
- Keep reason and emailAngle under 24 words each.

Candidate profile:
${JSON.stringify(profile, null, 2)}

Candidate startups:
${JSON.stringify(candidates, null, 2)}
`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a talent matching engine. Always return valid JSON only with no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return ranked.slice(0, limit);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = normalizeAiResponse(content);
  if (!parsed?.results || !Array.isArray(parsed.results)) {
    return ranked.slice(0, limit);
  }

  const rankedById = new Map(ranked.map((item) => [String(item.company.id), item]));
  const aiResults: RankedCompany[] = [];

  for (const result of parsed.results) {
    const original = rankedById.get(String(result.id));
    if (!original) continue;
    aiResults.push({
      ...original,
      score:
        typeof result.matchScore === "number"
          ? Math.max(0, Math.min(100, Math.round(result.matchScore)))
          : original.score,
      reason: result.reason || original.reason,
      emailAngle: result.emailAngle || original.emailAngle,
    });
  }

  if (aiResults.length === 0) {
    return ranked.slice(0, limit);
  }

  const selectedIds = new Set(aiResults.map((item) => String(item.company.id)));
  const fallback = ranked.filter((item) => !selectedIds.has(String(item.company.id)));
  return [...aiResults, ...fallback].slice(0, limit);
}

function extractYear(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.getFullYear().toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const limit = Math.min(Math.max(Number(body?.limit || 10), 5), 10);
    const candidate = (body?.candidate || {}) as CandidateInput;
    const profile = buildCandidateProfile(candidate);

    const response = await fetch("https://yc-oss.github.io/api/companies/hiring.json", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YC startups: ${response.status}`);
    }

    const companies = (await response.json()) as YCCompany[];
    const rankedDeterministic = companies
      .map((company) => scoreCompany(company, profile))
      .sort((a, b) => b.score - a.score);

    const ranked = await rerankWithAi(profile, rankedDeterministic, limit);

    const results = ranked.map((item) => ({
      id: String(item.company.id),
      name: item.company.name,
      description:
        item.company.one_liner || item.company.long_description?.slice(0, 220) || "",
      website: item.company.website || `https://www.ycombinator.com/companies/${item.company.slug}`,
      tags: item.company.tags || [],
      founded: extractYear(item.company.launched_at),
      teamSize: item.company.team_size || 0,
      location: item.company.all_locations || "Unknown",
      batch: item.company.batch || "",
      founders: [],
      matchScore: item.score,
      matchReason: item.reason,
      emailAngle: item.emailAngle,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        data: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in match-startups:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to match startups",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
