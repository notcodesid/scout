import type {
  AIConfig,
  Company,
  Dossier,
  EvidenceProfile,
  FitAnalysis,
  OutreachPack,
  PersonContact,
  ProfileEducation,
  ProfileExperience,
  Project,
  ProofTask,
  QualityFlag,
  QualityReport,
  ResearchMaterial,
} from "./types";
import {
  dossierUser,
  DOSSIER_SYSTEM,
  fitUser,
  FIT_SYSTEM,
  outreachUser,
  OUTREACH_SYSTEM,
  peopleUser,
  PEOPLE_SYSTEM,
  proofUser,
  PROOF_SYSTEM,
  qualityUser,
  QUALITY_SYSTEM,
  intakeUser,
  INTAKE_SYSTEM,
  resumeUser,
  RESUME_SYSTEM,
} from "./prompts";
import { hostFromUrl } from "./utils";

export interface AIResult<T> {
  data: T;
  mock: boolean;
}

const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEFAULT_MODEL = "gemini-3.5-flash";

function parseJSON<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const tryParse = (candidate: string): T | null => {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Llama-family models often emit trailing commas; repair and retry.
      const repaired = candidate.replace(/,\s*([}\]])/g, "$1");
      try {
        return JSON.parse(repaired) as T;
      } catch {
        return null;
      }
    }
  };
  const direct = tryParse(cleaned);
  if (direct) return direct;
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        const parsed = tryParse(candidate);
        if (parsed) return parsed;
      }
    }
  }
  return null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("\n");
  if (value == null) return "";
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeDossier(d: Partial<Dossier>): Dossier {
  return {
    companyName: asString(d.companyName),
    oneLiner: asString(d.oneLiner),
    problem: asString(d.problem),
    users: asString(d.users),
    differentiation: asString(d.differentiation),
    team: asStringArray(d.team),
    role: asString(d.role),
    likelyNeeds: asStringArray(d.likelyNeeds),
    competitors: asStringArray(d.competitors),
    sources: asStringArray(d.sources),
    openQuestions: asStringArray(d.openQuestions),
    verified: Boolean(d.verified),
  };
}

function normalizeFit(f: Partial<FitAnalysis>): FitAnalysis {
  const rec = f.recommendation;
  return {
    strongMatches: asStringArray(f.strongMatches),
    weakMatches: asStringArray(f.weakMatches),
    missingProof: asStringArray(f.missingProof),
    recommendation:
      rec === "apply" || rec === "wait" || rec === "skip" ? rec : "wait",
    reasoning: asString(f.reasoning),
    genuineInterest:
      f.genuineInterest === "yes" ||
      f.genuineInterest === "no" ||
      f.genuineInterest === "unsure"
        ? f.genuineInterest
        : "",
  };
}

function normalizeTask(
  t: Partial<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">>
): Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes"> {
  const type = t.type;
  const effort = t.effort;
  return {
    title: asString(t.title),
    type:
      type === "build" || type === "distribution" || type === "research" || type === "other"
        ? type
        : "other",
    effort:
      effort === "30 min" ||
      effort === "1-2 hrs" ||
      effort === "half day" ||
      effort === "a day"
        ? effort
        : "1-2 hrs",
    why: asString(t.why),
    output: asString(t.output),
  };
}

function normalizePerson(p: Partial<PersonContact>): PersonContact {
  return {
    name: asString(p.name),
    role: asString(p.role),
    email: asString(p.email),
    linkedin: asString(p.linkedin),
    x: asString(p.x),
    github: asString(p.github),
    sourceUrl: asString(p.sourceUrl),
  };
}

function normalizeOutreach(o: Partial<OutreachPack>): OutreachPack {
  return {
    email: asString(o.email),
    linkedin: asString(o.linkedin),
    x: asString(o.x),
    followUp: asString(o.followUp),
    notes: asString(o.notes),
  };
}

function normalizeQuality(q: Partial<QualityReport>): QualityReport {
  const rawFlags = Array.isArray(q.flags) ? (q.flags as QualityFlag[]) : [];
  return {
    score: typeof q.score === "number" ? Math.max(0, Math.min(100, Math.round(q.score))) : 0,
    verdict: asString(q.verdict),
    flags: rawFlags.map((f) => ({
      severity:
        f?.severity === "critical" || f?.severity === "warning" || f?.severity === "info"
          ? f.severity
          : "info",
      label: asString(f?.label),
      detail: asString(f?.detail),
    })),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Free tiers hit rate limits (429) constantly. Extract the suggested wait time
// from the provider's message or Retry-After header, then retry a couple times
// with backoff instead of failing the whole flow.
function retryDelayFrom(body: string, retryAfter: string | null): number {
  const match = body.match(/try again in (\d+(?:\.\d+)?)\s*s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000);
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return 0;
}

async function callProvider(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/?$/, "/");
  const maxAttempts = 3;
  let lastDetail = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${base}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      }),
    });
    if (res.status === 429 && attempt < maxAttempts - 1) {
      const body = await res.text().catch(() => "");
      lastDetail = body.slice(0, 300);
      const suggested = retryDelayFrom(body, res.headers.get("retry-after"));
      const delay = suggested || Math.min(3000 * 2 ** attempt, 15000);
      await sleep(delay);
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `AI provider error (${res.status}): ${(detail || lastDetail).slice(0, 300)}`
      );
    }
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned no content");
    return content;
  }
  throw new Error(`AI provider error (429): ${lastDetail}`);
}

async function generateJSON<T>(opts: {
  system: string;
  user: string;
  config?: AIConfig;
  fallback: () => T;
}): Promise<AIResult<T>> {
  const { system, user, config, fallback } = opts;
  const key = config?.apiKey?.trim();
  if (key) {
    try {
      const content = await callProvider(
        config?.baseUrl || DEFAULT_BASE,
        key,
        config?.model || DEFAULT_MODEL,
        system,
        user
      );
      const parsed = parseJSON<T>(content);
      if (parsed) return { data: parsed, mock: false };
      throw new Error("Could not parse model output as JSON");
    } catch (err) {
      throw err;
    }
  }
  try {
    const proxy = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user, model: config?.model || undefined }),
    });
    const json = await proxy.json().catch(() => null);
    if (proxy.ok && json?.content) {
      const parsed = parseJSON<T>(json.content);
      if (parsed) return { data: parsed, mock: false };
    }
    if (json?.error && json.error !== "no_key") {
      throw new Error(json.detail ? `AI error: ${json.detail}` : "AI provider error");
    }
  } catch {
    // Proxy unreachable; fall through to mock rather than blocking the workflow.
  }
  return { data: fallback(), mock: true };
}

// Server-side generation: reads the AI provider from env (no browser key).
export async function generateJSONServer<T>(opts: {
  system: string;
  user: string;
  fallback: () => T;
}): Promise<T> {
  const key = process.env.AI_API_KEY;
  if (key) {
    const content = await callProvider(
      process.env.AI_BASE_URL || DEFAULT_BASE,
      key,
      process.env.AI_MODEL || DEFAULT_MODEL,
      opts.system,
      opts.user
    );
    const parsed = parseJSON<T>(content);
    if (parsed) return parsed;
    throw new Error("Could not parse model output as JSON");
  }
  return opts.fallback();
}

export function hasAIKey(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

// ---- Fallbacks (used when no AI key is configured) ------------------------

function dossierFallback(
  company: Pick<Company, "url" | "jobUrl" | "notes">,
  material?: ResearchMaterial
): Partial<Dossier> {
  const host = hostFromUrl(company.url);
  const sources = material?.sources.length
    ? material.sources.map((s) => s.url)
    : [company.url, company.jobUrl].filter(Boolean);
  const team = material?.people.length
    ? material.people.map((p) => (p.role ? `${p.name} — ${p.role}` : p.name))
    : [];
  return {
    companyName: material?.companyName || host.charAt(0).toUpperCase() + host.slice(1),
    oneLiner: "Sample: what this company does, in one sentence.",
    problem: "Sample: the real problem they solve and for whom.",
    users: "Sample: who uses it and why.",
    differentiation: "Sample: how they differ from alternatives.",
    team,
    role: "Sample: what the role or company likely needs.",
    likelyNeeds: [
      "Sample: shipping a first feature fast",
      "Sample: turning user feedback into product direction",
    ],
    competitors: [],
    sources,
    openQuestions: [
      "Sample: What did you notice when you actually used the product?",
      "Sample: Who is one team member you could reach directly?",
    ],
    verified: false,
  };
}

function fitFallback(
  profile: EvidenceProfile,
  dossier: Dossier
): Partial<FitAnalysis> {
  const projectNames =
    profile.projects.map((p) => p.name).join(", ") || "no projects yet";
  return {
    strongMatches: [
      projectNames
        ? `Evidence: ${projectNames}`
        : "No evidence profile yet, so no strong matches",
    ],
    weakMatches: [
      `Sample: overlap with ${dossier.companyName} exists on paper but is not proven`,
    ],
    missingProof: [
      "Sample: something real and linkable that shows you understand their product",
      "Sample: proof that anyone used what you built",
    ],
    recommendation: profile.projects.length > 0 ? "wait" : "skip",
    reasoning:
      "Sample (mock mode, no AI key configured). Add your Gemini or OpenAI key to get a real analysis.",
    genuineInterest: "",
  };
}

function tasksFallback(
  profile: EvidenceProfile,
  dossier: Dossier,
  fit: FitAnalysis,
  observations: string[]
): Partial<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">>[] {
  if (!observations.length) {
    return [
      normalizeTask({
        title: `Walk through ${dossier.companyName}'s product and record what you actually hit`,
        type: "research",
        effort: "30 min",
        why: "No real observation yet — a build task without observed need is a guess. This produces the evidence to build from.",
        output:
          "A short observation list: 3-5 concrete frictions, surprises, or gaps you found, with screenshots.",
      }),
    ];
  }
  return [
    normalizeTask({
      title: `Build the smallest artifact that fixes one of your observations: "${observations[0]}"`,
      type: "research",
      effort: "1-2 hrs",
      why: `Responds to what you actually observed: ${observations[0]}. Proof of use and user-thinking in one.`,
      output: "A one-page writeup or short post (link) naming the friction and one suggested fix.",
    }),
    normalizeTask({
      title: `Build a small artifact that directly addresses your observation`,
      type: "build",
      effort: "half day",
      why: "Proof of execution tied to a real, observed need rather than an inferred one.",
      output: "A live link or repo with a README that states the observation, what you built, and the outcome.",
    }),
    normalizeTask({
      title: "Share the artifact with people who feel the same friction and collect feedback",
      type: "distribution",
      effort: "30 min",
      why: "Real need is confirmed by real users, not by you alone. Feedback also strengthens the outreach.",
      output: "The post link plus 3-5 comments or user reactions you can quote.",
    }),
  ];
}

function outreachFallback(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  proofTasks: ProofTask[];
  contacts: string[];
}): Partial<OutreachPack> {
  return {
    email: `Hi [FOUNDER NAME],\n\nI went through ${opts.dossier.companyName}'s product this week and [WHAT YOU NOTICED USING THE PRODUCT].\n\nI built [PROJECT NAME] ([PROJECT LINK]) used by [NUMBER] people solving [PROBLEM]. I think that maps to [SPECIFIC LIKELY NEED].\n\nI put together [PROOF ARTIFACT LINK] after spending time on your onboarding. Happy to talk it through.\n\n[YOUR NAME]\n[GITHUB / PORTFOLIO]`,
    linkedin: `Hi [NAME], I used ${opts.dossier.companyName}'s product and noticed [SPECIFIC OBSERVATION]. I built [PROJECT] ([LINK]) used by [N] people. I wrote up one fix idea here: [LINK]. Would love to help.`,
    x: `Used ${opts.dossier.companyName} today. [SPECIFIC OBSERVATION]. Built [PROJECT] ([LINK], [N] users). Wrote up a fix: [LINK]. Happy to help.`,
    followUp: `Hi [NAME], circling back once in case this got buried. Happy to walk through [PROOF ARTIFACT]. No worries either way.`,
    notes: [
      "Fill in [FOUNDER NAME] and the specific observation you noticed using the product.",
      "Add your real project link and numbers. Never claim unfinished work.",
      "Keep the email under 150 words. Cut anything that sounds generic.",
    ].join("\n"),
  };
}

function qualityFallback(
  outreach: OutreachPack,
  dossier: Dossier
): Partial<QualityReport> {
  const text = [outreach.email, outreach.linkedin, outreach.x].join("\n");
  const hasLinks = /(https?:\/\/|\[LINK\])/i.test(text);
  const hasPlaceholders = /\[[A-Z\s]+\]/.test(text);
  return {
    score: hasPlaceholders ? 45 : hasLinks ? 70 : 55,
    verdict: hasPlaceholders
      ? "Sample: draft is a good skeleton but unfilled placeholders are an instant reject. Complete it before sending."
      : "Sample: review in progress. Add a real key for a detailed audit.",
    flags: [
      ...(hasPlaceholders
        ? [
            {
              severity: "critical" as const,
              label: "Unfilled placeholders",
              detail: "Replace every [UPPERCASE] token with your real specifics.",
            },
          ]
        : []),
      ...(!hasLinks
        ? [
            {
              severity: "warning" as const,
              label: "No link to proof",
              detail: "Add one or two links to your project, demo, or proof artifact.",
            },
          ]
        : []),
      {
        severity: "info" as const,
        label: "Specificity check",
        detail: "Confirm every company reference is a real observation, not generic praise.",
      },
    ],
  };
}

// ---- Module runners (client, kept for compatibility) ----------------------

export function buildDossier(opts: {
  company: Pick<Company, "url" | "jobUrl" | "notes">;
  profile: EvidenceProfile;
  config?: AIConfig;
  material?: ResearchMaterial;
}): Promise<AIResult<Dossier>> {
  return generateJSON<Partial<Dossier>>({
    system: DOSSIER_SYSTEM,
    user: dossierUser({
      companyUrl: opts.company.url,
      jobUrl: opts.company.jobUrl,
      notes: opts.company.notes,
      profile: opts.profile,
      material: opts.material,
    }),
    config: opts.config,
    fallback: () => dossierFallback(opts.company, opts.material),
  }).then((res) => ({ data: normalizeDossier(res.data), mock: res.mock }));
}

export function analyzeFit(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  config?: AIConfig;
}): Promise<AIResult<FitAnalysis>> {
  return generateJSON<Partial<FitAnalysis>>({
    system: FIT_SYSTEM,
    user: fitUser({ profile: opts.profile, dossier: opts.dossier }),
    config: opts.config,
    fallback: () => fitFallback(opts.profile, opts.dossier),
  }).then((res) => ({ data: normalizeFit(res.data), mock: res.mock }));
}

export function suggestProofTasks(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  observations: string[];
  config?: AIConfig;
}): Promise<
  AIResult<{
    tasks: Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">[];
  }>
> {
  return generateJSON<{
    tasks: Partial<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">>[];
  }>({
    system: PROOF_SYSTEM,
    user: proofUser({
      profile: opts.profile,
      dossier: opts.dossier,
      fit: opts.fit,
      observations: opts.observations,
    }),
    config: opts.config,
    fallback: () => ({
      tasks: tasksFallback(opts.profile, opts.dossier, opts.fit, opts.observations),
    }),
  }).then((res) => ({
    data: { tasks: res.data.tasks.map(normalizeTask) },
    mock: res.mock,
  }));
}

export function draftOutreach(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  proofTasks: ProofTask[];
  contacts: string[];
  config?: AIConfig;
}): Promise<AIResult<OutreachPack>> {
  return generateJSON<Partial<OutreachPack>>({
    system: OUTREACH_SYSTEM,
    user: outreachUser({
      profile: opts.profile,
      dossier: opts.dossier,
      fit: opts.fit,
      proofTasks: opts.proofTasks,
      contacts: opts.contacts,
    }),
    config: opts.config,
    fallback: () => outreachFallback(opts),
  }).then((res) => ({ data: normalizeOutreach(res.data), mock: res.mock }));
}

export function checkQuality(opts: {
  outreach: OutreachPack;
  dossier: Dossier;
  config?: AIConfig;
}): Promise<AIResult<QualityReport>> {
  return generateJSON<Partial<QualityReport>>({
    system: QUALITY_SYSTEM,
    user: qualityUser({ outreach: opts.outreach, dossier: opts.dossier }),
    config: opts.config,
    fallback: () => qualityFallback(opts.outreach, opts.dossier),
  }).then((res) => ({ data: normalizeQuality(res.data), mock: res.mock }));
}

// ---- Server runners (used by server actions) ------------------------------

export async function buildDossierServer(opts: {
  company: Pick<Company, "url" | "jobUrl" | "notes">;
  profile: EvidenceProfile;
  material?: ResearchMaterial;
}): Promise<Dossier> {
  return normalizeDossier(
    await generateJSONServer<Partial<Dossier>>({
      system: DOSSIER_SYSTEM,
      user: dossierUser({
        companyUrl: opts.company.url,
        jobUrl: opts.company.jobUrl,
        notes: opts.company.notes,
        profile: opts.profile,
        material: opts.material,
      }),
      fallback: () => dossierFallback(opts.company, opts.material),
    })
  );
}

// Writes the wording for one intake question. The field itself is chosen by
// lib/intake.ts, never by the model — see lib/intake-spec.ts for why.
export async function nextIntakeQuestionServer(opts: {
  fieldId: string;
  intent: string;
  sectionLabel: string;
  isFirst: boolean;
  acknowledge: boolean;
  answers: { question: string; answer: string }[];
  profileName: string;
  fallbackQuestion: string;
}): Promise<string> {
  if (!hasAIKey()) return opts.fallbackQuestion;
  try {
    const res = await generateJSONServer<{ question?: unknown }>({
      system: INTAKE_SYSTEM,
      user: intakeUser(opts),
      fallback: () => ({}),
    });
    const q = asString(res.question).trim();
    return q || opts.fallbackQuestion;
  } catch {
    // A phrasing failure must never block the intake; the scripted wording is
    // always a correct question for this field.
    return opts.fallbackQuestion;
  }
}

export interface ResumeExtract {
  name: string;
  headline: string;
  about: string;
  email: string;
  phone: string;
  location: string;
  githubUsername: string;
  lookingFor: string;
  targetRoles: string[];
  links: { label: string; url: string }[];
  skills: { name: string; years: number }[];
  projects: Omit<Project, "id">[];
  experience: ProfileExperience[];
  education: ProfileEducation[];
}

function normalizeResume(r: Record<string, unknown>): ResumeExtract {
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};

  return {
    name: asString(r.name),
    headline: asString(r.headline),
    about: asString(r.about),
    email: asString(r.email),
    phone: asString(r.phone),
    location: asString(r.location),
    githubUsername: asString(r.githubUsername).replace(/^@/, "").replace(/^.*github\.com\//i, ""),
    lookingFor: asString(r.lookingFor),
    targetRoles: asStringArray(r.targetRoles),
    links: arr(r.links)
      .map((l) => {
        const o = obj(l);
        return { label: asString(o.label) || "Link", url: asString(o.url) };
      })
      .filter((l) => l.url),
    skills: arr(r.skills)
      .map((s) => {
        const o = obj(s);
        const years = Number(o.years);
        return {
          name: asString(o.name),
          years: Number.isFinite(years) ? Math.max(0, Math.min(50, Math.round(years))) : 0,
        };
      })
      .filter((s) => s.name),
    projects: arr(r.projects)
      .map((p) => {
        const o = obj(p);
        return {
          name: asString(o.name),
          problem: asString(o.problem),
          work: asString(o.work),
          outcome: asString(o.outcome),
          users: asString(o.users),
          links: asStringArray(o.links),
          tags: asStringArray(o.tags),
          startDate: asString(o.startDate),
          endDate: asString(o.endDate),
        };
      })
      .filter((p) => p.name),
    experience: arr(r.experience)
      .map((e) => {
        const o = obj(e);
        return {
          company: asString(o.company),
          role: asString(o.role),
          startDate: asString(o.startDate),
          endDate: asString(o.endDate),
          current: Boolean(o.current),
          summary: asString(o.summary),
          bullets: asStringArray(o.bullets),
        };
      })
      .filter((e) => e.company || e.role),
    education: arr(r.education)
      .map((e) => {
        const o = obj(e);
        return {
          school: asString(o.school),
          degree: asString(o.degree),
          field: asString(o.field),
          startDate: asString(o.startDate),
          endDate: asString(o.endDate),
          notes: asString(o.notes),
        };
      })
      .filter((e) => e.school),
  };
}

function emptyResumeExtract(): ResumeExtract {
  return {
    name: "",
    headline: "",
    about: "",
    email: "",
    phone: "",
    location: "",
    githubUsername: "",
    lookingFor: "",
    targetRoles: [],
    links: [],
    skills: [],
    projects: [],
    experience: [],
    education: [],
  };
}

// Resume text -> structured profile. Returns `mock: true` when no AI key is
// configured, so the UI can tell the user nothing was actually extracted
// instead of silently showing an empty profile as if the resume were blank.
export async function parseResumeServer(
  resumeText: string
): Promise<{ data: ResumeExtract; mock: boolean }> {
  if (!hasAIKey()) return { data: emptyResumeExtract(), mock: true };
  const raw = await generateJSONServer<Record<string, unknown>>({
    system: RESUME_SYSTEM,
    user: resumeUser({ resumeText }),
    fallback: () => ({}),
  });
  return { data: normalizeResume(raw), mock: false };
}

export async function extractPeopleServer(opts: {
  companyName: string;
  material: ResearchMaterial;
}): Promise<PersonContact[]> {
  const res = await generateJSONServer<{
    people?: Partial<PersonContact>[];
  }>({
    system: PEOPLE_SYSTEM,
    user: peopleUser({
      companyName: opts.companyName,
      material: opts.material,
    }),
    fallback: () => ({ people: [] }),
  });
  return (res.people ?? []).map(normalizePerson).filter((p) => p.name.trim());
}

export async function analyzeFitServer(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
}): Promise<FitAnalysis> {
  return normalizeFit(
    await generateJSONServer<Partial<FitAnalysis>>({
      system: FIT_SYSTEM,
      user: fitUser({ profile: opts.profile, dossier: opts.dossier }),
      fallback: () => fitFallback(opts.profile, opts.dossier),
    })
  );
}

export async function suggestProofTasksServer(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  observations: string[];
}): Promise<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">[]> {
  const res = await generateJSONServer<{
    tasks: Partial<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">>[];
  }>({
    system: PROOF_SYSTEM,
    user: proofUser({
      profile: opts.profile,
      dossier: opts.dossier,
      fit: opts.fit,
      observations: opts.observations,
    }),
    fallback: () => ({
      tasks: tasksFallback(opts.profile, opts.dossier, opts.fit, opts.observations),
    }),
  });
  return res.tasks.map(normalizeTask);
}

export async function draftOutreachServer(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  proofTasks: ProofTask[];
  contacts: string[];
}): Promise<OutreachPack> {
  return normalizeOutreach(
    await generateJSONServer<Partial<OutreachPack>>({
      system: OUTREACH_SYSTEM,
      user: outreachUser({
        profile: opts.profile,
        dossier: opts.dossier,
        fit: opts.fit,
        proofTasks: opts.proofTasks,
        contacts: opts.contacts,
      }),
      fallback: () => outreachFallback(opts),
    })
  );
}

export async function checkQualityServer(opts: {
  outreach: OutreachPack;
  dossier: Dossier;
}): Promise<QualityReport> {
  return normalizeQuality(
    await generateJSONServer<Partial<QualityReport>>({
      system: QUALITY_SYSTEM,
      user: qualityUser({ outreach: opts.outreach, dossier: opts.dossier }),
      fallback: () => qualityFallback(opts.outreach, opts.dossier),
    })
  );
}
