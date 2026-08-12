import type {
  AIConfig,
  Company,
  Dossier,
  EvidenceProfile,
  FitAnalysis,
  OutreachPack,
  ProofTask,
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
const DEFAULT_MODEL = "gemini-3-flash";

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
      // Surface real provider errors; keep mock as a last resort? No: if the user
      // configured a key, a real error should be visible, not silently mocked.
      throw err;
    }
  }
  // Try the server-side env path (AI_API_KEY in .env.local).
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
    if (json?.error === "no_key") {
      // No key anywhere: fall through to mock.
    } else if (json?.error) {
      throw new Error(json.detail ? `AI error: ${json.detail}` : "AI provider error");
    }
  } catch {
    // Proxy unreachable; fall through to mock rather than blocking the workflow.
  }
  return { data: fallback(), mock: true };
}

// ---- Module runners -------------------------------------------------------

export function buildDossier(opts: {
  company: Pick<Company, "url" | "jobUrl" | "notes">;
  profile: EvidenceProfile;
  config?: AIConfig;
}): Promise<AIResult<Dossier>> {
  const host = hostFromUrl(opts.company.url);
  return generateJSON<Dossier>({
    system: DOSSIER_SYSTEM,
    user: dossierUser({
      companyUrl: opts.company.url,
      jobUrl: opts.company.jobUrl,
      notes: opts.company.notes,
      profile: opts.profile,
    }),
    config: opts.config,
    fallback: () => ({
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
      sources: [opts.company.url, opts.company.jobUrl].filter(Boolean),
      openQuestions: [
        "Sample: What did you notice when you actually used the product?",
        "Sample: Who is one team member you could reach directly?",
      ],
      verified: false,
    }),
  });
}

export function analyzeFit(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  config?: AIConfig;
}): Promise<AIResult<FitAnalysis>> {
  const projectNames =
    opts.profile.projects.map((p) => p.name).join(", ") || "no projects yet";
  return generateJSON<FitAnalysis>({
    system: FIT_SYSTEM,
    user: fitUser({ profile: opts.profile, dossier: opts.dossier }),
    config: opts.config,
    fallback: () => ({
      strongMatches: [
        projectNames
          ? `Evidence: ${projectNames}`
          : "No evidence profile yet, so no strong matches",
      ],
      weakMatches: [
        `Sample: overlap with ${opts.dossier.companyName} exists on paper but is not proven`,
      ],
      missingProof: [
        "Sample: something real and linkable that shows you understand their product",
        "Sample: proof that anyone used what you built",
      ],
      recommendation: opts.profile.projects.length > 0 ? "wait" : "skip",
      reasoning:
        "Sample (mock mode, no AI key configured). Add your Gemini or OpenAI key to get a real analysis.",
      genuineInterest: "",
    }),
  });
}

export function suggestProofTasks(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  config?: AIConfig;
}): Promise<AIResult<{ tasks: Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">[] }>> {
  return generateJSON<{
    tasks: Omit<ProofTask, "id" | "done" | "evidenceLink" | "notes">[];
  }>({
    system: PROOF_SYSTEM,
    user: proofUser({ profile: opts.profile, dossier: opts.dossier, fit: opts.fit }),
    config: opts.config,
    fallback: () => ({
      tasks: [
        {
          title: `Walk through ${opts.dossier.companyName}'s onboarding and write up one real friction point`,
          type: "research",
          effort: "1-2 hrs",
          why: "Shows you actually used the product and can spot problems, not just describe it.",
          output: "A short post (link) or a one-page doc with screenshots and one suggested fix.",
        },
        {
          title: "Build a small artifact that solves a problem adjacent to theirs",
          type: "build",
          effort: "half day",
          why: "Proof of execution: shipped something real, linkable, related to their space.",
          output: "A live link or repo with a README that states the problem and outcome.",
        },
        {
          title: "Share the artifact in a relevant community and collect feedback",
          type: "distribution",
          effort: "30 min",
          why: "Shipping without distribution is incomplete signal. Real users matter more than polish.",
          output: "The post link plus 3-5 comments or user reactions you can quote.",
        },
      ],
    }),
  });
}

export function draftOutreach(opts: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  proofTasks: ProofTask[];
  contacts: string[];
  config?: AIConfig;
}): Promise<AIResult<OutreachPack>> {
  return generateJSON<OutreachPack>({
    system: OUTREACH_SYSTEM,
    user: outreachUser({
      profile: opts.profile,
      dossier: opts.dossier,
      fit: opts.fit,
      proofTasks: opts.proofTasks,
      contacts: opts.contacts,
    }),
    config: opts.config,
    fallback: () => ({
      email: `Hi [FOUNDER NAME],\n\nI went through ${opts.dossier.companyName}'s product this week and [WHAT YOU NOTICED USING THE PRODUCT].\n\nI built [PROJECT NAME] ([PROJECT LINK]) used by [NUMBER] people solving [PROBLEM]. I think that maps to [SPECIFIC LIKELY NEED].\n\nI put together [PROOF ARTIFACT LINK] after spending time on your onboarding. Happy to talk it through.\n\n[YOUR NAME]\n[GITHUB / PORTFOLIO]`,
      linkedin: `Hi [NAME], I used ${opts.dossier.companyName}'s product and noticed [SPECIFIC OBSERVATION]. I built [PROJECT] ([LINK]) used by [N] people. I wrote up one fix idea here: [LINK]. Would love to help.`,
      x: `Used ${opts.dossier.companyName} today. [SPECIFIC OBSERVATION]. Built [PROJECT] ([LINK], [N] users). Wrote up a fix: [LINK]. Happy to help.`,
      followUp: `Hi [NAME], circling back once in case this got buried. Happy to walk through [PROOF ARTIFACT]. No worries either way.`,
      notes: [
        "Fill in [FOUNDER NAME] and the specific observation you noticed using the product.",
        "Add your real project link and numbers. Never claim unfinished work.",
        "Keep the email under 150 words. Cut anything that sounds generic.",
      ].join("\n"),
    }),
  });
}

export function checkQuality(opts: {
  outreach: OutreachPack;
  dossier: Dossier;
  config?: AIConfig;
}): Promise<AIResult<QualityReport>> {
  const hasLinks = /(https?:\/\/|\[LINK\])/i.test(
    [opts.outreach.email, opts.outreach.linkedin, opts.outreach.x].join("\n")
  );
  const hasPlaceholders = /\[[A-Z\s]+\]/.test(
    [opts.outreach.email, opts.outreach.linkedin, opts.outreach.x].join("\n")
  );
  return generateJSON<QualityReport>({
    system: QUALITY_SYSTEM,
    user: qualityUser({ outreach: opts.outreach, dossier: opts.dossier }),
    config: opts.config,
    fallback: () => ({
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
    }),
  });
}
