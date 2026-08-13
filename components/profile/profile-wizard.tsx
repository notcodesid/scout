"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
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
              onEdit={(index) => goTo(index)}
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
  onEdit,
}: {
  profile: EvidenceProfile;
  doneCount: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: (index: number) => void;
}) {
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
          Everything you entered, in one place. Jump back to any section to fix something,
          then finish when it feels right.
        </p>
      </div>

      <div className="space-y-4">
        <ReviewSection
          index={0}
          title="Basics"
          done={stepDone(profile, "basics")}
          onEdit={onEdit}
        >
          <ReviewGrid>
            <ReviewRow label="Name" value={profile.name} />
            <ReviewRow label="Headline" value={profile.headline} />
            <ReviewRow label="About" value={profile.about} full />
            <ReviewRow label="Email" value={profile.email} />
            <ReviewRow label="Phone" value={profile.phone} />
            <ReviewRow label="Location" value={profile.location} />
            <ReviewRow label="Timezone" value={profile.timezone} />
          </ReviewGrid>
        </ReviewSection>

        <ReviewSection
          index={1}
          title="Position"
          done={stepDone(profile, "position")}
          onEdit={onEdit}
        >
          <ReviewGrid>
            <ReviewRow label="GitHub" value={profile.githubUsername} />
            <ReviewRow label="Target roles" value={profile.targetRoles.join(", ")} />
            <ReviewRow label="Availability" value={profile.availability} />
            <ReviewRow
              label="Work mode"
              value={[
                profile.remote ? "Remote" : "",
                profile.openToRelocate ? "Open to relocation" : "",
              ]
                .filter(Boolean)
                .join(" · ") || "Not specified"}
            />
          </ReviewGrid>
        </ReviewSection>

        <ReviewSection
          index={2}
          title="Links"
          done={stepDone(profile, "links")}
          onEdit={onEdit}
        >
          {profile.links.length === 0 ? (
            <ReviewEmpty text="No links yet." />
          ) : (
            <ul className="space-y-1.5">
              {profile.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 font-medium text-muted-foreground">
                    {link.label || "Link"}
                  </span>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary underline underline-offset-2"
                    >
                      {link.url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No URL</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>

        <ReviewSection
          index={3}
          title="Skills"
          done={stepDone(profile, "skills")}
          onEdit={onEdit}
        >
          {profile.skills.length === 0 ? (
            <ReviewEmpty text="No skills yet." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {skill.name}
                  {skill.years > 0 ? (
                    <span className="text-muted-foreground">{skill.years}y</span>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </ReviewSection>

        <ReviewSection
          index={4}
          title="Projects"
          done={stepDone(profile, "projects")}
          onEdit={onEdit}
        >
          {profile.projects.length === 0 ? (
            <ReviewEmpty text="No projects yet. This is your strongest signal." />
          ) : (
            <div className="space-y-4">
              {profile.projects.map((project, i) => (
                <div key={project.id} className="rounded-lg border p-4">
                  <p className="font-medium">{project.name || `Project ${i + 1}`}</p>
                  <ReviewGrid className="mt-3">
                    <ReviewRow label="Problem" value={project.problem} full />
                    <ReviewRow label="Work" value={project.work} full />
                    <ReviewRow label="Outcome" value={project.outcome} full />
                    <ReviewRow label="Did anyone care?" value={project.users} full />
                    <ReviewRow label="Links" value={project.links.join(", ")} full />
                    <ReviewRow label="Tags" value={project.tags.join(", ")} />
                    <ReviewRow
                      label="Dates"
                      value={[project.startDate, project.endDate].filter(Boolean).join(" → ")}
                    />
                  </ReviewGrid>
                </div>
              ))}
            </div>
          )}
        </ReviewSection>

        <ReviewSection
          index={5}
          title="Experience"
          done={stepDone(profile, "experience")}
          onEdit={onEdit}
        >
          {profile.experience.length === 0 ? (
            <ReviewEmpty text="No experience yet." />
          ) : (
            <div className="space-y-4">
              {profile.experience.map((exp, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="font-medium">{exp.role || "Role"}</p>
                    {exp.company ? (
                      <p className="text-sm text-muted-foreground">@ {exp.company}</p>
                    ) : null}
                    {[exp.startDate, exp.current ? "present" : exp.endDate]
                      .filter(Boolean)
                      .join(" → ") ? (
                      <p className="ml-auto text-xs text-muted-foreground">
                        {[exp.startDate, exp.current ? "present" : exp.endDate]
                          .filter(Boolean)
                          .join(" → ")}
                      </p>
                    ) : null}
                  </div>
                  {exp.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{exp.summary}</p>
                  ) : null}
                  {exp.bullets.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {exp.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </ReviewSection>

        <ReviewSection
          index={6}
          title="Education"
          done={stepDone(profile, "education")}
          onEdit={onEdit}
        >
          {profile.education.length === 0 ? (
            <ReviewEmpty text="No education yet." />
          ) : (
            <div className="space-y-4">
              {profile.education.map((edu, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <p className="font-medium">{edu.school || "School"}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[edu.degree, edu.field].filter(Boolean).join(", ")}
                  </p>
                  {[edu.startDate, edu.endDate].filter(Boolean).join(" → ") ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[edu.startDate, edu.endDate].filter(Boolean).join(" → ")}
                    </p>
                  ) : null}
                  {edu.notes ? (
                    <p className="mt-2 text-sm text-muted-foreground">{edu.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </ReviewSection>
      </div>
    </div>
  );
}

function ReviewSection({
  index,
  title,
  done,
  onEdit,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  onEdit: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
              done
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {done ? <Check className="size-3" /> : index + 1}
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onEdit(index)}>
          Edit
        </Button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ReviewGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>{children}</div>;
}

function ReviewRow({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm">
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

function ReviewEmpty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
