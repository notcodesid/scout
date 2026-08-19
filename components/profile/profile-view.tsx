"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  FileText,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Pencil,
  Twitter,
} from "lucide-react";
import { saveProfileAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvidenceProfile } from "@/lib/types";
import {
  BasicsFields,
  EducationFields,
  ExperienceFields,
  LinksFields,
  PositioningFields,
  ProjectsFields,
  SkillsFields,
} from "./sections";

type SectionId =
  | "about"
  | "experience"
  | "work"
  | "links"
  | "background"
  | "position";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function dateRange(start: string, end: string, current: boolean): string {
  const to = current ? "Present" : end;
  if (!start && !to) return "";
  return [start, to].filter(Boolean).join(" – ");
}

function iconForLink(label: string, url: string) {
  const k = `${label} ${url}`.toLowerCase();
  if (k.includes("github")) return <Github className="size-4" />;
  if (k.includes("linkedin")) return <Linkedin className="size-4" />;
  if (k.includes("x.com") || k.includes("twitter")) return <Twitter className="size-4" />;
  return <Globe className="size-4" />;
}

/** Muted placeholder so an empty field reads as "nothing here yet", not broken. */
function NotSet() {
  return <span className="text-muted-foreground/50">not set</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-[15px]">{children}</div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-background px-3 py-1 text-sm">{children}</span>
  );
}

export function ProfileView({ initialProfile }: { initialProfile: EvidenceProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState<SectionId | null>(null);
  const [draft, setDraft] = useState<EvidenceProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  // PositioningFields keeps the comma-separated roles input as raw text so a
  // trailing comma mid-typing does not get eaten by the array round trip.
  const [targetRolesText, setTargetRolesText] = useState(
    initialProfile.targetRoles.join(", ")
  );
  const [error, setError] = useState("");

  function begin(id: SectionId) {
    setDraft(profile);
    setTargetRolesText(profile.targetRoles.join(", "));
    setError("");
    setEditing(id);
  }

  function patch(p: Partial<EvidenceProfile>) {
    setDraft((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const saved = await saveProfileAction(draft);
      setProfile(saved);
      setEditing(null);
    } catch {
      setError("could not save. try again.");
    } finally {
      setSaving(false);
    }
  }

  /** A soft panel with a muted label and a pencil that swaps it into edit mode. */
  function Section({
    id,
    label,
    children,
    editor,
  }: {
    id: SectionId;
    label: string;
    children: ReactNode;
    editor: ReactNode;
  }) {
    const active = editing === id;
    return (
      <section
        className={cn(
          "group rounded-2xl p-6 transition-colors",
          active ? "bg-muted/60" : "bg-muted/40"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          {!active ? (
            <button
              type="button"
              onClick={() => begin(id)}
              aria-label={`edit ${label}`}
              className="text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Pencil className="size-4" />
            </button>
          ) : null}
        </div>

        {active ? (
          <div className="space-y-5">
            {editor}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null} save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                cancel
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-16 lowercase">
      {/* Identity */}
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-lg text-muted-foreground">
          {initials(profile.name)}
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">
            {profile.name || "unnamed"}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {profile.headline || <NotSet />}
          </p>
        </div>
      </div>

      <Section
        id="about"
        label="about"
        editor={<BasicsFields profile={draft} patch={patch} />}
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {profile.about || <NotSet />}
        </p>
      </Section>

      <Section
        id="experience"
        label="work experience"
        editor={
          <ExperienceFields
            experience={draft.experience}
            onChange={(experience) => patch({ experience })}
          />
        }
      >
        {profile.experience.length ? (
          <div className="space-y-5">
            {profile.experience.map((x, i) => (
              <div key={`${x.company}-${x.role}-${i}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-[15px]">
                    <span className="font-medium">{x.role}</span>
                    {x.company ? (
                      <span className="text-muted-foreground"> · {x.company}</span>
                    ) : null}
                    {x.current ? (
                      <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs">
                        current
                      </span>
                    ) : null}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {dateRange(x.startDate, x.endDate, x.current)}
                  </p>
                </div>
                {x.summary ? (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {x.summary}
                  </p>
                ) : null}
                {x.bullets.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {x.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/40">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <NotSet />
        )}
      </Section>

      <Section
        id="work"
        label="selected work"
        editor={
          <ProjectsFields
            projects={draft.projects}
            onChange={(projects) => patch({ projects })}
          />
        }
      >
        {profile.projects.length ? (
          <div className="space-y-3">
            {profile.projects.map((p) => (
              <div key={p.id ?? p.name} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {p.links[0] ? (
                      <a
                        href={p.links[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                    {p.links[0] ? <ArrowUpRight className="size-3.5" /> : null}
                  </p>
                  {p.endDate || p.startDate ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {p.endDate || p.startDate}
                    </p>
                  ) : null}
                </div>
                {p.outcome || p.problem ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {p.outcome || p.problem}
                  </p>
                ) : null}
                {p.users ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/60">used by </span>
                    {p.users}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <NotSet />
        )}
      </Section>

      <Section
        id="links"
        label="links"
        editor={
          <LinksFields links={draft.links} onChange={(links) => patch({ links })} />
        }
      >
        {profile.links.length ? (
          <div className="space-y-3">
            {profile.links.map((l, i) => (
              <a
                key={`${l.url}-${i}`}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="group/link flex items-center gap-3"
              >
                <span className="text-muted-foreground">{iconForLink(l.label, l.url)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{l.label}</span>
                  <span className="block truncate text-sm normal-case text-muted-foreground">
                    {l.url}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover/link:text-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <NotSet />
        )}
      </Section>

      <Section
        id="background"
        label="background"
        editor={
          <div className="space-y-6">
            <PositioningFields
              profile={draft}
              patch={patch}
              targetRolesText={targetRolesText}
              onTargetRolesText={(value) => {
                setTargetRolesText(value);
                patch({
                  targetRoles: value.split(",").map((r) => r.trim()).filter(Boolean),
                });
              }}
            />
            <SkillsFields skills={draft.skills} onChange={(skills) => patch({ skills })} />
            <EducationFields
              education={draft.education}
              onChange={(education) => patch({ education })}
            />
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="target roles">
            {profile.targetRoles.length ? profile.targetRoles.join(", ") : <NotSet />}
          </Field>
          <Field label="skills">
            {profile.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Chip key={s.name}>{s.name}</Chip>
                ))}
              </div>
            ) : (
              <NotSet />
            )}
          </Field>
          <Field label="availability">{profile.availability || <NotSet />}</Field>
          <Field label="location">{profile.location || <NotSet />}</Field>
          <Field label="open to relocating">
            {profile.openToRelocate ? "yes" : "no"}
          </Field>
          <Field label="education">
            {profile.education.length ? (
              <div className="space-y-1">
                {profile.education.map((e, i) => (
                  <p key={i}>
                    {[e.degree, e.field, e.school].filter(Boolean).join(" · ")}
                  </p>
                ))}
              </div>
            ) : (
              <NotSet />
            )}
          </Field>
          <Field label="phone">{profile.phone || <NotSet />}</Field>
          <Field label="email">{profile.email || <NotSet />}</Field>
        </div>
      </Section>

      {/* Résumé is read-only here: re-uploading belongs to onboarding, which
          owns parsing, and only the filename and extracted text are kept. */}
      <section className="rounded-2xl bg-muted/40 p-6">
        <p className="mb-4 text-sm text-muted-foreground">résumé</p>
        {profile.resumeFileName ? (
          <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm">
              {profile.resumeFileName}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {profile.resumeText.length.toLocaleString()} chars parsed
            </span>
          </div>
        ) : (
          <NotSet />
        )}
      </section>

      {profile.updatedAt ? (
        <p className="pt-2 text-right font-mono text-xs text-muted-foreground/70">
          last updated {new Date(profile.updatedAt).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}
