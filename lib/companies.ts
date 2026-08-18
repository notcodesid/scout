import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";
import type {
  Company,
  Dossier,
  FitAnalysis,
  OutreachPack,
  ProofTask,
  QualityFlag,
  QualityReport,
  PersonContact,
  ResearchMaterial,
  ResearchSource,
} from "./types";

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("\n");
  if (value == null) return "";
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeDossier(value: unknown): Dossier | undefined {
  if (!value || typeof value !== "object") return undefined;
  const d = value as Partial<Dossier>;
  return {
    companyName: asString(d.companyName),
    oneLiner: asString(d.oneLiner),
    problem: asString(d.problem),
    users: asString(d.users),
    differentiation: asString(d.differentiation),
    team: asStringArray(d.team),
    role: asString(d.role),
    likelyNeeds: asStringArray(d.likelyNeeds),
    competitors: asStringArray(d.competitors),
    sources: asStringArray(d.sources),
    openQuestions: asStringArray(d.openQuestions),
    verified: Boolean(d.verified),
  };
}

function normalizeFit(value: unknown): FitAnalysis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const f = value as Partial<FitAnalysis>;
  const rec = f.recommendation;
  return {
    strongMatches: asStringArray(f.strongMatches),
    weakMatches: asStringArray(f.weakMatches),
    missingProof: asStringArray(f.missingProof),
    recommendation:
      rec === "apply" || rec === "wait" || rec === "skip" ? rec : "wait",
    reasoning: asString(f.reasoning),
    genuineInterest:
      f.genuineInterest === "yes" ||
      f.genuineInterest === "no" ||
      f.genuineInterest === "unsure"
        ? f.genuineInterest
        : "",
  };
}

function normalizeOutreach(value: unknown): OutreachPack | undefined {
  if (!value || typeof value !== "object") return undefined;
  const o = value as Partial<OutreachPack>;
  return {
    email: asString(o.email),
    linkedin: asString(o.linkedin),
    x: asString(o.x),
    followUp: asString(o.followUp),
    notes: asString(o.notes),
  };
}

function normalizeQuality(value: unknown): QualityReport | undefined {
  if (!value || typeof value !== "object") return undefined;
  const q = value as Partial<QualityReport>;
  const rawFlags = Array.isArray(q.flags) ? (q.flags as QualityFlag[]) : [];
  return {
    score:
      typeof q.score === "number"
        ? Math.max(0, Math.min(100, Math.round(q.score)))
        : 0,
    verdict: asString(q.verdict),
    flags: rawFlags.map((f) => ({
      severity:
        f?.severity === "critical" || f?.severity === "warning" || f?.severity === "info"
          ? f.severity
          : "info",
      label: asString(f?.label),
      detail: asString(f?.detail),
    })),
  };
}

function normalizeResearch(value: unknown): ResearchMaterial | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Partial<ResearchMaterial>;
  const rawSources = Array.isArray(r.sources) ? (r.sources as ResearchSource[]) : [];
  return {
    companyName: asString(r.companyName),
    websiteUrl: asString(r.websiteUrl),
    jobUrl: asString(r.jobUrl),
    websiteText: asString(r.websiteText),
    jobText: asString(r.jobText),
    searchResults: Array.isArray(r.searchResults)
      ? r.searchResults.map((s) => ({
          url: asString(s?.url),
          title: asString(s?.title),
          snippet: asString(s?.snippet),
          publishedDate: s?.publishedDate ? asString(s.publishedDate) : undefined,
          author: s?.author ? asString(s.author) : undefined,
        }))
      : [],
    pages: Array.isArray(r.pages)
      ? r.pages.map((p) => ({
          url: asString(p?.url),
          title: asString(p?.title),
          text: asString(p?.text),
        }))
      : [],
    people: Array.isArray(r.people)
      ? r.people.map((p) => normalizePerson(p))
      : [],
    observations: Array.isArray(r.observations)
      ? r.observations.map((o) => asString(o)).filter(Boolean)
      : [],
    sources: rawSources.map((s) => ({
      url: asString(s?.url),
      title: asString(s?.title),
      kind:
        s?.kind === "website" ||
        s?.kind === "job" ||
        s?.kind === "search" ||
        s?.kind === "page"
          ? s.kind
          : "search",
      status:
        s?.status === "ok" || s?.status === "error" || s?.status === "skipped"
          ? s.status
          : "error",
      detail: s?.detail ? asString(s.detail) : undefined,
      excerpt: s?.excerpt ? asString(s.excerpt) : undefined,
    })),
    generatedAt:
      typeof r.generatedAt === "number" ? r.generatedAt : Date.now(),
  };
}

function normalizePerson(p: unknown): PersonContact {
  const value = (p ?? {}) as Partial<PersonContact>;
  return {
    name: asString(value.name),
    role: asString(value.role),
    email: asString(value.email),
    linkedin: asString(value.linkedin),
    x: asString(value.x),
    github: asString(value.github),
    sourceUrl: asString(value.sourceUrl),
  };
}

function stageFor(company: {
  dossier?: unknown;
  fit?: unknown;
  outreach?: unknown;
  quality?: unknown;
  proofTasks: { done: boolean }[];
}): Company["stage"] {
  if (company.quality) return "quality";
  if (company.outreach) return "outreach";
  if (company.proofTasks.some((t) => t.done)) return "proof";
  if (company.fit) return "fit";
  return "research";
}

type CompanyRow = Prisma.CompanyGetPayload<{ include: { proofTasks: true } }>;

function mapCompany(row: NonNullable<CompanyRow>): Company {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    jobUrl: row.jobUrl,
    notes: row.notes,
    contacts: row.contacts,
    followUpDate: row.followUpDate,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    stage: stageFor(row),
    dossier: normalizeDossier(row.dossier),
    fit: normalizeFit(row.fit),
    outreach: normalizeOutreach(row.outreach),
    quality: normalizeQuality(row.quality),
    research: normalizeResearch(row.research),
    proofTasks: row.proofTasks
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type as ProofTask["type"],
        effort: t.effort as ProofTask["effort"],
        why: t.why,
        output: t.output,
        done: t.done,
        evidenceLink: t.evidenceLink,
        notes: t.notes,
      })),
  };
}

const include = { proofTasks: true } as const;

export async function getCompanies(): Promise<Company[]> {
  const rows = await prisma.company.findMany({
    orderBy: { updatedAt: "desc" },
    include,
  });
  return rows.map(mapCompany);
}

export async function getCompany(id: string): Promise<Company | null> {
  const row = await prisma.company.findUnique({ where: { id }, include });
  return row ? mapCompany(row) : null;
}

export async function createCompany(input: {
  name: string;
  url: string;
  jobUrl: string;
  notes: string;
  contacts: string[];
}): Promise<Company> {
  const row = await prisma.company.create({ data: input, include });
  return mapCompany(row);
}

export async function updateCompanyScalars(
  id: string,
  patch: Partial<Pick<Company, "name" | "url" | "jobUrl" | "notes" | "contacts" | "followUpDate">>
): Promise<Company | null> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.url !== undefined) data.url = patch.url;
  if (patch.jobUrl !== undefined) data.jobUrl = patch.jobUrl;
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.contacts !== undefined) data.contacts = patch.contacts;
  if (patch.followUpDate !== undefined) data.followUpDate = patch.followUpDate;
  const row = await prisma.company.update({ where: { id }, data, include });
  return mapCompany(row);
}

export async function deleteCompany(id: string): Promise<void> {
  await prisma.company.delete({ where: { id } });
}

export async function setArtifact(
  id: string,
  kind: "dossier" | "fit" | "outreach" | "quality",
  value: unknown
): Promise<Company | null> {
  const row = await prisma.company.update({
    where: { id },
    data: { [kind]: value as object },
    include,
  });
  return mapCompany(row);
}

export async function setResearch(
  id: string,
  value: ResearchMaterial
): Promise<Company | null> {
  const row = await prisma.company.update({
    where: { id },
    data: { research: value as object },
    include,
  });
  return mapCompany(row);
}

export async function replaceProofTasks(
  id: string,
  tasks: Omit<ProofTask, "id">[]
): Promise<Company | null> {
  await prisma.$transaction(async (tx) => {
    await tx.proofTask.deleteMany({ where: { companyId: id } });
    if (tasks.length) {
      await tx.proofTask.createMany({
        data: tasks.map((t, i) => ({
          companyId: id,
          title: t.title,
          type: t.type,
          effort: t.effort,
          why: t.why,
          output: t.output,
          done: t.done,
          evidenceLink: t.evidenceLink,
          notes: t.notes,
          sortOrder: i,
        })),
      });
    }
  });
  return getCompany(id);
}
