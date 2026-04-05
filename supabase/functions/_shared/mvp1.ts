export interface CandidateProfile {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  skills: string[];
  experienceYears: number;
  education: string;
  preferredRoles: string[];
  summary: string;
}

export interface MatchJobResult {
  targetType: "job";
  jobId: string;
  jobTitle: string;
  companyName: string;
  companySlug: string;
  companyBatch: string;
  companyOneLiner: string;
  location: string;
  roleType: string;
  jobType: string;
  jobUrl: string;
  applyUrl: string;
  matchScore: number;
  fitReasons: string[];
}

export interface MatchStartupResult {
  targetType: "startup";
  id: string;
  name: string;
  description: string;
  website: string;
  batch?: string;
  tags: string[];
  matchScore: number;
  fitReasons: string[];
}

export interface GeneratedEmailOutput {
  id?: string;
  targetType: "job" | "startup";
  startupId: string;
  startupName: string;
  subject: string;
  subjectOptions: string[];
  fitSummary: string;
  body: string;
  targetMetadata: Record<string, unknown>;
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
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "your",
]);

export function parseDelimitedList(input?: string | null): string[] {
  if (!input) return [];

  return input
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function tokenize(input: string): string[] {
  if (!input) return [];

  return input
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function inferRolesFromSkills(skills: string[]): string[] {
  const text = skills.join(" ").toLowerCase();
  const roles = new Set<string>();

  if (/(react|frontend|typescript|javascript|ui|css|html|next)/.test(text)) {
    roles.add("Frontend Engineer");
  }
  if (/(node|backend|api|python|java|golang|database|postgres|redis)/.test(text)) {
    roles.add("Backend Engineer");
  }
  if (/(fullstack|full stack)/.test(text)) {
    roles.add("Full Stack Engineer");
  }
  if (/(ml|machine learning|llm|ai|nlp|data)/.test(text)) {
    roles.add("ML Engineer");
  }
  if (/(mobile|ios|android|react native|swift|kotlin)/.test(text)) {
    roles.add("Mobile Engineer");
  }
  if (roles.size === 0) {
    roles.add("Software Engineer");
  }

  return Array.from(roles);
}

export function coerceCandidateProfile(input: Partial<CandidateProfile>): CandidateProfile {
  const skills = uniqueStrings(input.skills || []);
  const preferredRoles = uniqueStrings(
    (input.preferredRoles && input.preferredRoles.length > 0 ? input.preferredRoles : inferRolesFromSkills(skills))
      .map((role) => role.trim()),
  );

  return {
    fullName: input.fullName?.trim() || "",
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    linkedinUrl: input.linkedinUrl?.trim() || "",
    githubUrl: input.githubUrl?.trim() || "",
    portfolioUrl: input.portfolioUrl?.trim() || "",
    skills,
    experienceYears: Number.isFinite(input.experienceYears) ? Math.max(0, Number(input.experienceYears)) : 0,
    education: input.education?.trim() || "",
    preferredRoles,
    summary: input.summary?.trim() || "",
  };
}

export function candidateKeywordPool(profile: CandidateProfile): string[] {
  return uniqueStrings([
    ...profile.skills,
    ...profile.preferredRoles,
    ...tokenize(profile.summary),
    ...tokenize(profile.education),
  ]).slice(0, 80);
}

export function keywordOverlap(haystack: Set<string>, needles: string[]): number {
  let score = 0;

  for (const needle of needles) {
    if (haystack.has(needle)) {
      score += 1;
    }
  }

  return score;
}

export function normalizeScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
