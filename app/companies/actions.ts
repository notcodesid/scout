"use server";

import { revalidatePath } from "next/cache";
import {
  analyzeFitServer,
  buildDossierServer,
  checkQualityServer,
  draftOutreachServer,
  extractPeopleServer,
  hasAIKey,
  suggestProofTasksServer,
} from "@/lib/ai";
import {
  createCompany,
  deleteCompany,
  getCompany,
  replaceProofTasks,
  setArtifact,
  setResearch,
  updateCompanyScalars,
} from "@/lib/companies";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { enrichPeople, runCompanyResearch } from "@/lib/research";
import type { Company, PersonContact, ProofTask, ResearchStep } from "@/lib/types";

// Auth gate + load, in that order. Server actions are public HTTP endpoints —
// proxy.ts only redirects browsers, so anything reachable here must check the
// session itself. Actions that do not load a company call requireUser()
// directly instead.
async function requireCompany(id: string): Promise<Company> {
  await requireUser();
  const company = await getCompany(id);
  if (!company) throw new Error("Company not found");
  return company;
}

export async function addCompanyAction(input: {
  name: string;
  url: string;
  jobUrl: string;
  notes: string;
}) {
  await requireUser();
  const company = await createCompany({ ...input, contacts: [] });
  revalidatePath("/");
  return company;
}

export async function updateCompanyAction(
  id: string,
  patch: Partial<
    Pick<Company, "name" | "url" | "jobUrl" | "notes" | "contacts" | "followUpDate">
  >
) {
  await requireUser();
  const company = await updateCompanyScalars(id, patch);
  revalidatePath("/");
  revalidatePath(`/companies/${id}`);
  return company;
}

export async function deleteCompanyAction(id: string) {
  await requireUser();
  await deleteCompany(id);
  revalidatePath("/");
}

export async function saveArtifactAction(
  id: string,
  kind: "dossier" | "fit" | "outreach" | "quality",
  value: unknown
) {
  await requireUser();
  const company = await setArtifact(id, kind, value);
  revalidatePath(`/companies/${id}`);
  return company;
}

export async function saveProofTasksAction(
  id: string,
  tasks: Omit<ProofTask, "id">[]
) {
  await requireUser();
  const company = await replaceProofTasks(id, tasks);
  revalidatePath(`/companies/${id}`);
  return company;
}

export async function buildDossierAction(id: string) {
  const company = await requireCompany(id);
  const profile = await getProfile();
  const dossier = await buildDossierServer({
    company,
    profile,
    material: company.research,
  });
  const updated = await setArtifact(id, "dossier", dossier);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
}

export async function researchCompanyAction(id: string) {
  const company = await requireCompany(id);
  const { material, steps } = await runCompanyResearch({
    name: company.name,
    url: company.url,
    jobUrl: company.jobUrl,
    notes: company.notes,
  });

  const fetchedSomething =
    material.websiteText || material.jobText || material.searchResults.length > 0;
  if (!fetchedSomething) {
    const detail = steps.find((s) => s.status === "error")?.detail || "";
    throw new Error(
      `Couldn't fetch anything about ${material.companyName}. Add the company URL or job post, or check the research providers.${detail ? ` (${detail})` : ""}`
    );
  }

  let people: PersonContact[] = [];
  let peopleError = "";
  try {
    people = await enrichPeople(
      await extractPeopleServer({
        companyName: material.companyName,
        material,
      }),
      material.companyName,
      [
        material.websiteText,
        material.jobText,
        ...material.pages.map((p) => p.text),
      ]
    );
  } catch (err) {
    peopleError = err instanceof Error ? err.message : "Unknown error";
  }
  const materialWithPeople = {
    ...material,
    people,
    observations: company.research?.observations ?? [],
  };
  steps.push(
    peopleError
      ? {
          key: "people",
          label: "People extraction skipped",
          status: "error" as const,
          detail: peopleError.slice(0, 200),
        }
      : {
          key: "people",
          label: `Found ${people.length} team member${people.length === 1 ? "" : "s"}`,
          status: people.length ? ("ok" as const) : ("skipped" as const),
          detail: people.length
            ? `${people.filter((p) => p.email).length} emails · ${people.filter((p) => p.linkedin).length} LinkedIn · ${people.filter((p) => p.x).length} X`
            : "No names extracted from the material",
        }
  );
  await setResearch(id, materialWithPeople);
  const profile = await getProfile();
  const dossier = await buildDossierServer({
    company,
    profile,
    material: materialWithPeople,
  });
  const dossierWithTeam = dossier.team.length
    ? dossier
    : {
        ...dossier,
        team: people.map((p) => (p.role ? `${p.name} — ${p.role}` : p.name)),
      };
  const updated = await setArtifact(id, "dossier", dossierWithTeam);
  revalidatePath(`/companies/${id}`);
  return { company: updated, steps, mock: !hasAIKey() };
}

export async function analyzeFitAction(id: string) {
  const company = await requireCompany(id);
  if (!company.dossier) throw new Error("Build the research dossier first");
  const profile = await getProfile();
  const fit = await analyzeFitServer({ profile, dossier: company.dossier });
  const updated = await setArtifact(id, "fit", fit);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
}

export async function suggestProofTasksAction(id: string) {
  const company = await requireCompany(id);
  if (!company.dossier || !company.fit) {
    throw new Error("Complete research and fit analysis first");
  }
  const profile = await getProfile();
  const tasks = await suggestProofTasksServer({
    profile,
    dossier: company.dossier,
    fit: company.fit,
    observations: company.research?.observations ?? [],
  });
  const next = [
    ...company.proofTasks,
    ...tasks.map((t) => ({ ...t, done: false, evidenceLink: "", notes: "" })),
  ];
  const updated = await replaceProofTasks(id, next);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
}

export async function saveObservationsAction(id: string, observations: string[]) {
  const company = await requireCompany(id);
  if (!company.research) return null;
  const updated = await setResearch(id, {
    ...company.research,
    observations,
  });
  revalidatePath(`/companies/${id}`);
  return updated;
}

export async function draftOutreachAction(id: string) {
  const company = await requireCompany(id);
  if (!company.dossier || !company.fit) {
    throw new Error("Complete research and fit analysis first");
  }
  const profile = await getProfile();
  const outreach = await draftOutreachServer({
    profile,
    dossier: company.dossier,
    fit: company.fit,
    proofTasks: company.proofTasks,
    contacts: company.contacts,
  });
  const updated = await setArtifact(id, "outreach", outreach);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
}

export async function checkQualityAction(id: string) {
  const company = await requireCompany(id);
  if (!company.dossier || !company.outreach) {
    throw new Error("Draft outreach first");
  }
  const quality = await checkQualityServer({
    outreach: company.outreach,
    dossier: company.dossier,
  });
  const updated = await setArtifact(id, "quality", quality);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
}
