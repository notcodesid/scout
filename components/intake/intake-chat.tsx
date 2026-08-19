"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
// Past this the composer scrolls internally, so it can never eat the transcript.
const MAX_COMPOSER_PX = 160;
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
    <nav aria-label="Intake sections">
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
      {/* pre-wrap keeps the line breaks the user actually typed — without it a
          bulleted answer collapses into one run-on paragraph. break-words stops
          a long url or token from forcing the bubble past its max width. */}
      <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-xl border bg-card px-4 py-2.5 text-sm leading-relaxed lowercase shadow-sm">
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
      <span className="flex-1 lowercase">{label}</span>
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
  const [transcript, setTranscript] = useState<{ question: string; display: string }[]>(
    () => initial.turns.map((t) => ({ question: t.question, display: t.display }))
  );
  // Which gap the outstanding question belongs to, and how many times it has
  // been asked. Attempt 2 is always accepted server-side.
  const [attempt, setAttempt] = useState(1);
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
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // Grow the composer with its content instead of scrolling a single line
  // sideways, which hid everything but the tail of a long answer.
  useEffect(() => {
    const el = replyRef.current;
    if (!el) return;

    const resize = () => {
      // Bail while the element has no width. On first commit the layout may not
      // have settled, and an empty textarea reports the *placeholder's* wrapped
      // height — at zero width that is dozens of lines, which pinned the box to
      // its max on load.
      if (!el.offsetWidth) return;
      el.style.height = "auto";
      // The box is border-box, so scrollHeight (content + padding) leaves out
      // the borders. Without adding them back the last line clips.
      const chrome = el.offsetHeight - el.clientHeight;
      el.style.height = `${Math.min(el.scrollHeight + chrome, MAX_COMPOSER_PX)}px`;
    };

    resize();
    // Re-measure once layout has actually happened, and again whenever the
    // available width changes.
    const raf = requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reply]);

  const firstScroll = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The transcript owns its scrolling, so this is a plain assignment on a box
  // whose height is known — no competing with page layout, hydration, or the
  // router, all of which broke the previous document-level approach.
  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      // Opening on an animation from the top looks broken.
      behavior: firstScroll.current ? "auto" : "smooth",
    });
    firstScroll.current = false;
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [transcript.length, thinking, step.question, pending, scrollToLatest]);

  // Content can still settle after the effect (webfont swap, the composer
  // resizing), so re-anchor on any size change rather than trusting one pass.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => scrollToLatest());
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [scrollToLatest]);

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
        attempt,
      });
      // The exchange happened either way, so it stays in the transcript even
      // when the answer was not good enough to save.
      setTranscript((prev) => [...prev, { question: step.question!, display }]);
      setPending(null);
      setPicked([]);
      setSchool({ status: "", month: "", year: "" });
      if (next.followUp) {
        // Same gap, sharper question. Do not advance the section.
        setStep((prev) => ({ ...prev, question: next.followUp! }));
        setAttempt(2);
      } else {
        setStep(next);
        setAttempt(1);
        if (next.done) {
          router.push("/");
          router.refresh();
        }
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

  const answered = transcript;

  return (
    <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 gap-10 overflow-hidden px-4 sm:px-6 lg:grid-cols-[12rem_minmax(0,40rem)_12rem]">
      <div className="hidden pt-12 lg:block">
        <Sidebar
          activeSection={step.activeSection}
          answeredSections={step.answeredSections}
        />
      </div>

      {/* min-h-0 is what lets the scroll area actually shrink inside a grid
          row; without it the column grows and the page scrolls again. */}
      <div className="flex min-h-0 min-w-0 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-12">
          <div className="space-y-8">
          {answered.map((t, i) => (
            <div key={`${i}-${t.question}`} className="space-y-4">
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
                        submit <CornerDownLeft className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step.widget === "school" ? (
                <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">where are you at with school?</p>
                    <div className="flex flex-wrap gap-2">
                      {SCHOOL_STATUS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSchool((v) => ({ ...v, status: s }))}
                          className={cn(
                            "rounded-md border px-3.5 py-2 text-sm lowercase transition-colors",
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
                        ? "when did you graduate?"
                        : "when do you graduate?"}
                    </p>
                    <div className="flex gap-2">
                      <select
                        aria-label="Month"
                        value={school.month}
                        onChange={(e) => setSchool((v) => ({ ...v, month: e.target.value }))}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">month</option>
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
                        <option value="">year</option>
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
                      next <CornerDownLeft className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {thinking ? (
            <p className="animate-pulse text-sm text-muted-foreground">thinking…</p>
          ) : null}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          </div>
        </div>

        {/* In normal flow under the scroll area, so nothing can ever be hidden
            behind it and no padding or scroll-margin compensation is needed. */}
        <form
          className="flex shrink-0 items-end gap-2 pb-6 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (reply.trim()) void submit(reply.trim());
          }}
        >
          <div className="relative flex-1">
            <textarea
              ref={replyRef}
              rows={1}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter breaks the line — the convention
                // every chat input follows.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (reply.trim() && !thinking && !step.done) void submit(reply.trim());
                }
              }}
              placeholder={step.placeholder || "type your reply..."}
              disabled={thinking || step.done}
              // rounded-3xl reads as a pill on one line and as a rounded box
              // once it grows, so it never looks like a stretched capsule.
              className="block max-h-40 w-full resize-none overflow-y-auto rounded-3xl border bg-card py-3.5 pl-6 pr-14 text-sm leading-6 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send reply"
              disabled={thinking || step.done}
              className="absolute bottom-1.5 right-2 flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-40"
            >
              {thinking ? <Square className="size-3.5" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </form>
      </div>

      {/* Mirrors the sidebar so the conversation column lands on the page
          centre line. */}
      <div aria-hidden className="hidden lg:block" />
    </div>
  );
}
