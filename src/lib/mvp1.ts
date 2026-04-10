import { Json } from "@/integrations/supabase/types";

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

export interface JobMatch {
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

export interface GeneratedEmail {
  id?: string;
  targetType: "job";
  targetId: string;
  companyName: string;
  subject: string;
  subjectOptions: string[];
  fitSummary: string;
  body: string;
  targetMetadata: Record<string, unknown>;
}

export interface ApplyFlowDraft {
  step: number;
  submissionId: string | null;
  sourceUrl: string | null;
  sourceLabel: string | null;
  profile: CandidateProfile | null;
  selectedJobIds: string[];
  jobMatches: JobMatch[];
  generatedEmails: GeneratedEmail[];
}

export function defaultCandidateProfile(): CandidateProfile {
  return {
    fullName: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    skills: [],
    experienceYears: 0,
    education: "",
    preferredRoles: [],
    summary: "",
  };
}

export function profileToSubmissionPayload(profile: CandidateProfile) {
  return {
    full_name: profile.fullName,
    email: profile.email,
    phone: profile.phone || null,
    linkedin_url: profile.linkedinUrl || null,
    github_url: profile.githubUrl || null,
    portfolio_url: profile.portfolioUrl || null,
    skills: profile.skills,
    experience_years: profile.experienceYears,
    education: profile.education || null,
    preferred_roles: profile.preferredRoles,
    bio: profile.summary || null,
    extracted_profile: profile as unknown as Json,
  };
}
