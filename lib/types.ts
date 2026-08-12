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

export interface Project {
  id: string;
  name: string;
  problem: string;
  work: string;
  outcome: string;
  users: string;
  links: string[];
  tags: string[];
}

export interface EvidenceProfile {
  name: string;
  headline: string;
  location: string;
  email: string;
  links: ProfileLink[];
  skills: string[];
  projects: Project[];
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
  followUpDate: string;
}

export interface AIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AppState {
  profile: EvidenceProfile;
  companies: Company[];
  ai: AIConfig;
}
