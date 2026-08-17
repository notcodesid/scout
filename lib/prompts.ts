import type {
  Company,
  Dossier,
  EvidenceProfile,
  FitAnalysis,
  OutreachPack,
  PersonContact,
  ProofTask,
  QualityReport,
  ResearchMaterial,
} from "./types";

export const DOSSIER_SYSTEM = `You are a startup research analyst for Scout, a job-application copilot.
Your job: turn the fetched research material (website content, job post, web search results, notes) into a tight, sourced research dossier.
Rules:
- Use ONLY the provided material. Do not fall back to prior knowledge or guess.
- Never invent facts. If something is unknown or unverifiable, write "Unknown" or "Not in provided material".
- Be specific. Vague praise is useless.
- Sources: list the exact URLs from the provided material that you actually used.
- Team: extract founder, co-founder, leadership, and team names from the material
  (website, job post, news, search results). Format as "Name — Role" when the
  role is known. Only people actually named in the material; never guess names.
- Likely needs: infer what the company probably needs help with, based only on
  provided material. These are your inferences — never present them as
  company-stated facts. Do not add any marker like "[inferred]" to the text.
Respond with a single JSON object only. No markdown, no commentary.`;

// The dossier only needs the candidate for context (it must not appear in the
// output), so send a compact summary to keep free-tier prompts under token
// limits. Fit and outreach use the full profile.
function compactProfile(profile: EvidenceProfile) {
  return {
    name: profile.name,
    headline: profile.headline,
    skills: profile.skills.slice(0, 10).map((s) => `${s.name} (${s.years}y)`),
    projects: profile.projects.slice(0, 5).map((p) => ({
      name: p.name,
      problem: p.problem.slice(0, 200),
      outcome: p.outcome.slice(0, 200),
      users: p.users.slice(0, 120),
    })),
    experience: profile.experience.slice(0, 5).map((e) => ({
      company: e.company,
      role: e.role,
      summary: e.summary.slice(0, 200),
    })),
  };
}

export function dossierUser(input: {
  companyUrl: string;
  jobUrl: string;
  notes: string;
  profile: EvidenceProfile;
  material?: ResearchMaterial;
}): string {
  const material = input.material;
  const searchBlock = material?.searchResults.length
    ? material.searchResults
        .map(
          (r, i) =>
            `${i + 1}. ${r.title} — ${r.url}\n   ${r.snippet || "(no snippet)"}`
        )
        .join("\n")
    : "No search results available.";
  const pagesBlock = material?.pages.length
    ? material.pages
        .map((p) => `--- ${p.title} (${p.url}) ---\n${p.text}`)
        .join("\n\n")
    : "No additional pages fetched.";
  const peopleBlock = material?.people.length
    ? material.people
        .map(
          (p) =>
            `${p.name}${p.role ? ` — ${p.role}` : ""}` +
            `${p.email ? ` · ${p.email}` : ""}` +
            `${p.linkedin ? ` · ${p.linkedin}` : ""}` +
            `${p.x ? ` · ${p.x}` : ""}`
        )
        .join("\n")
    : "No people found yet.";

  return `Candidate profile (for context only, do not include in the dossier):
${JSON.stringify(compactProfile(input.profile), null, 2)}

Company URL: ${input.companyUrl || "not provided"}
Job post URL: ${input.jobUrl || "not provided"}
Candidate notes / material:
${input.notes || "not provided"}

=== FETCHED WEBSITE CONTENT ===
${material?.websiteText || "Website was not fetched or is unavailable."}

=== FETCHED JOB POST CONTENT ===
${material?.jobText || "Job post was not fetched or is unavailable."}

=== ADDITIONAL PAGES (team / about) ===
${pagesBlock}

=== WEB SEARCH RESULTS ===
${searchBlock}

=== PEOPLE FOUND ===
${peopleBlock}

=== INSTRUCTIONS ===
Base every field on the fetched material above. Cite only URLs that appear in
the material. When a field cannot be answered from the material, write "Unknown"
or "Not in provided material". Mark anything you infer as [inferred]. Use the
People found list when filling the "team" field.

Return JSON with exactly these fields:
{
  "companyName": "string",
  "oneLiner": "what the company does in one sentence",
  "problem": "the real problem they solve, for whom",
  "users": "who uses it and why",
  "differentiation": "how they are different from alternatives",
  "team": ["names only if known"],
  "role": "what the role seems to need, or the company's likely hiring need",
  "likelyNeeds": ["3-5 specific things they probably need help with — inferred from the material, not stated by the company"],
  "competitors": ["alternatives, from provided material only"],
  "sources": ["every URL provided or cited"],
  "openQuestions": ["3-5 questions the candidate should verify before applying"]
}`;
}

export const PEOPLE_SYSTEM = `You extract people from startup research material for Scout.
Find every person the material indicates is a founder, co-founder, executive, or
team member of the company. Rules:
- name is required; role only if the material states it.
- email, linkedin, and x: ONLY if the material literally contains them. Never guess
  or reconstruct emails or profile URLs.
- Ignore generic addresses like support@ or careers@ unless tied to a named person.
- If no people are found, return an empty list.
Respond with a single JSON object only. No markdown.`;

export function peopleUser(input: {
  companyName: string;
  material: ResearchMaterial;
}): string {
  const m = input.material;
  return `Company: ${input.companyName}

=== WEBSITE CONTENT ===
${m.websiteText || "not fetched"}

=== JOB POST CONTENT ===
${m.jobText || "not fetched"}

=== ADDITIONAL PAGES ===
${m.pages.map((p) => `--- ${p.title} (${p.url}) ---\n${p.text}`).join("\n\n") || "none"}

=== SEARCH RESULTS ===
${m.searchResults
  .map((r, i) => `${i + 1}. ${r.title} — ${r.url}\n   ${r.snippet || ""}`)
  .join("\n") || "none"}

Return JSON with exactly this shape:
{
  "people": [
    {
      "name": "full name",
      "role": "role if known, otherwise \"\"",
      "email": "only if literally in the material",
      "linkedin": "only if literally in the material",
      "x": "only if literally in the material"
    }
  ]
}`;
}

export const FIT_SYSTEM = `You are a brutally honest hiring-fit analyst for Scout.
You compare a candidate's evidence profile to a company dossier and answer one question:
can this candidate prove they can help this specific company, fast?
Rules:
- Judge evidence, not claims. A project with users and outcomes beats ten listed skills.
- Recommendation meanings:
  apply = strong evidence match AND the candidate can move quickly.
  wait = real overlap but a missing piece of proof exists that the candidate could build.
  skip = weak overlap or no genuine reason to believe the candidate can help.
- Be specific about which project/evidence matches what the company needs.
Respond with a single JSON object only. No markdown.`;

export function fitUser(input: {
  profile: EvidenceProfile;
  dossier: Dossier;
}): string {
  return `CANDIDATE EVIDENCE PROFILE:
${JSON.stringify(input.profile, null, 2)}

COMPANY DOSSIER:
${JSON.stringify(input.dossier, null, 2)}

Return JSON with exactly these fields:
{
  "strongMatches": ["specific evidence-to-need matches"],
  "weakMatches": ["overlap that is present but not yet proven"],
  "missingProof": ["the specific proof that would move this from weak to strong"],
  "recommendation": "apply" | "wait" | "skip",
  "reasoning": "3-5 sentences. Specific, no fluff."
}`;
}

export const PROOF_SYSTEM = `You are the proof-task engine for Scout. This is the killer feature.
Given a candidate's evidence and a company dossier, suggest 1-3 realistic tasks that build trust BEFORE applying.
Rules:
- Company-specific. A task must reference the company's product, problem, or users, not a generic tutorial.
- EVIDENCE OF NEED IS MANDATORY. Never invent a need. Every task must be grounded in
  at least one of: (1) the candidate's own recorded observations of the product,
  (2) a public issue, changelog entry, or user complaint from the material, or
  (3) the fit analysis' missing-proof list. The "why" must name that evidence explicitly.
- If the candidate provided observations: build tasks around those observations.
  Quote or paraphrase the observation in the task's "why" so it's clear which real
  friction the task addresses.
- If the candidate provided NO observations: do not suggest a build task yet.
  Suggest a research task (30 min or 1-2 hrs) that produces concrete observations
  of the product, and make its output a written observation list the candidate can
  later build from.
- Realistic effort: 30 min, 1-2 hrs, half day, or a day. Prefer the smallest task that proves something real.
- Mix task types:
  build = produce a linkable artifact (fix, test, prototype, writeup, demo).
  distribution = get the artifact in front of real people (post in a community, get 5 users, collect feedback).
  research = a sharp, observable analysis of the product (onboarding walkthrough, UX notes, data pull).
- Every task must produce a visible outcome the candidate can link or quote in outreach.
- No fake metrics. No busywork.
Respond with a single JSON object only.`;

export function proofUser(input: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  observations: string[];
}): string {
  return `CANDIDATE EVIDENCE PROFILE:
${JSON.stringify(input.profile, null, 2)}

COMPANY DOSSIER:
${JSON.stringify(input.dossier, null, 2)}

FIT ANALYSIS:
${JSON.stringify(input.fit, null, 2)}

CANDIDATE OBSERVATIONS (what they noticed using the product / reading public material):
${input.observations.length ? input.observations.map((o, i) => `${i + 1}. ${o}`).join("\n") : "none recorded yet"}

If observations are listed, ground your tasks in them and cite the specific observation in each task's "why".
If none are listed, suggest a research task that produces observations instead of a build task.

Return JSON with exactly these fields:
{
  "tasks": [
    {
      "title": "string",
      "type": "build" | "distribution" | "research",
      "effort": "30 min" | "1-2 hrs" | "half day" | "a day",
      "why": "the real evidence (observation, issue, or missing proof) this task responds to, and why it builds trust for THIS company",
      "output": "the concrete, linkable/quotable outcome"
    }
  ]
}`;
}

export const OUTREACH_SYSTEM = `You draft short, human outreach for Scout. The evaluator is a busy founder who has read thousands of applications.
Rules:
- Email under 150 words (90-second skim). LinkedIn shorter. X even shorter.
- NO em dashes. NO buzzwords: passionate, synergy, leverage, passionate about, I am writing to express, excited to join.
- Lead with a specific, concrete observation or proof. Never start with "I am a ... developer".
- Include placeholders in ALL-CAPS brackets for anything only the candidate knows, e.g. [WHAT YOU NOTICED USING THE PRODUCT], [YOUR PROJECT LINK].
- Proof follows work + context + outcome. One or two links max.
- Show you understand the company: reference a real product decision, tradeoff, or observation from the dossier.
- Write it like a person, not a template. Sentence fragments are fine.
Respond with a single JSON object only.`;

export function outreachUser(input: {
  profile: EvidenceProfile;
  dossier: Dossier;
  fit: FitAnalysis;
  proofTasks: ProofTask[];
  contacts: string[];
}): string {
  return `CANDIDATE PROFILE:
${JSON.stringify(input.profile, null, 2)}

COMPANY DOSSIER:
${JSON.stringify(input.dossier, null, 2)}

FIT ANALYSIS:
${JSON.stringify(input.fit, null, 2)}

PROOF TASKS (use completed ones as evidence; never claim unfinished work):
${JSON.stringify(input.proofTasks, null, 2)}

Known contacts: ${input.contacts.join(", ") || "none provided"}

Return JSON with exactly these fields:
{
  "email": "the email draft",
  "linkedin": "shorter LinkedIn DM draft",
  "x": "shorter X/Twitter DM draft",
  "followUp": "a short follow-up for 5-7 days later",
  "notes": "a single string, one action per line, telling the candidate exactly what to fill in before sending"
}`;
}

export const QUALITY_SYSTEM = `You are a brutal application reviewer who has personally rejected thousands of applications.
Score the outreach draft 0-100 and flag anything a busy founder would reject.
Flag these specifically:
- claims without links
- buzzwords and inflated language ("expert", "advanced", "passionate", "leverage", "synergy", "delve")
- AI-slop (em dashes, "I am writing to express", over-polished rhythm, "in today's fast-paced world")
- generic company praise with no specific reference
- missing proof: no work + context + outcome
- length: email over ~150 words
- placeholders still unfilled
Severity: critical = reject; warning = weakens it; info = polish.
Respond with a single JSON object only.`;

export function qualityUser(input: {
  outreach: OutreachPack;
  dossier: Dossier;
}): string {
  return `COMPANY: ${input.dossier.companyName}
COMPANY ONE-LINER: ${input.dossier.oneLiner}

OUTREACH DRAFT:
${JSON.stringify(input.outreach, null, 2)}

Return JSON with exactly these fields:
{
  "score": 0-100,
  "verdict": "one sentence, honest",
  "flags": [
    { "severity": "critical" | "warning" | "info", "label": "short label", "detail": "what to fix" }
  ]
}`;
}
