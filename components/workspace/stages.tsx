"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileSearch,
  Github,
  Linkedin,
  Loader2,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Twitter,
  Users,
} from "lucide-react";
import {
  analyzeFitAction,
  buildDossierAction,
  checkQualityAction,
  draftOutreachAction,
  researchCompanyAction,
  saveArtifactAction,
  saveObservationsAction,
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
  PersonContact,
  ProofTask,
  QualityReport,
  ResearchMaterial,
  ResearchSource,
  ResearchStep,
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

function cleanInferred(value: string): string {
  return value
    .replace(/\s*\[inferred\]\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeDossier(d?: Dossier): Dossier | undefined {
  if (!d) return d;
  return { ...d, likelyNeeds: (d.likelyNeeds ?? []).map(cleanInferred) };
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <h2 className="font-semibold lowercase tracking-tight">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm lowercase text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 lowercase">
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
  const [researchError, setResearchError] = useState("");
  const [mock, setMock] = useState(false);
  const [researching, setResearching] = useState(false);
  const [building, setBuilding] = useState(false);
  const [steps, setSteps] = useState<ResearchStep[] | undefined>();
  const [stageIndex, setStageIndex] = useState(0);
  const [draft, setDraft] = useState<Dossier | undefined>(() =>
    sanitizeDossier(company.dossier)
  );
  const [research, setResearch] = useState<ResearchMaterial | undefined>(
    company.research
  );

  const researchStages = [
    "fetching website…",
    "fetching job post…",
    "searching for team & funding…",
    "reading sources…",
    "writing the brief…",
  ];

  useEffect(() => {
    if (!researching) {
      setStageIndex(0);
      return;
    }
    const t = setInterval(() => {
      setStageIndex((i) => (i + 1) % researchStages.length);
    }, 1400);
    return () => clearInterval(t);
  }, [researching]);

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
        setDraft(sanitizeDossier(res.company.dossier));
        setResearch(res.company.research);
      }
      setMock(res.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function researchCompany() {
    setResearching(true);
    setResearchError("");
    setSteps(undefined);
    try {
      const res = await researchCompanyAction(company.id);
      if (res.company) {
        setCompany(res.company);
        setDraft(sanitizeDossier(res.company.dossier));
        setResearch(res.company.research);
      }
      setSteps(res.steps);
      setMock(res.mock);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResearching(false);
    }
  }

  const canResearch = Boolean(
    company.name.trim() || company.url.trim() || company.jobUrl.trim()
  );

  function patchDossier(patch: Partial<Dossier>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <div>
      <StageHeader
        icon={<Compass className="size-5" />}
        title="Research dossier"
        description="Fetch the site, the job post, and search the web for context — then turn it into a tight, sourced brief. You verify before moving on."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {research && !draft && !researching ? (
              <Button variant="outline" onClick={run} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {loading ? "Building..." : "Build brief"}
              </Button>
            ) : null}
            <Button
              onClick={researchCompany}
              disabled={researching || loading || !canResearch}
              title={
                !canResearch
                  ? "Add a company URL or job post first"
                  : undefined
              }
            >
              {researching ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FileSearch />
              )}
              {researching
                ? researchStages[stageIndex]
                : research
                  ? "Research again"
                  : "Research company"}
            </Button>
          </div>
        }
        mock={mock}
      />

      {error ? <AIError message={error} onRetry={run} /> : null}
      {researchError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="size-4" /> Research failed
          </p>
          <p className="mt-1 text-muted-foreground">{researchError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            you can still add notes manually and build a brief from what you
            pasted.
          </p>
        </div>
      ) : null}

      {researching ? (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {researchStages[stageIndex]}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                fetching real pages and searching the web. usually 20–60 seconds.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {researchStages.map((label, i) => (
              <div
                key={label}
                className={
                  i === stageIndex ? "text-xs text-foreground" : "text-xs text-muted-foreground/60"
                }
              >
                {i < stageIndex ? "✓ " : "· "}
                {label}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? <LoadingBlock /> : null}

      {research && !researching && !loading ? (
        <ResearchSourcesPanel research={research} steps={steps} />
      ) : null}

      {research && !researching && !loading ? (
        <PeoplePanel people={research.people} />
      ) : null}

      {!loading && draft ? (
        <div className="space-y-6">
          <div className="grid items-start gap-x-6 gap-y-4 sm:grid-cols-2">
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
            <Field
              label="Likely needs (one per line)"
              htmlFor="d-needs"
              hint="AI's best guesses from the material — verify before repeating them."
            >
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

          <div className="rounded-xl bg-background/70 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(e) => patchDossier({ verified: e.target.checked })}
                className="mt-0.5 size-4 accent-foreground"
              />
              <span>
                <span className="block text-sm font-medium">
                  i actually read the sources and used the product
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  this confirmation is the difference between real research and
                  fake confidence. fit analysis and outreach stay locked until it&apos;s
                  checked.
                </span>
              </span>
            </label>
          </div>
        </div>
      ) : null}

      {!loading && !draft ? (
        <p className="text-sm lowercase text-muted-foreground">
          add the company url and job post first — the brief is only as good as
          what it can fetch.
        </p>
      ) : null}
    </div>
  );
}

function ResearchSourcesPanel({
  research,
  steps,
}: {
  research: ResearchMaterial;
  steps?: ResearchStep[];
}) {
  const okCount = research.sources.filter((s) => s.status === "ok").length;
  const failed = research.sources.filter((s) => s.status !== "ok");
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <FileSearch className="size-4 text-muted-foreground" />
          what the ai read
        </p>
        <Badge variant="secondary">
          {okCount}/{research.sources.length} sources fetched
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        every claim in the brief should trace back to one of these. open the
        ones you haven&apos;t seen before marking research verified.
      </p>
      {steps && steps.length > 0 ? (
        <div className="mt-3 space-y-1">
          {steps.map((step) => (
            <p key={step.key} className="text-xs text-muted-foreground">
              {step.status === "ok"
                ? "✓"
                : step.status === "skipped"
                  ? "−"
                  : "✕"}{" "}
              {step.label}
              {step.detail ? ` — ${step.detail}` : ""}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-2 divide-y divide-border/60">
        {research.sources.map((source, i) => (
          <SourceRow key={`${source.url}-${source.kind}-${i}`} source={source} />
        ))}
      </div>
      {failed.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          sources marked failed weren&apos;t reachable from here (some sites block
          fetchers). Verify them manually before relying on the brief.
        </p>
      ) : null}
    </div>
  );
}

function SourceRow({ source }: { source: ResearchSource }) {
  const variant =
    source.status === "ok"
      ? "success"
      : source.status === "skipped"
        ? "secondary"
        : "destructive";
  const label =
    source.status === "ok"
      ? "fetched"
      : source.status === "skipped"
        ? "skipped"
        : "failed";
  return (
    // Borderless row: a list of sources reads as a list, not as a grid of
    // bordered tiles competing with the dossier fields below.
    <div className="py-2">
      <div className="flex items-start justify-between gap-2">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 min-w-0 text-sm font-medium hover:underline"
        >
          <ExternalLink className="mr-1 inline size-3.5 text-muted-foreground" />
          {source.title || source.url}
        </a>
        <Badge variant={variant as "success" | "secondary" | "destructive"}>
          {label}
        </Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{source.url}</p>
      {source.excerpt ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {source.excerpt}
        </p>
      ) : null}
    </div>
  );
}

function PeoplePanel({ people }: { people: PersonContact[] }) {
  if (!people.length) {
    return (
      <div className="mb-8 text-sm text-muted-foreground">
        no team members found yet. re-run research with a job post for better
        coverage, or add the people you know to contacts in the outreach stage.
      </div>
    );
  }
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Users className="size-4 text-muted-foreground" /> people found
        </p>
        <Badge variant="secondary">{people.length}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        best-effort public contact info from web search. verify before reaching
        out — a wrong email or a dead link is worse than no contact.
      </p>
      <div className="mt-2 divide-y divide-border/60">
        {people.map((person) => (
          <PersonCard key={person.name} person={person} />
        ))}
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: PersonContact }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{person.name}</p>
        {person.role ? <Badge variant="secondary">{person.role}</Badge> : null}
      </div>
      <div className="mt-2 space-y-1.5 text-xs">
        {person.email ? (
          <a
            href={`mailto:${person.email}`}
            className="flex items-center gap-1.5 hover:underline"
          >
            <Mail className="size-3.5 text-muted-foreground" /> {person.email}
          </a>
        ) : null}
        {person.linkedin ? (
          <a
            href={person.linkedin}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:underline"
          >
            <Linkedin className="size-3.5 text-muted-foreground" /> LinkedIn
          </a>
        ) : null}
        {person.x ? (
          <a
            href={person.x}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:underline"
          >
            <Twitter className="size-3.5 text-muted-foreground" /> X / Twitter
          </a>
        ) : null}
        {person.github ? (
          <a
            href={person.github}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:underline"
          >
            <Github className="size-3.5 text-muted-foreground" /> GitHub
          </a>
        ) : null}
        {person.sourceUrl ? (
          <p className="text-muted-foreground">
            via{" "}
            <a
              href={person.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {hostname(person.sourceUrl)}
              <ExternalLink className="size-3" />
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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
  const [observations, setObservations] = useState<string[]>(
    () => company.research?.observations ?? []
  );

  useDraft(tasks, (list) => {
    const stripped = list.map(({ id: _id, ...rest }) => rest);
    saveProofTasksAction(company.id, stripped)
      .then((c) => c && setCompany(c))
      .catch(() => {});
  });

  useDraft(observations, (list) => {
    saveObservationsAction(company.id, list)
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
        description="The killer feature: one small piece of work, grounded in what you actually observed, that proves you can help. Outreach stays locked until at least one is done."
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

      <Field
        label="What did you actually notice?"
        htmlFor="p-observations"
        hint="Use the product, read their docs, changelog, and public issues, and watch community feedback. Record what you really hit — the generator will only build tasks around these. If there are none, it suggests a quick research task first instead of guessing."
        className="mb-5"
      >
        <Textarea
          id="p-observations"
          rows={4}
          className="resize-none"
          value={arrayText(observations)}
          onChange={(e) => setObservations(parseLines(e.target.value))}
          placeholder={"The onboarding asks for the same info twice\nTheir changelog shipped X but the docs still describe Y\nUsers in their community keep asking for Z"}
        />
      </Field>

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
          First, note what you observed using the product. Tasks are only
          suggested around real observations — if you haven't recorded any, the
          generator will propose a quick research task that produces them,
          not a build you might waste time on.
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
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
      .then((c) => c && setCompany(c))
      .catch(() => {});
  });

  const researchPeople = company.research?.people ?? [];

  function addPeopleToContacts() {
    const lines = researchPeople.map((p) =>
      [p.name, p.email, p.linkedin, p.x].filter(Boolean).join(" · ")
    );
    setContactsText((prev) => [prev, ...lines].filter(Boolean).join("\n"));
  }

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
        label="Contacts"
        htmlFor="o-contacts"
        hint="One per line or comma separated. Founder, hiring manager, engineer you found during research — email, LinkedIn, X, all of it."
        className="mb-4"
      >
        <Textarea
          id="o-contacts"
          rows={5}
          className="resize-none"
          value={contactsText}
          onChange={(e) => setContactsText(e.target.value)}
          placeholder={"Ada Lovelace, aida@company.com, @handle\nKai Chen, kai@company.com"}
        />
        {researchPeople.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addPeopleToContacts}
          >
            <Users /> Add {researchPeople.length} team member
            {researchPeople.length === 1 ? "" : "s"} from research
          </Button>
        ) : null}
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
