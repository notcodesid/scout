"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { saveProfileAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScout } from "@/lib/store";
import type { EvidenceProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BasicsFields,
  EducationFields,
  ExperienceFields,
  LinksFields,
  PositioningFields,
  ProjectsFields,
  SkillsFields,
} from "./sections";

const STEPS = [
  {
    id: "basics",
    title: "Basics",
    description: "Who you are, in two minutes.",
  },
  {
    id: "position",
    title: "Position",
    description: "What you're looking for, and where.",
  },
  {
    id: "links",
    title: "Links",
    description: "Where an evaluator can click.",
  },
  {
    id: "skills",
    title: "Skills",
    description: "What you actually work in.",
  },
  {
    id: "projects",
    title: "Projects",
    description: "Proof: work + context + outcome + did anyone care.",
  },
  {
    id: "experience",
    title: "Experience",
    description: "What you've shipped professionally.",
  },
  {
    id: "education",
    title: "Education",
    description: "One line in outreach, nothing more.",
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];
const REVIEW_INDEX = STEPS.length;

function emptyProfile(): EvidenceProfile {
  return {
    id: undefined,
    name: "",
    headline: "",
    about: "",
    location: "",
    email: "",
    phone: "",
    timezone: "",
    githubUsername: "",
    availability: "",
    remote: false,
    openToRelocate: false,
    targetRoles: [],
    links: [],
    skills: [],
    projects: [],
    education: [],
    experience: [],
  };
}

function stepDone(profile: EvidenceProfile, id: StepId): boolean {
  switch (id) {
    case "basics":
      return Boolean(profile.name.trim() && profile.headline.trim());
    case "position":
      return Boolean(profile.targetRoles.length > 0 || profile.githubUsername.trim());
    case "links":
      return profile.links.length > 0;
    case "skills":
      return profile.skills.length > 0;
    case "projects":
      return profile.projects.length > 0;
    case "experience":
      return profile.experience.length > 0;
    case "education":
      return profile.education.length > 0;
  }
}

function firstIncomplete(profile: EvidenceProfile): number {
  const idx = STEPS.findIndex((s) => !stepDone(profile, s.id));
  return idx === -1 ? REVIEW_INDEX : idx;
}

export function ProfileWizard({ initialProfile }: { initialProfile: EvidenceProfile }) {
  const { updateProfile } = useScout();
  const [profile, setProfile] = useState<EvidenceProfile>(() => ({
    ...emptyProfile(),
    ...initialProfile,
  }));
  const [stepIndex, setStepIndex] = useState<number>(() => firstIncomplete(initialProfile));
  const [maxVisited, setMaxVisited] = useState<number>(() => firstIncomplete(initialProfile));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [targetRolesText, setTargetRolesText] = useState(
    initialProfile.targetRoles.join(", ")
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    updateProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  function patch(p: Partial<EvidenceProfile>) {
    setProfile((prev) => ({ ...prev, ...p }));
    setDirty(true);
  }

  async function persist(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const saved = await saveProfileAction(profile);
      setProfile(saved);
      updateProfile(saved);
      setDirty(false);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
      return true;
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Save failed. Is Postgres running?"
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function goTo(index: number) {
    if (index === stepIndex || index < 0 || index > REVIEW_INDEX) return;
    if (dirty) {
      const ok = await persist();
      if (!ok) return;
    }
    setStepIndex(index);
    setMaxVisited((prev) => Math.max(prev, index));
  }

  async function finish() {
    const ok = await persist();
    if (ok) setFinished(true);
  }

  const doneCount = STEPS.filter((s) => stepDone(profile, s.id)).length;
  const progress = Math.round((doneCount / STEPS.length) * 100);
  const step = STEPS[stepIndex];
  const isReview = stepIndex === REVIEW_INDEX;

  if (finished) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Profile saved</h1>
          <p className="text-sm text-muted-foreground">
            Your evidence profile is in Postgres and ready to be matched against companies.
            You can come back and improve it anytime.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Add your first company
          </Link>
          <Button variant="outline" onClick={() => setFinished(false)}>
            Edit profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Build your evidence profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One step at a time. Every application you send later will draw from this.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Saved
            </span>
          ) : null}
          {status === "error" ? (
            <span className="max-w-xs text-sm text-destructive">{error}</span>
          ) : null}
          <span className="text-sm text-muted-foreground">{doneCount}/{STEPS.length} complete</span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <nav
        aria-label="Profile steps"
        className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1"
      >
        {STEPS.map((s, i) => {
          const done = stepDone(profile, s.id);
          const active = i === stepIndex;
          const reachable = i <= maxVisited;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!reachable}
              onClick={() => goTo(i)}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
                !reachable && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden truncate sm:inline">{s.title}</span>
            </button>
          );
        })}
        <button
          type="button"
          disabled={!isReview && maxVisited < REVIEW_INDEX}
          onClick={() => goTo(REVIEW_INDEX)}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors",
            isReview
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50",
            !isReview && maxVisited < REVIEW_INDEX && "cursor-not-allowed opacity-40 hover:bg-transparent"
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
              isReview ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}
          >
            {STEPS.length + 1}
          </span>
          <span className="hidden sm:inline">Review</span>
        </button>
      </nav>

      <Card>
        <CardContent className="pt-6">
          {isReview ? (
            <ReviewContent
              profile={profile}
              doneCount={doneCount}
              headingRef={headingRef}
            />
          ) : (
            <div key={stepIndex} className="animate-step-in space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight focus:outline-none">
                  {step.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
              <StepBody
                stepId={step.id}
                profile={profile}
                patch={patch}
                targetRolesText={targetRolesText}
                setTargetRolesText={setTargetRolesText}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0 || saving}
        >
          <ArrowLeft /> Back
        </Button>
        {isReview ? (
          <Button onClick={finish} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {saving ? "Saving..." : "Finish"}
          </Button>
        ) : (
          <Button onClick={() => goTo(stepIndex + 1)} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            {saving ? "Saving..." : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepBody({
  stepId,
  profile,
  patch,
  targetRolesText,
  setTargetRolesText,
}: {
  stepId: StepId;
  profile: EvidenceProfile;
  patch: (p: Partial<EvidenceProfile>) => void;
  targetRolesText: string;
  setTargetRolesText: (v: string) => void;
}) {
  switch (stepId) {
    case "basics":
      return <BasicsFields profile={profile} patch={patch} />;
    case "position":
      return (
        <PositioningFields
          profile={profile}
          patch={patch}
          targetRolesText={targetRolesText}
          onTargetRolesText={(v) => {
            setTargetRolesText(v);
            patch({
              targetRoles: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            });
          }}
        />
      );
    case "links":
      return <LinksFields links={profile.links} onChange={(links) => patch({ links })} />;
    case "skills":
      return <SkillsFields skills={profile.skills} onChange={(skills) => patch({ skills })} />;
    case "projects":
      return (
        <ProjectsFields projects={profile.projects} onChange={(projects) => patch({ projects })} />
      );
    case "experience":
      return (
        <ExperienceFields
          experience={profile.experience}
          onChange={(experience) => patch({ experience })}
        />
      );
    case "education":
      return (
        <EducationFields
          education={profile.education}
          onChange={(education) => patch({ education })}
        />
      );
  }
}

function ReviewContent({
  profile,
  doneCount,
  headingRef,
}: {
  profile: EvidenceProfile;
  doneCount: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const hints: Record<StepId, string> = {
    basics: "Add your name and a one-line headline.",
    position: "GitHub is your real resume. Add it or your target roles.",
    links: "Add at least one link an evaluator can click.",
    skills: "List what you actually work in.",
    projects: "The strongest signal. Add a real project with work + context + outcome.",
    experience: "What have you shipped professionally?",
    education: "One line in outreach, nothing more.",
  };

  return (
    <div className="animate-step-in space-y-5">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight focus:outline-none"
        >
          Review your profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {doneCount === STEPS.length
            ? "Everything looks complete. Finish to save and start matching companies."
            : `${doneCount} of ${STEPS.length} sections complete. You can finish now and improve later.`}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        {STEPS.map((s, i) => {
          const done = stepDone(profile, s.id);
          const value =
            s.id === "basics"
              ? profile.headline || profile.name
              : s.id === "position"
                ? profile.targetRoles.join(", ") || profile.githubUsername || "Not set"
                : s.id === "links"
                  ? profile.links.map((l) => l.label || l.url).filter(Boolean).join(", ") || "No links"
                  : s.id === "skills"
                    ? profile.skills.map((sk) => `${sk.name}${sk.years ? ` · ${sk.years}y` : ""}`).join(", ") || "No skills"
                    : s.id === "projects"
                      ? profile.projects.map((p) => p.name).filter(Boolean).join(", ") || "No projects"
                      : s.id === "experience"
                        ? profile.experience.map((x) => `${x.role} @ ${x.company}`).filter(Boolean).join(", ") || "No experience"
                        : profile.education.map((e) => `${e.degree} @ ${e.school}`).filter(Boolean).join(", ") || "No education";
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-start gap-3 border-b px-4 py-3 last:border-0",
                !done && "bg-amber-600/5"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="truncate text-sm text-muted-foreground">{done ? value : hints[s.id]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
