export type Stage = "research" | "fit" | "proof" | "outreach" | "quality";

export const STAGE_ORDER: Stage[] = [
  "research",
  "fit",
  "proof",
  "outreach",
  "quality",
];

export const STAGE_LABELS: Record<Stage, string> = {
  research: "Research",
  fit: "Fit analysis",
  proof: "Proof task",
  outreach: "Outreach",
  quality: "Quality check",
};

export interface ProfileLink {
  label: string;
  url: string;
}

export interface ProfileSkill {
  id?: string;
  name: string;
  years: number;
}

export interface Project {
  id: string;
  name: string;
  problem: string;
  work: string;
  outcome: string;
  users: string;
  links: string[];
  tags: string[];
  startDate: string;
  endDate: string;
}

export interface ProfileEducation {
  id?: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface ProfileExperience {
  id?: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
  bullets: string[];
}

export interface EvidenceProfile {
  id?: string;
  name: string;
  headline: string;
  about: string;
  location: string;
  email: string;
  phone: string;
  timezone: string;
  githubUsername: string;
  availability: string;
  remote: boolean;
  openToRelocate: boolean;
  targetRoles: string[];
  links: ProfileLink[];
  skills: ProfileSkill[];
  projects: Project[];
  education: ProfileEducation[];
  experience: ProfileExperience[];
  updatedAt?: string;
}

export interface Dossier {
  companyName: string;
  oneLiner: string;
  problem: string;
  users: string;
  differentiation: string;
  team: string[];
  role: string;
  likelyNeeds: string[];
  competitors: string[];
  sources: string[];
  openQuestions: string[];
  verified: boolean;
}

export type Recommendation = "apply" | "wait" | "skip";

export interface FitAnalysis {
  strongMatches: string[];
  weakMatches: string[];
  missingProof: string[];
  recommendation: Recommendation;
  reasoning: string;
  genuineInterest: "" | "yes" | "no" | "unsure";
}

export type ProofTaskType = "build" | "distribution" | "research" | "other";
export type ProofEffort = "30 min" | "1-2 hrs" | "half day" | "a day";

export interface ProofTask {
  id: string;
  title: string;
  type: ProofTaskType;
  effort: ProofEffort;
  why: string;
  output: string;
  done: boolean;
  evidenceLink: string;
  notes: string;
}

export interface OutreachPack {
  email: string;
  linkedin: string;
  x: string;
  followUp: string;
  notes: string;
}

export type FlagSeverity = "critical" | "warning" | "info";

export interface QualityFlag {
  severity: FlagSeverity;
  label: string;
  detail: string;
}

export interface QualityReport {
  score: number;
  verdict: string;
  flags: QualityFlag[];
}

export interface Company {
  id: string;
  name: string;
  url: string;
  jobUrl: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  stage: Stage;
  contacts: string[];
  dossier?: Dossier;
  fit?: FitAnalysis;
  proofTasks: ProofTask[];
  outreach?: OutreachPack;
  quality?: QualityReport;
  research?: ResearchMaterial;
  followUpDate: string;
}

export type ResearchSourceKind = "website" | "job" | "search" | "page";

export interface ResearchSource {
  url: string;
  title: string;
  kind: ResearchSourceKind;
  status: "ok" | "error" | "skipped";
  detail?: string;
  excerpt?: string;
}

export interface ResearchSearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedDate?: string;
  author?: string;
}

export interface ResearchPage {
  url: string;
  title: string;
  text: string;
}

export interface PersonContact {
  name: string;
  role?: string;
  email?: string;
  linkedin?: string;
  x?: string;
  github?: string;
  sourceUrl?: string;
}

export interface ResearchMaterial {
  companyName: string;
  websiteUrl: string;
  jobUrl: string;
  websiteText: string;
  jobText: string;
  searchResults: ResearchSearchResult[];
  pages: ResearchPage[];
  people: PersonContact[];
  observations: string[];
  sources: ResearchSource[];
  generatedAt: number;
}

export interface ResearchStep {
  key: string;
  label: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
}

export interface AIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AppState {
  profile: EvidenceProfile;
  ai: AIConfig;
}
