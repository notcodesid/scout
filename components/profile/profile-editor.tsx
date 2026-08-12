"use client";

import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useScout } from "@/lib/store";
import type { Project } from "@/lib/types";

function EmptyProject(): Omit<Project, "id"> {
  return {
    name: "",
    problem: "",
    work: "",
    outcome: "",
    users: "",
    links: [],
    tags: [],
  };
}

export function ProfileEditor() {
  const { state, updateProfile, addProject, updateProject, deleteProject } = useScout();
  const { profile } = state;
  const [skillsText, setSkillsText] = useState(profile.skills.join(", "));

  function commitSkills(value: string) {
    setSkillsText(value);
    updateProfile({
      skills: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  function updateLink(index: number, patch: { label?: string; url?: string }) {
    updateProfile({
      links: profile.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  }

  function addLink() {
    updateProfile({ links: [...profile.links, { label: "", url: "" }] });
  }

  function removeLink(index: number) {
    updateProfile({ links: profile.links.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the raw material every application draws from. Every project should answer:
          work + context + outcome, and did anyone actually care?
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="p-name">
            <Input
              id="p-name"
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              autoComplete="name"
            />
          </Field>
          <Field label="Headline" htmlFor="p-headline">
            <Input
              id="p-headline"
              value={profile.headline}
              onChange={(e) => updateProfile({ headline: e.target.value })}
              placeholder="Full-stack developer who ships for real users"
            />
          </Field>
          <Field label="Location" htmlFor="p-location">
            <Input
              id="p-location"
              value={profile.location}
              onChange={(e) => updateProfile({ location: e.target.value })}
              autoComplete="address-level2"
            />
          </Field>
          <Field label="Email" htmlFor="p-email">
            <Input
              id="p-email"
              type="email"
              value={profile.email}
              onChange={(e) => updateProfile({ email: e.target.value })}
              autoComplete="email"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Links</CardTitle>
          <Button variant="outline" size="sm" onClick={addLink}>
            <Plus /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              GitHub, portfolio, LinkedIn, X. Anything an evaluator can click.
            </p>
          ) : (
            profile.links.map((link, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[140px_1fr]">
                  <Input
                    value={link.label}
                    onChange={(e) => updateLink(i, { label: e.target.value })}
                    placeholder="GitHub"
                    aria-label={`Link ${i + 1} label`}
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                    placeholder="https://..."
                    type="url"
                    aria-label={`Link ${i + 1} URL`}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(i)}
                  aria-label={`Remove link ${i + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Skills (comma separated)"
            htmlFor="p-skills"
            hint="Used by fit analysis to spot overlap with a company's needs."
          >
            <Input
              id="p-skills"
              value={skillsText}
              onChange={(e) => commitSkills(e.target.value)}
              placeholder="TypeScript, React, Node.js, Postgres"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Projects & proof</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addProject(EmptyProject())}
          >
            <Plus /> Add project
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add your real work. 3 real projects beat 30 empty repos.
            </p>
          ) : (
            profile.projects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={idx}
                onChange={(patch) => updateProject(project.id, patch)}
                onDelete={() => deleteProject(project.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
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
                links: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
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
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="React, Supabase"
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
