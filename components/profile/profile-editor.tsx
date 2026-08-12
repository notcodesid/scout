"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Link2,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { saveProfileAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useScout } from "@/lib/store";
import type {
  EvidenceProfile,
  ProfileEducation,
  ProfileExperience,
  ProfileLink,
  ProfileSkill,
  Project,
} from "@/lib/types";

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

const AVAILABILITY_OPTIONS = [
  "",
  "immediately",
  "2 weeks",
  "1 month",
  "3 months",
  "in a notice period",
];

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function commaText(values: string[]): string {
  return values.join(", ");
}

function parseComma(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfileEditor({ initialProfile }: { initialProfile: EvidenceProfile }) {
  const { updateProfile } = useScout();
  const [profile, setProfile] = useState<EvidenceProfile>(() => ({
    ...emptyProfile(),
    ...initialProfile,
  }));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [targetRolesText, setTargetRolesText] = useState(commaText(profile.targetRoles));

  // Keep the localStorage mirror in sync so the AI stages always use fresh data.
  useEffect(() => {
    updateProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(p: Partial<EvidenceProfile>) {
    setProfile((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const saved = await saveProfileAction(profile);
      setProfile(saved);
      updateProfile(saved);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Save failed. Is Postgres running?");
    }
  }

  function commitTargetRoles(value: string) {
    setTargetRolesText(value);
    patch({ targetRoles: parseComma(value) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evidence profile</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The raw material every application draws from. Every project should answer: work +
            context + outcome, and did anyone actually care?
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
          <Button onClick={save} disabled={status === "saving"}>
            {status === "saving" ? <Loader2 className="animate-spin" /> : <Save />}
            {status === "saving" ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>

      <Basics profile={profile} patch={patch} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positioning</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="GitHub username"
            htmlFor="p-github"
            hint="Your GitHub is your real resume. We'll use this for evidence checks."
          >
            <Input
              id="p-github"
              value={profile.githubUsername}
              onChange={(e) => patch({ githubUsername: e.target.value })}
              placeholder="your-github-handle"
              autoComplete="off"
            />
          </Field>
          <Field label="Availability" htmlFor="p-availability">
            <select
              id="p-availability"
              value={profile.availability}
              onChange={(e) => patch({ availability: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "Select availability"}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Target roles (comma separated)"
            htmlFor="p-roles"
            className="sm:col-span-2"
          >
            <Input
              id="p-roles"
              value={targetRolesText}
              onChange={(e) => commitTargetRoles(e.target.value)}
              placeholder="Full-stack engineer, Frontend engineer"
            />
          </Field>
          <div className="space-y-3 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={profile.remote}
                onChange={(e) => patch({ remote: e.target.checked })}
                className="size-4 accent-foreground"
              />
              <span className="text-sm">Open to remote</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={profile.openToRelocate}
                onChange={(e) => patch({ openToRelocate: e.target.checked })}
                className="size-4 accent-foreground"
              />
              <span className="text-sm">Open to relocating</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <LinksEditor links={profile.links} onChange={(links) => patch({ links })} />
      <SkillsEditor skills={profile.skills} onChange={(skills) => patch({ skills })} />
      <ProjectsEditor projects={profile.projects} onChange={(projects) => patch({ projects })} />
      <ExperienceEditor
        experience={profile.experience}
        onChange={(experience) => patch({ experience })}
      />
      <EducationEditor
        education={profile.education}
        onChange={(education) => patch({ education })}
      />
    </div>
  );
}

function Basics({
  profile,
  patch,
}: {
  profile: EvidenceProfile;
  patch: (p: Partial<EvidenceProfile>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Basics</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="p-name">
          <Input
            id="p-name"
            value={profile.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="name"
          />
        </Field>
        <Field label="Headline" htmlFor="p-headline">
          <Input
            id="p-headline"
            value={profile.headline}
            onChange={(e) => patch({ headline: e.target.value })}
            placeholder="Full-stack developer who ships for real users"
          />
        </Field>
        <Field
          label="About"
          htmlFor="p-about"
          className="sm:col-span-2"
          hint="Short background: what you've shipped, what you care about. Two or three lines."
        >
          <Textarea
            id="p-about"
            value={profile.about}
            onChange={(e) => patch({ about: e.target.value })}
            placeholder="Studied CS, spent two years building data infrastructure, now shipping side projects used by real people..."
          />
        </Field>
        <Field label="Email" htmlFor="p-email">
          <Input
            id="p-email"
            type="email"
            value={profile.email}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Phone" htmlFor="p-phone">
          <Input
            id="p-phone"
            type="tel"
            value={profile.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field label="Location" htmlFor="p-location">
          <Input
            id="p-location"
            value={profile.location}
            onChange={(e) => patch({ location: e.target.value })}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="Timezone" htmlFor="p-timezone">
          <Input
            id="p-timezone"
            value={profile.timezone}
            onChange={(e) => patch({ timezone: e.target.value })}
            placeholder="Asia/Kolkata"
            autoComplete="off"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function LinksEditor({
  links,
  onChange,
}: {
  links: ProfileLink[];
  onChange: (links: ProfileLink[]) => void;
}) {
  function update(index: number, patch: Partial<ProfileLink>) {
    onChange(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Links</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onChange([...links, { label: "", url: "" }])}>
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Resume, GitHub, portfolio, LinkedIn, X. Anything an evaluator can click.
          </p>
        ) : (
          links.map((link, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[140px_1fr]">
                <Input
                  value={link.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="GitHub"
                  aria-label={`Link ${i + 1} label`}
                />
                <Input
                  value={link.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                  aria-label={`Link ${i + 1} URL`}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(links.filter((_, j) => j !== i))}
                aria-label={`Remove link ${i + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SkillsEditor({
  skills,
  onChange,
}: {
  skills: ProfileSkill[];
  onChange: (skills: ProfileSkill[]) => void;
}) {
  function update(index: number, patch: Partial<ProfileSkill>) {
    onChange(skills.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Skills</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...skills, { name: "", years: 0 }])}
        >
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            What you actually work in. Years help fit analysis, claims don't.
          </p>
        ) : (
          skills.map((skill, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_100px]">
                <Input
                  value={skill.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="TypeScript"
                  aria-label={`Skill ${i + 1} name`}
                />
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={String(skill.years)}
                  onChange={(e) => update(i, { years: Number(e.target.value) || 0 })}
                  placeholder="Years"
                  aria-label={`Skill ${i + 1} years`}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(skills.filter((_, j) => j !== i))}
                aria-label={`Remove skill ${i + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsEditor({
  projects,
  onChange,
}: {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}) {
  function emptyProject(): Project {
    return {
      id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
      name: "",
      problem: "",
      work: "",
      outcome: "",
      users: "",
      links: [],
      tags: [],
      startDate: "",
      endDate: "",
    };
  }

  function update(index: number, patch: Partial<Project>) {
    onChange(projects.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Projects & proof</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onChange([...projects, emptyProject()])}>
          <Plus /> Add project
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add your real work. 3 real projects beat 30 empty repos.
          </p>
        ) : (
          projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              onChange={(patch) => update(index, patch)}
              onDelete={() => onChange(projects.filter((_, i) => i !== index))}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ProjectCard({
  project,
  index,
  onChange,
  onDelete,
}: {
  project: Project;
  index: number;
  onChange: (patch: Partial<Project>) => void;
  onDelete: () => void;
}) {
  const prefix = `proj-${index}`;

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Project {index + 1}
        </p>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete project ${index + 1}`}>
          <Trash2 />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${prefix}-name`} className="sm:col-span-2">
          <Input
            id={`${prefix}-name`}
            value={project.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Tool that helps design students track submissions"
          />
        </Field>
        <Field
          label="Problem (context)"
          htmlFor={`${prefix}-problem`}
          className="sm:col-span-2"
          hint="The real, specific problem. Generic is weak."
        >
          <Textarea
            id={`${prefix}-problem`}
            value={project.problem}
            onChange={(e) => onChange({ problem: e.target.value })}
            placeholder="Students miss deadlines across 5+ platforms..."
          />
        </Field>
        <Field label="Work (what you built)" htmlFor={`${prefix}-work`}>
          <Textarea
            id={`${prefix}-work`}
            value={project.work}
            onChange={(e) => onChange({ work: e.target.value })}
            placeholder="Built an aggregator with reminders..."
          />
        </Field>
        <Field
          label="Outcome (visible numbers)"
          htmlFor={`${prefix}-outcome`}
          hint="150 users, 10k requests, 2 hours saved a week."
        >
          <Textarea
            id={`${prefix}-outcome`}
            value={project.outcome}
            onChange={(e) => onChange({ outcome: e.target.value })}
            placeholder="Used by 150 people; ~2k checks a week"
          />
        </Field>
        <Field
          label="Did anyone care? (users, feedback, iteration)"
          htmlFor={`${prefix}-users`}
          className="sm:col-span-2"
          hint="Where you posted it, how many tried it, what you changed after feedback."
        >
          <Textarea
            id={`${prefix}-users`}
            value={project.users}
            onChange={(e) => onChange({ users: e.target.value })}
            placeholder="Posted in 3 design communities; 40 signups in week one..."
          />
        </Field>
        <Field label="Links (comma separated)" htmlFor={`${prefix}-links`}>
          <Input
            id={`${prefix}-links`}
            value={project.links.join(", ")}
            onChange={(e) =>
              onChange({
                links: parseComma(e.target.value),
              })
            }
            placeholder="https://demo.com, https://github.com/you/repo"
            type="url"
          />
        </Field>
        <Field label="Tags (comma separated)" htmlFor={`${prefix}-tags`}>
          <Input
            id={`${prefix}-tags`}
            value={project.tags.join(", ")}
            onChange={(e) => onChange({ tags: parseComma(e.target.value) })}
            placeholder="React, Supabase"
          />
        </Field>
        <Field label="Start (YYYY-MM)" htmlFor={`${prefix}-start`}>
          <Input
            id={`${prefix}-start`}
            value={project.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            placeholder="2025-06"
            autoComplete="off"
          />
        </Field>
        <Field label="End (YYYY-MM)" htmlFor={`${prefix}-end`}>
          <Input
            id={`${prefix}-end`}
            value={project.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            placeholder="2026-01"
            autoComplete="off"
          />
        </Field>
      </div>
      {project.links.length > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link2 className="size-3.5" />
          {project.links.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function ExperienceEditor({
  experience,
  onChange,
}: {
  experience: ProfileExperience[];
  onChange: (experience: ProfileExperience[]) => void;
}) {
  function empty(): ProfileExperience {
    return {
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
      bullets: [],
    };
  }

  function update(index: number, patch: Partial<ProfileExperience>) {
    onChange(experience.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Experience</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onChange([...experience, empty()])}>
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {experience.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            What you've actually shipped professionally. One or two lines per role.
          </p>
        ) : (
          experience.map((exp, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Experience {i + 1}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(experience.filter((_, j) => j !== i))}
                  aria-label={`Remove experience ${i + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company" htmlFor={`exp-${i}-company`}>
                  <Input
                    id={`exp-${i}-company`}
                    value={exp.company}
                    onChange={(e) => update(i, { company: e.target.value })}
                  />
                </Field>
                <Field label="Role" htmlFor={`exp-${i}-role`}>
                  <Input
                    id={`exp-${i}-role`}
                    value={exp.role}
                    onChange={(e) => update(i, { role: e.target.value })}
                  />
                </Field>
                <Field label="Start (YYYY-MM)" htmlFor={`exp-${i}-start`}>
                  <Input
                    id={`exp-${i}-start`}
                    value={exp.startDate}
                    onChange={(e) => update(i, { startDate: e.target.value })}
                    autoComplete="off"
                  />
                </Field>
                <Field label="End (YYYY-MM)" htmlFor={`exp-${i}-end`}>
                  <Input
                    id={`exp-${i}-end`}
                    value={exp.endDate}
                    onChange={(e) => update(i, { endDate: e.target.value })}
                    autoComplete="off"
                  />
                </Field>
                <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={(e) => update(i, { current: e.target.checked })}
                    className="size-4 accent-foreground"
                  />
                  <span className="text-sm">Current role</span>
                </label>
                <Field label="Summary" htmlFor={`exp-${i}-summary`} className="sm:col-span-2">
                  <Textarea
                    id={`exp-${i}-summary`}
                    value={exp.summary}
                    onChange={(e) => update(i, { summary: e.target.value })}
                    placeholder="What you owned, shipped, and the outcome..."
                  />
                </Field>
                <Field
                  label="Highlights (one per line)"
                  htmlFor={`exp-${i}-bullets`}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id={`exp-${i}-bullets`}
                    value={exp.bullets.join("\n")}
                    onChange={(e) => update(i, { bullets: parseLines(e.target.value) })}
                    placeholder={"Shipped X used by Y\nCut infra cost by Z%"}
                  />
                </Field>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EducationEditor({
  education,
  onChange,
}: {
  education: ProfileEducation[];
  onChange: (education: ProfileEducation[]) => void;
}) {
  function empty(): ProfileEducation {
    return { school: "", degree: "", field: "", startDate: "", endDate: "", notes: "" };
  }

  function update(index: number, patch: Partial<ProfileEducation>) {
    onChange(education.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Education</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onChange([...education, empty()])}>
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            One line in outreach, nothing more. Proof beats the college brand.
          </p>
        ) : (
          education.map((edu, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Education {i + 1}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(education.filter((_, j) => j !== i))}
                  aria-label={`Remove education ${i + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="School" htmlFor={`edu-${i}-school`}>
                  <Input
                    id={`edu-${i}-school`}
                    value={edu.school}
                    onChange={(e) => update(i, { school: e.target.value })}
                  />
                </Field>
                <Field label="Degree" htmlFor={`edu-${i}-degree`}>
                  <Input
                    id={`edu-${i}-degree`}
                    value={edu.degree}
                    onChange={(e) => update(i, { degree: e.target.value })}
                    placeholder="B.Tech, Computer Science"
                  />
                </Field>
                <Field label="Field" htmlFor={`edu-${i}-field`}>
                  <Input
                    id={`edu-${i}-field`}
                    value={edu.field}
                    onChange={(e) => update(i, { field: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start" htmlFor={`edu-${i}-start`}>
                    <Input
                      id={`edu-${i}-start`}
                      value={edu.startDate}
                      onChange={(e) => update(i, { startDate: e.target.value })}
                      placeholder="2020"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="End" htmlFor={`edu-${i}-end`}>
                    <Input
                      id={`edu-${i}-end`}
                      value={edu.endDate}
                      onChange={(e) => update(i, { endDate: e.target.value })}
                      placeholder="2024"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field label="Notes" htmlFor={`edu-${i}-notes`} className="sm:col-span-2">
                  <Textarea
                    id={`edu-${i}-notes`}
                    value={edu.notes}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="Anything worth mentioning that isn't the CGPA."
                  />
                </Field>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
