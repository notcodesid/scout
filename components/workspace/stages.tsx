"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  FileSearch,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import {
  analyzeFitAction,
  buildDossierAction,
  checkQualityAction,
  draftOutreachAction,
  saveArtifactAction,
  saveProofTasksAction,
  suggestProofTasksAction,
  updateCompanyAction,
} from "@/app/companies/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  Company,
  Dossier,
  FitAnalysis,
  OutreachPack,
  ProofTask,
  QualityReport,
} from "@/lib/types";
import { words } from "@/lib/utils";

function arrayText(arr?: string[]): string {
  return (arr ?? []).join("\n");
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function useDraft<T>(value: T, onSave: (v: T) => void, delay = 700) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => onSave(value), delay);
    return () => clearTimeout(t);
  }, [value]);
}

function StageHeader({
  icon,
  title,
  description,
  action,
  mock,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  mock?: boolean;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {mock ? <Badge variant="warning">sample (mock)</Badge> : null}
        {action}
      </div>
    </div>
  );
}

function AIError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium text-destructive">
        <AlertTriangle className="size-4" /> AI call failed
      </p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}

export function ResearchStage({
  company,
  setCompany,
}: {
  company: Company;
  setCompany: (c: Company) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);
  const [draft, setDraft] = useState<Dossier | undefined>(company.dossier);

  useDraft(draft, (d) => {
    if (d) {
      saveArtifactAction(company.id, "dossier", d)
        .then((c) => c && setCompany(c))
        .catch(() => {});
    }
  });

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await buildDossierAction(company.id);
      if (res.company) {
        setCompany(res.company);
        setDraft(res.company.dossier);
      }
      setMock(res.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function patchDossier(patch: Partial<Dossier>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <div>
      <StageHeader
        icon={<FileSearch className="size-5" />}
        title="Research dossier"
        description="Turn what you pasted into a tight brief. Every claim should be sourced, and you verify before moving on."
        action={
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Building..." : draft ? "Rebuild dossier" : "Build dossier"}
          </Button>
        }
        mock={mock}
      />

      {error ? <AIError message={error} onRetry={run} /> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading && draft ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" htmlFor="d-name">
              <Input
                id="d-name"
                value={draft.companyName}
                onChange={(e) => patchDossier({ companyName: e.target.value })}
              />
            </Field>
            <Field label="One-liner" htmlFor="d-oneliner">
              <Input
                id="d-oneliner"
                value={draft.oneLiner}
                onChange={(e) => patchDossier({ oneLiner: e.target.value })}
              />
            </Field>
            <Field label="Problem" htmlFor="d-problem">
              <Textarea
                id="d-problem"
                value={draft.problem}
                onChange={(e) => patchDossier({ problem: e.target.value })}
              />
            </Field>
            <Field label="Users" htmlFor="d-users">
              <Textarea
                id="d-users"
                value={draft.users}
                onChange={(e) => patchDossier({ users: e.target.value })}
              />
            </Field>
            <Field label="Differentiation" htmlFor="d-diff">
              <Textarea
                id="d-diff"
                value={draft.differentiation}
                onChange={(e) => patchDossier({ differentiation: e.target.value })}
              />
            </Field>
            <Field label="Role / likely need" htmlFor="d-role">
              <Textarea
                id="d-role"
                value={draft.role}
                onChange={(e) => patchDossier({ role: e.target.value })}
              />
            </Field>
            <Field label="Team (one per line)" htmlFor="d-team">
              <Textarea
                id="d-team"
                value={arrayText(draft.team)}
                onChange={(e) => patchDossier({ team: parseLines(e.target.value) })}
              />
            </Field>
            <Field label="Likely needs (one per line)" htmlFor="d-needs">
              <Textarea
                id="d-needs"
                value={arrayText(draft.likelyNeeds)}
                onChange={(e) => patchDossier({ likelyNeeds: parseLines(e.target.value) })}
              />
            </Field>
            <Field label="Competitors (one per line)" htmlFor="d-comp">
              <Textarea
                id="d-comp"
                value={arrayText(draft.competitors)}
                onChange={(e) => patchDossier({ competitors: parseLines(e.target.value) })}
              />
            </Field>
            <Field label="Sources (one per line)" htmlFor="d-sources">
              <Textarea
                id="d-sources"
                value={arrayText(draft.sources)}
                onChange={(e) => patchDossier({ sources: parseLines(e.target.value) })}
              />
            </Field>
            <Field
              label="Open questions (one per line)"
              htmlFor="d-questions"
              hint="Things to verify before applying."
              className="sm:col-span-2"
            >
              <Textarea
                id="d-questions"
                value={arrayText(draft.openQuestions)}
                onChange={(e) => patchDossier({ openQuestions: parseLines(e.target.value) })}
              />
            </Field>
          </div>

          <div className="rounded-md border p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(e) => patchDossier({ verified: e.target.checked })}
                className="mt-0.5 size-4 accent-foreground"
              />
              <span>
                <span className="block text-sm font-medium">
                  I actually read the sources and used the product
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  This confirmation is the difference between real research and fake confidence.
                  Fit analysis and outreach stay locked until it's checked.
                </span>
              </span>
            </label>
          </div>
        </div>
      ) : null}

      {!loading && !draft ? (
        <p className="text-sm text-muted-foreground">
          Add the company URL and job post in the pipeline, then build the dossier here. Without a
          configured AI key you'll get sample output so you can try the flow.
        </p>
      ) : null}
    </div>
  );
}

export function FitStage({
  company,
  setCompany,
}: {
  company: Company;
  setCompany: (c: Company) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);
  const [draft, setDraft] = useState<FitAnalysis | undefined>(company.fit);

  useDraft(draft, (d) => {
    if (d) {
      saveArtifactAction(company.id, "fit", d)
        .then((c) => c && setCompany(c))
        .catch(() => {});
    }
  });

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await analyzeFitAction(company.id);
      if (res.company) {
        setCompany(res.company);
        setDraft(res.company.fit);
      }
      setMock(res.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function patchFit(patch: Partial<FitAnalysis>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  if (!company.dossier) return null;

  return (
    <div>
      <StageHeader
        icon={<Target className="size-5" />}
        title="Fit analysis"
        description="Honest comparison: where your evidence overlaps, where it's missing, and whether this is worth your time."
        action={
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Analyzing..." : draft ? "Re-analyze" : "Analyze fit"}
          </Button>
        }
        mock={mock}
      />

      {error ? <AIError message={error} onRetry={run} /> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading && draft ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                draft.recommendation === "apply"
                  ? "success"
                  : draft.recommendation === "skip"
                    ? "destructive"
                    : "warning"
              }
            >
              {draft.recommendation === "apply"
                ? "Apply"
                : draft.recommendation === "skip"
                  ? "Skip"
                  : "Wait"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {draft.recommendation === "apply"
                ? "Strong evidence match. Move fast."
                : draft.recommendation === "skip"
                  ? "Weak overlap. Protect your time."
                  : "Real overlap, but proof is missing. Build it before applying."}
            </p>
          </div>

          <Field label="Reasoning" htmlFor="fit-reason">
            <Textarea
              id="fit-reason"
              value={draft.reasoning}
              onChange={(e) => patchFit({ reasoning: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Strong matches (one per line)" htmlFor="fit-strong">
              <Textarea
                id="fit-strong"
                value={arrayText(draft.strongMatches)}
                onChange={(e) => patchFit({ strongMatches: parseLines(e.target.value) })}
              />
            </Field>
            <Field label="Weak matches (one per line)" htmlFor="fit-weak">
              <Textarea
                id="fit-weak"
                value={arrayText(draft.weakMatches)}
                onChange={(e) => patchFit({ weakMatches: parseLines(e.target.value) })}
              />
            </Field>
            <Field label="Missing proof (one per line)" htmlFor="fit-missing">
              <Textarea
                id="fit-missing"
                value={arrayText(draft.missingProof)}
                onChange={(e) => patchFit({ missingProof: parseLines(e.target.value) })}
              />
            </Field>
          </div>

          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">
              Do you genuinely care about what they're building?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The article's warning: people who join without real conviction burn out fast. Answer
              honestly, not aspirationally.
            </p>
            <div className="mt-3 flex gap-4">
              {(["yes", "unsure", "no"] as const).map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="interest"
                    checked={draft.genuineInterest === value}
                    onChange={() => patchFit({ genuineInterest: value })}
                    className="size-4 accent-foreground"
                  />
                  {value === "yes" ? "Yes" : value === "unsure" ? "Not sure yet" : "No"}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !draft ? (
        <p className="text-sm text-muted-foreground">
          Fit analysis compares your evidence profile against the dossier. Complete your profile
          first so the comparison has real material.
        </p>
      ) : null}
    </div>
  );
}

export function ProofStage({
  company,
  setCompany,
}: {
  company: Company;
  setCompany: (c: Company) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);
  const [tasks, setTasks] = useState<ProofTask[]>(company.proofTasks);

  useDraft(tasks, (list) => {
    const stripped = list.map(({ id: _id, ...rest }) => rest);
    saveProofTasksAction(company.id, stripped)
      .then((c) => c && setCompany(c))
      .catch(() => {});
  });

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await suggestProofTasksAction(company.id);
      if (res.company) {
        setCompany(res.company);
        setTasks(res.company.proofTasks);
      }
      setMock(res.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function updateTask(index: number, patch: Partial<ProofTask>) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  const doneCount = tasks.filter((t) => t.done).length;

  if (!company.dossier || !company.fit) return null;

  return (
    <div>
      <StageHeader
        icon={<ShieldCheck className="size-5" />}
        title="Proof task"
        description="The killer feature: one small, company-specific piece of work that proves you can help. Outreach stays locked until at least one is done."
        action={
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Suggesting..." : "Suggest proof tasks"}
          </Button>
        }
        mock={mock}
      />

      {error ? <AIError message={error} onRetry={run} /> : null}
      {loading ? <LoadingBlock /> : null}

      {tasks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {doneCount}/{tasks.length} done
          </p>
          {tasks.map((task, i) => (
            <ProofTaskCard
              key={task.id}
              task={task}
              onChange={(patch) => updateTask(i, patch)}
              onDelete={() => removeTask(i)}
            />
          ))}
        </div>
      ) : null}

      {!loading && tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tasks mix build, distribution, and research. Shipping without distribution is incomplete
          signal, so expect at least one task that puts your work in front of real people.
        </p>
      ) : null}
    </div>
  );
}

function ProofTaskCard({
  task,
  onChange,
  onDelete,
}: {
  task: ProofTask;
  onChange: (patch: Partial<ProofTask>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={task.done}
            onChange={(e) => onChange({ done: e.target.checked })}
            className="size-4 accent-foreground"
          />
          {task.title}
        </label>
        <Badge
          variant={
            task.type === "build"
              ? "default"
              : task.type === "distribution"
                ? "success"
                : "secondary"
          }
        >
          {task.type}
        </Badge>
        <Badge variant="outline">{task.effort}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{task.why}</p>
      <p className="mt-1 text-sm">
        <span className="font-medium">Output:</span> {task.output}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Evidence link" htmlFor={`task-${task.id}-link`}>
          <Input
            id={`task-${task.id}-link`}
            type="url"
            value={task.evidenceLink}
            onChange={(e) => onChange({ evidenceLink: e.target.value })}
            placeholder="https://... (the link you'll cite in outreach)"
          />
        </Field>
        <Field label="Notes / what happened" htmlFor={`task-${task.id}-notes`}>
          <Input
            id={`task-${task.id}-notes`}
            value={task.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Post link, reactions, feedback..."
          />
        </Field>
      </div>
      <Button variant="ghost" size="sm" className="mt-2" onClick={onDelete}>
        <Trash2 /> Remove
      </Button>
    </div>
  );
}

export function OutreachStage({
  company,
  setCompany,
}: {
  company: Company;
  setCompany: (c: Company) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);
  const [draft, setDraft] = useState<OutreachPack | undefined>(company.outreach);
  const [contactsText, setContactsText] = useState(company.contacts.join(", "));

  useDraft(draft, (d) => {
    if (d) {
      saveArtifactAction(company.id, "outreach", d)
        .then((c) => c && setCompany(c))
        .catch(() => {});
    }
  });

  useDraft(contactsText, (value) => {
    updateCompanyAction(company.id, {
      contacts: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })
      .then((c) => c && setCompany(c))
      .catch(() => {});
  });

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await draftOutreachAction(company.id);
      if (res.company) {
        setCompany(res.company);
        setDraft(res.company.outreach);
      }
      setMock(res.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function patchOutreach(patch: Partial<OutreachPack>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  if (!company.dossier || !company.fit) return null;

  return (
    <div>
      <StageHeader
        icon={<PenLine className="size-5" />}
        title="Outreach"
        description="Short, specific, human. Drafts follow the article's structure: background, why this company specifically, proof with work + context + outcome. You fill in what only you know."
        action={
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Drafting..." : draft ? "Redraft" : "Draft outreach"}
          </Button>
        }
        mock={mock}
      />

      {error ? <AIError message={error} onRetry={run} /> : null}
      {loading ? <LoadingBlock /> : null}

      <Field
        label="Contacts (comma separated)"
        htmlFor="o-contacts"
        hint="Founder, hiring manager, engineer you found during research. Expand your surface area: email, LinkedIn, and X."
        className="mb-4"
      >
        <Input
          id="o-contacts"
          value={contactsText}
          onChange={(e) => setContactsText(e.target.value)}
          placeholder="Ada Lovelace, aida@company.com, @handle"
        />
      </Field>

      {!loading && draft ? (
        <div className="space-y-4">
          <Field
            label={`Email (${words(draft.email)} words — target under 150)`}
            htmlFor="o-email"
          >
            <Textarea
              id="o-email"
              className="min-h-[220px] font-mono text-xs leading-relaxed"
              value={draft.email}
              onChange={(e) => patchOutreach({ email: e.target.value })}
            />
          </Field>
          <Field label={`LinkedIn (${words(draft.linkedin)} words)`} htmlFor="o-linkedin">
            <Textarea
              id="o-linkedin"
              value={draft.linkedin}
              onChange={(e) => patchOutreach({ linkedin: e.target.value })}
            />
          </Field>
          <Field label={`X / DM (${words(draft.x)} words)`} htmlFor="o-x">
            <Textarea
              id="o-x"
              value={draft.x}
              onChange={(e) => patchOutreach({ x: e.target.value })}
            />
          </Field>
          <Field label="Follow-up (5-7 days later)" htmlFor="o-followup">
            <Textarea
              id="o-followup"
              value={draft.followUp}
              onChange={(e) => patchOutreach({ followUp: e.target.value })}
            />
          </Field>
          <div className="rounded-md border border-amber-600/30 bg-amber-600/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4" /> Fill these in before sending
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {draft.notes
                .split("\n")
                .filter(Boolean)
                .map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
            </ul>
          </div>
        </div>
      ) : null}

      {!loading && !draft ? (
        <p className="text-sm text-muted-foreground">
          Outreach drafts from your profile, the dossier, and your completed proof tasks. Finish at
          least one proof task first: the draft is only as strong as the evidence behind it.
        </p>
      ) : null}
    </div>
  );
}

export function QualityStage({
  company,
  setCompany,
}: {
  company: Company;
  setCompany: (c: Company) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState(false);
  const [report, setReport] = useState<QualityReport | undefined>(company.quality);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await checkQualityAction(company.id);
      if (res.company) {
        setCompany(res.company);
        setReport(res.company.quality);
      }
      setMock(res.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!company.dossier || !company.outreach) return null;

  return (
    <div>
      <StageHeader
        icon={<ClipboardCheck className="size-5" />}
        title="Quality check"
        description="The reviewer has read 5,000+ applications. Would yours survive? This applies the article's red flags to your actual draft."
        action={
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {loading ? "Checking..." : report ? "Re-check" : "Run quality check"}
          </Button>
        }
        mock={mock}
      />

      {error ? <AIError message={error} onRetry={run} /> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading && report ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="text-4xl font-semibold tracking-tight">{report.score}</div>
            <div>
              <p className="font-medium">{report.verdict}</p>
              <p className="text-xs text-muted-foreground">
                {report.score >= 75
                  ? "Strong enough that a follow-up is worth it."
                  : "Fix the flags before sending. Follow-ups amplify signal; they don't create it."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {report.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                <Badge
                  variant={
                    flag.severity === "critical"
                      ? "destructive"
                      : flag.severity === "warning"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {flag.severity}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{flag.label}</p>
                  <p className="text-sm text-muted-foreground">{flag.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !report ? (
        <p className="text-sm text-muted-foreground">
          Run this after drafting outreach. It flags claims without links, buzzwords, AI-slop, and
          generic praise. Your drafts were written to pass; verify they still do after your edits.
        </p>
      ) : null}
    </div>
  );
}
