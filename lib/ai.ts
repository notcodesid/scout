import type {
  AIConfig,
  Company,
  Dossier,
  EvidenceProfile,
  FitAnalysis,
  OutreachPack,
  ProofTask,
  QualityFlag,
  QualityReport,
} from "./types";
import {
  dossierUser,
  DOSSIER_SYSTEM,
  fitUser,
  FIT_SYSTEM,
  outreachUser,
  OUTREACH_SYSTEM,
  proofUser,
  PROOF_SYSTEM,
  qualityUser,
  QUALITY_SYSTEM,
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
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through to balanced-brace extraction
  }
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
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
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

async function callProvider(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/?$/, "/");
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
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no content");
  return content;
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
  company: Pick<Company, "url" | "jobUrl" | "notes">
): Partial<Dossier> {
  const host = hostFromUrl(company.url);
  return {
    companyName: host.charAt(0).toUpperCase() + host.slice(1),
    oneLiner: "Sample: what this company does, in one sentence.",
    problem: "Sample: the real problem they solve and for whom.",
    users: "Sample: who uses it and why.",
    differentiation: "Sample: how they differ from alternatives.",
    team: [],
    role: "Sample: what the role or company likely needs.",
    likelyNeeds: [
      "Sample [inferred]: shipping a first feature fast",
      "Sample [inferred]: turning user feedback into product direction",
    ],
    competitors: [],
    sources: [company.url, company.jobUrl].filter(Boolean),
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
  fit: FitAnalysis
): Partial<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">>[] {
  return [
    normalizeTask({
      title: `Walk through ${dossier.companyName}'s onboarding and write up one real friction point`,
      type: "research",
      effort: "1-2 hrs",
      why: "Shows you actually used the product and can spot problems, not just describe it.",
      output: "A short post (link) or a one-page doc with screenshots and one suggested fix.",
    }),
    normalizeTask({
      title: "Build a small artifact that solves a problem adjacent to theirs",
      type: "build",
      effort: "half day",
      why: "Proof of execution: shipped something real, linkable, related to their space.",
      output: "A live link or repo with a README that states the problem and outcome.",
    }),
    normalizeTask({
      title: "Share the artifact in a relevant community and collect feedback",
      type: "distribution",
      effort: "30 min",
      why: "Shipping without distribution is incomplete signal. Real users matter more than polish.",
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
}): Promise<AIResult<Dossier>> {
  return generateJSON<Partial<Dossier>>({
    system: DOSSIER_SYSTEM,
    user: dossierUser({
      companyUrl: opts.company.url,
      jobUrl: opts.company.jobUrl,
      notes: opts.company.notes,
      profile: opts.profile,
    }),
    config: opts.config,
    fallback: () => dossierFallback(opts.company),
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
    user: proofUser({ profile: opts.profile, dossier: opts.dossier, fit: opts.fit }),
    config: opts.config,
    fallback: () => ({ tasks: tasksFallback(opts.profile, opts.dossier, opts.fit) }),
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
}): Promise<Dossier> {
  return normalizeDossier(
    await generateJSONServer<Partial<Dossier>>({
      system: DOSSIER_SYSTEM,
      user: dossierUser({
        companyUrl: opts.company.url,
        jobUrl: opts.company.jobUrl,
        notes: opts.company.notes,
        profile: opts.profile,
      }),
      fallback: () => dossierFallback(opts.company),
    })
  );
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
}): Promise<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">[]> {
  const res = await generateJSONServer<{
    tasks: Partial<Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">>[];
  }>({
    system: PROOF_SYSTEM,
    user: proofUser({ profile: opts.profile, dossier: opts.dossier, fit: opts.fit }),
    fallback: () => ({ tasks: tasksFallback(opts.profile, opts.dossier, opts.fit) }),
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
