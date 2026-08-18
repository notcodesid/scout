"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, CornerDownLeft, Square } from "lucide-react";
import { answerIntakeAction } from "@/app/onboarding/intake/actions";
import type { IntakeStep } from "@/lib/intake-spec";
import { Button } from "@/components/ui/button";
import { SECTIONS, hotkeyFor } from "@/lib/intake-spec";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SCHOOL_STATUS = ["I'm a student", "Currently on leave", "Already graduated"];

function years(): string[] {
  // No Date.now() at module scope — this runs client-side on mount only.
  const now = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => String(now + 4 - i));
}

/** Turns a structured answer into the sentence shown in the chat bubble. */
function displayFor(field: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (field === "school" && value && typeof value === "object") {
    const v = value as { status?: string; month?: string; year?: string };
    const when = [v.month, v.year].filter(Boolean).join(" ");
    if (v.status === "Already graduated") {
      return when ? `I already graduated in ${when}.` : "I already graduated.";
    }
    if (v.status === "Currently on leave") {
      return when ? `I'm on leave, graduating ${when}.` : "I'm currently on leave.";
    }
    return when ? `I'm a student, graduating ${when}.` : "I'm a student.";
  }
  return String(value ?? "");
}

function Sidebar({
  activeSection,
  answeredSections,
}: {
  activeSection: string;
  answeredSections: string[];
}) {
  const activeIdx = SECTIONS.findIndex((s) => s.id === activeSection);
  return (
    <nav
      className="sticky top-24 hidden self-start lg:block"
      aria-label="Intake sections"
    >
      <ol className="space-y-3 font-mono text-sm">
        {SECTIONS.map((s, i) => {
          const done = answeredSections.includes(s.id);
          const active = s.id === activeSection;
          // Distance from the current section drives the blur, so upcoming
          // sections recede the further out they are.
          const distance = Math.abs(i - (activeIdx === -1 ? 0 : activeIdx));
          const blur = active ? 0 : Math.min(distance * 1.1, 3);
          return (
            <li
              key={s.id}
              aria-current={active ? "step" : undefined}
              style={{ filter: blur ? `blur(${blur}px)` : undefined }}
              className={cn(
                "transition-all duration-500",
                active
                  ? "text-foreground"
                  : done
                    ? "text-muted-foreground/70"
                    : "text-muted-foreground/50"
              )}
            >
              {s.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Bubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-xl border bg-card px-4 py-2.5 text-sm shadow-sm">
        {text}
      </div>
    </div>
  );
}

function OptionRow({
  label,
  index,
  selected,
  multi,
  onClick,
  disabled,
}: {
  label: string;
  index: number;
  selected: boolean;
  multi: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const key = hotkeyFor(index);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
        disabled ? "cursor-default" : "hover:bg-accent/60"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border transition-colors",
          multi ? "rounded-[4px]" : "rounded-full",
          selected ? "border-foreground bg-foreground" : "border-muted-foreground/40"
        )}
      >
        {selected ? (
          <span
            className={cn(
              "bg-background",
              multi ? "size-1.5 rounded-[1px]" : "size-1.5 rounded-full"
            )}
          />
        ) : null}
      </span>
      <span className="flex-1">{label}</span>
      {key ? (
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {key}
        </kbd>
      ) : null}
    </button>
  );
}

export function IntakeChat({ initial }: { initial: IntakeStep }) {
  const router = useRouter();
  const [step, setStep] = useState<IntakeStep>(initial);
  const [thinking, setThinking] = useState(false);
  // The turn the user just sent, shown immediately. Without this the message
  // only appears once the next question resolves, so sending felt like nothing
  // happened. Cleared when the server response arrives (and carries it in
  // step.turns) or when the save fails.
  const [pending, setPending] = useState<{ question: string; display: string } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [school, setSchool] = useState({ status: "", month: "", year: "" });
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step.turns.length, thinking, step.question, pending]);

  async function submit(value: unknown) {
    if (!step.field || !step.question || thinking) return;
    const display = displayFor(step.field, value);
    setError("");
    // Echo the answer before the round trip so the transcript reacts instantly.
    setPending({ question: step.question, display });
    setReply("");
    setThinking(true);
    try {
      const next = await answerIntakeAction({
        field: step.field,
        section: step.section ?? "",
        question: step.question,
        value,
        display,
      });
      setStep(next);
      setPending(null);
      setPicked([]);
      setSchool({ status: "", month: "", year: "" });
      if (next.done) {
        router.push("/");
        router.refresh();
      }
    } catch {
      // Nothing was saved, so drop the optimistic turn and put the widget back.
      setPending(null);
      setError("Could not save that answer. Try again.");
    } finally {
      setThinking(false);
    }
  }

  // Keyboard shortcuts, matching the badges on each row.
  useEffect(() => {
    if (!step.options || thinking) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const opts = step.options ?? [];
      const idx = opts.findIndex(
        (_, i) => hotkeyFor(i)?.toLowerCase() === e.key.toLowerCase()
      );
      if (idx !== -1) {
        e.preventDefault();
        if (step.widget === "single") void submit(opts[idx]);
        else
          setPicked((p) =>
            p.includes(opts[idx]) ? p.filter((x) => x !== opts[idx]) : [...p, opts[idx]]
          );
      }
      if (e.key === "Enter" && step.widget === "multi" && picked.length) {
        e.preventDefault();
        void submit(picked);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const answered = step.turns;

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[12rem_minmax(0,40rem)_12rem]">
      <Sidebar
        activeSection={step.activeSection}
        answeredSections={step.answeredSections}
      />

      <div className="min-w-0 pb-44">
        <div className="space-y-8">
          {answered.map((t) => (
            <div key={t.field} className="space-y-4">
              <p className="text-[15px]">{t.question}</p>
              <Bubble text={t.display} />
            </div>
          ))}

          {pending ? (
            <div className="space-y-4">
              <p className="text-[15px]">{pending.question}</p>
              <Bubble text={pending.display} />
            </div>
          ) : null}

          {!pending && step.question && !step.done ? (
            <div className="space-y-4">
              <p className="text-[15px]">{step.question}</p>

              {step.widget === "single" || step.widget === "multi" ? (
                <div className="rounded-xl border bg-card p-2 shadow-sm">
                  {(step.options ?? []).map((o, i) => (
                    <OptionRow
                      key={o}
                      label={o}
                      index={i}
                      multi={step.widget === "multi"}
                      selected={picked.includes(o)}
                      disabled={thinking}
                      onClick={() => {
                        if (step.widget === "single") void submit(o);
                        else
                          setPicked((p) =>
                            p.includes(o) ? p.filter((x) => x !== o) : [...p, o]
                          );
                      }}
                    />
                  ))}
                  {step.widget === "multi" ? (
                    <div className="flex justify-end p-2 pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!picked.length || thinking}
                        onClick={() => void submit(picked)}
                      >
                        Submit <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step.widget === "text" ? (
                <p className="text-sm text-muted-foreground">
                  {step.placeholder || "Type your answer below."}
                </p>
              ) : null}

              {step.widget === "school" ? (
                <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Where are you at with school?</p>
                    <div className="flex flex-wrap gap-2">
                      {SCHOOL_STATUS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSchool((v) => ({ ...v, status: s }))}
                          className={cn(
                            "rounded-md border px-3.5 py-2 text-sm transition-colors",
                            school.status === s
                              ? "border-foreground bg-accent"
                              : "hover:bg-accent/60"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {school.status === "Already graduated"
                        ? "When did you graduate?"
                        : "When do you graduate?"}
                    </p>
                    <div className="flex gap-2">
                      <select
                        aria-label="Month"
                        value={school.month}
                        onChange={(e) => setSchool((v) => ({ ...v, month: e.target.value }))}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Month</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Year"
                        value={school.year}
                        onChange={(e) => setSchool((v) => ({ ...v, year: e.target.value }))}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Year</option>
                        {years().map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!school.status || thinking}
                      onClick={() => void submit(school)}
                    >
                      Next <CornerDownLeft className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {thinking ? (
            <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>
          ) : null}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div ref={endRef} />
      </div>

      {/* Mirrors the sidebar so the conversation column lands on the page
          centre line, in step with the composer below. */}
      <div aria-hidden className="hidden lg:block" />

      {/* Always available: any question can be answered in prose instead. */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background to-transparent pb-6 pt-10">
        <form
          className="mx-auto flex w-full max-w-[40rem] items-center gap-2 px-4 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (reply.trim()) void submit(reply.trim());
          }}
        >
          <div className="relative flex-1">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              disabled={thinking || step.done}
              className="h-13 w-full rounded-full border bg-card py-4 pl-6 pr-14 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send reply"
              disabled={thinking || step.done}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
            >
              {thinking ? <Square className="size-3.5" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
