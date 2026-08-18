import { nextIntakeQuestionServer } from "./ai";
import { prisma } from "./prisma";
import { SECTIONS, type Gap, type IntakeStep } from "./intake-spec";
import { getProfile } from "./profile";
import type { EvidenceProfile } from "./types";

const SINGLETON_ID = "me";

const blank = (v: string | undefined | null) => !v || !v.trim();

// The questions the /profile wizard asks, minus everything the resume already
// answered. Order matters: it is the order the conversation walks in.
export function computeGaps(profile: EvidenceProfile): Gap[] {
  const gaps: Gap[] = [];

  // --- Basics -------------------------------------------------------------
  if (blank(profile.headline)) {
    gaps.push({
      id: "user:headline",
      section: "basics",
      widget: "text",
      intent: "a one-line description of who they are professionally",
      fallbackQuestion: "How would you describe yourself in one line?",
      placeholder: "Backend engineer building developer tools",
    });
  }
  if (blank(profile.about)) {
    gaps.push({
      id: "user:about",
      section: "basics",
      widget: "text",
      intent: "a short paragraph of background, in their own voice",
      fallbackQuestion: "Give me a couple of sentences on your background.",
      placeholder: "What you work on, what you're good at, what you're drawn to",
    });
  }
  if (blank(profile.location)) {
    gaps.push({
      id: "user:location",
      section: "basics",
      widget: "text",
      intent: "where they are based",
      fallbackQuestion: "Where are you based?",
      placeholder: "San Francisco, CA",
    });
  }

  // --- Position -----------------------------------------------------------
  if (!profile.targetRoles.length) {
    gaps.push({
      id: "user:targetRoles",
      section: "position",
      widget: "text",
      intent: "the role titles they are targeting",
      fallbackQuestion: "What roles are you going after?",
      placeholder: "Backend engineer, infrastructure engineer",
    });
  }
  if (blank(profile.availability)) {
    gaps.push({
      id: "user:availability",
      section: "position",
      widget: "single",
      intent: "how soon they could start",
      fallbackQuestion: "When could you start?",
      options: ["Immediately", "Within a month", "1-3 months", "3+ months"],
    });
  }
  gaps.push({
    id: "user:remote",
    section: "position",
    widget: "single",
    intent: "whether they want remote, hybrid, or on-site work",
    fallbackQuestion: "What working setup are you after?",
    options: ["Remote", "Hybrid", "On-site", "No preference"],
  });
  gaps.push({
    id: "user:openToRelocate",
    section: "position",
    widget: "single",
    intent: "whether they would relocate for the right role",
    fallbackQuestion: "Would you relocate for the right role?",
    options: ["Yes", "No", "Depends on the role"],
  });

  // --- Skills -------------------------------------------------------------
  if (!profile.skills.length) {
    gaps.push({
      id: "user:skills",
      section: "skills",
      widget: "text",
      intent: "the technologies and named capabilities they actually work in",
      fallbackQuestion: "What do you actually work in day to day?",
      placeholder: "Go, PostgreSQL, Kubernetes, Terraform",
    });
  }

  // --- Projects -----------------------------------------------------------
  // This is the point of the whole conversation. A resume states what someone
  // built; it almost never states whether anyone used it, and Scout's fit and
  // outreach stages lean on exactly that.
  for (const p of profile.projects) {
    if (blank(p.outcome)) {
      gaps.push({
        id: `project:${p.id}:outcome`,
        section: "projects",
        widget: "text",
        intent: `the visible result of the project "${p.name}" — numbers if there are any`,
        context: `Project "${p.name}": ${p.problem || p.work}`.slice(0, 300),
        fallbackQuestion: `What came out of ${p.name}?`,
        placeholder: "Numbers if you have them, honest description if you don't",
      });
    }
    if (blank(p.users)) {
      gaps.push({
        id: `project:${p.id}:users`,
        section: "projects",
        widget: "text",
        intent: `whether real people used "${p.name}" — who they were, what they said, or an honest "nobody yet"`,
        context:
          `Project "${p.name}": ${p.problem || p.work}. Outcome on file: ${p.outcome || "none"}`.slice(0, 300),
        fallbackQuestion: `Did anyone actually use ${p.name}?`,
        placeholder: "Who used it and what they said — or 'nobody yet', which is a fine answer",
      });
    }
  }

  // --- Experience ---------------------------------------------------------
  for (const x of profile.experience) {
    if (blank(x.summary) && !x.bullets.length) {
      gaps.push({
        id: `experience:${x.company}:${x.role}:summary`,
        section: "experience",
        widget: "text",
        intent: `what they actually did as ${x.role} at ${x.company}`,
        context: `Role: ${x.role} at ${x.company}`,
        fallbackQuestion: `What did you actually do at ${x.company}?`,
        placeholder: "One or two sentences",
      });
    }
  }

  // --- Wrap up ------------------------------------------------------------
  gaps.push({
    id: "user:wrapUp",
    section: "wrap-up",
    widget: "text",
    intent: "anything else worth knowing before matching them to companies",
    fallbackQuestion: "Anything else worth knowing before we start matching you?",
    placeholder: "Constraints, visa status, teams you'd love to work with...",
  });

  return gaps;
}

export interface IntakeTurn {
  field: string;
  section: string;
  question: string;
  value: unknown;
  display: string;
}

export interface IntakeState {
  turns: IntakeTurn[];
  current: { gap: Gap; question: string } | null;
  done: boolean;
  activeSection: string;
  answeredSections: string[];
}

export async function getIntakeTurns(): Promise<IntakeTurn[]> {
  const rows = await prisma.intakeAnswer.findMany({
    where: { userId: SINGLETON_ID },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    field: r.field,
    section: r.section,
    question: r.question,
    value: r.value,
    display: r.display,
  }));
}

export async function isIntakeDone(): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: SINGLETON_ID },
    select: { intakeDoneAt: true },
  });
  return Boolean(u?.intakeDoneAt);
}

export async function getIntakeState(): Promise<IntakeState> {
  const profile = await getProfile();
  const turns = await getIntakeTurns();
  // Answered ids are tracked separately from profile state so a deliberately
  // empty answer ("nobody used it yet") still closes its question instead of
  // being re-asked forever.
  const answered = new Set(turns.map((t) => t.field));
  const gaps = computeGaps(profile).filter((g) => !answered.has(g.id));

  const sectionsWithGaps = new Set(gaps.map((g) => g.section));
  const answeredSections = SECTIONS.filter((s) => !sectionsWithGaps.has(s.id)).map(
    (s) => s.id
  );

  if (!gaps.length) {
    return {
      turns,
      current: null,
      done: true,
      activeSection: SECTIONS[SECTIONS.length - 1].id,
      answeredSections: SECTIONS.map((s) => s.id),
    };
  }

  const gap = gaps[0];
  const question = await nextIntakeQuestionServer({
    fieldId: gap.id,
    intent: gap.intent + (gap.context ? ` (context: ${gap.context})` : ""),
    sectionLabel: SECTIONS.find((s) => s.id === gap.section)?.label ?? gap.section,
    isFirst: turns.length === 0,
    // Cadence is decided here, not by the model: asked to self-ration, it
    // acknowledged every single turn and settled on one stock phrase.
    acknowledge: turns.length > 0 && turns.length % 3 === 1,
    answers: turns.map((t) => ({ question: t.question, answer: t.display })),
    profileName: profile.name,
    fallbackQuestion: gap.fallbackQuestion,
  });

  return { turns, current: { gap, question }, done: false, activeSection: gap.section, answeredSections };
}

// Writes the answer straight into the evidence profile, so /profile shows it
// immediately and the rest of Scout reads it without knowing the intake exists.
async function applyToProfile(gapId: string, value: unknown): Promise<void> {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!text) return;

  // Ids are "kind:...:field" with a variable number of middle segments, so read
  // the field off the end rather than by fixed position.
  const parts = gapId.split(":");
  const kind = parts[0];
  const field = parts[parts.length - 1];
  const a = parts[1];

  if (kind === "user") {
    const map: Record<string, object> = {
      headline: { headline: text },
      about: { about: text },
      location: { location: text },
      availability: { availability: text },
      targetRoles: { targetRoles: text.split(",").map((s) => s.trim()).filter(Boolean) },
      remote: { remote: text === "Remote" || text === "Hybrid" },
      openToRelocate: { openToRelocate: text === "Yes" || text === "Depends on the role" },
      wrapUp: { lookingFor: text },
    };
    const data = map[field];
    if (data) await prisma.user.update({ where: { id: SINGLETON_ID }, data });

    if (field === "skills") {
      const names = text.split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length) {
        await prisma.skill.createMany({
          data: names.map((name, i) => ({ userId: SINGLETON_ID, name, sortOrder: i })),
          skipDuplicates: true,
        });
      }
    }
    return;
  }

  if (kind === "project") {
    const data = field === "users" ? { users: text } : { outcome: text };
    await prisma.project.updateMany({ where: { id: a, userId: SINGLETON_ID }, data });
    return;
  }

  if (kind === "experience") {
    const role = parts.slice(2, -1).join(":");
    await prisma.experience.updateMany({
      where: { userId: SINGLETON_ID, company: a, role },
      data: { summary: text },
    });
  }
}

export async function saveIntakeAnswer(input: {
  field: string;
  section: string;
  question: string;
  value: unknown;
  display: string;
}): Promise<void> {
  const count = await prisma.intakeAnswer.count({ where: { userId: SINGLETON_ID } });
  await prisma.intakeAnswer.upsert({
    where: { userId_field: { userId: SINGLETON_ID, field: input.field } },
    create: {
      userId: SINGLETON_ID,
      field: input.field,
      section: input.section,
      question: input.question,
      value: input.value as object,
      display: input.display,
      sortOrder: count,
    },
    update: { question: input.question, value: input.value as object, display: input.display },
  });
  await applyToProfile(input.field, input.value);
}

export async function completeIntake(): Promise<void> {
  await prisma.user.update({
    where: { id: SINGLETON_ID },
    data: { intakeDoneAt: new Date() },
  });
}

export async function resetIntake(): Promise<void> {
  await prisma.$transaction([
    prisma.intakeAnswer.deleteMany({ where: { userId: SINGLETON_ID } }),
    prisma.user.update({ where: { id: SINGLETON_ID }, data: { intakeDoneAt: null } }),
  ]);
}

export function toStep(state: IntakeState): IntakeStep {
  return {
    turns: state.turns,
    question: state.current?.question ?? null,
    field: state.current?.gap.id ?? null,
    section: state.current?.gap.section ?? null,
    widget: state.current?.gap.widget ?? null,
    options: state.current?.gap.options ?? null,
    placeholder: state.current?.gap.placeholder ?? null,
    done: state.done,
    activeSection: state.activeSection,
    answeredSections: state.answeredSections,
  };
}
