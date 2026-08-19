// Shared, dependency-free spec for the conversational intake.
//
// The questions are not a fixed list: lib/intake.ts derives them from what the
// evidence profile is still missing after the resume pass, so the conversation
// only covers real gaps. What stays fixed is the shape — sections, widget kinds,
// and option lists — so the model writes wording and nothing else. That split
// keeps the flow terminating and stops it inventing options the profile cannot
// store. Sections mirror the /profile wizard's steps.

export type WidgetKind = "single" | "multi" | "school" | "text";

/** One outstanding question, derived from what the profile is still missing. */
export interface Gap {
  id: string;
  section: string;
  widget: WidgetKind;
  /** Wording used when no AI key is configured. */
  fallbackQuestion: string;
  /** What this question is trying to establish, sent to the phrasing model. */
  intent: string;
  /** Extra grounding for the model, e.g. the project it refers to. */
  context?: string;
  options?: string[];
  placeholder?: string;
}

export interface SectionSpec {
  id: string;
  label: string;
}

export const SECTIONS: SectionSpec[] = [
  { id: "basics", label: "basics" },
  { id: "position", label: "position" },
  { id: "skills", label: "skills" },
  { id: "projects", label: "projects" },
  { id: "experience", label: "experience" },
  { id: "wrap-up", label: "wrap up" },
];

// Hotkeys mirror builders.cv: digits first, then a QWERTY run once 1-9 is spent.
const HOTKEYS = "123456789QWERTYUIOP".split("");
export function hotkeyFor(index: number): string | undefined {
  return HOTKEYS[index];
}

/** Serialisable view of the conversation handed to the client component. */
export interface IntakeStep {
  turns: {
    field: string;
    section: string;
    question: string;
    value: unknown;
    display: string;
  }[];
  question: string | null;
  field: string | null;
  section: string | null;
  widget: string | null;
  options: string[] | null;
  placeholder: string | null;
  done: boolean;
  activeSection: string;
  answeredSections: string[];
}
