"use server";

import { revalidatePath } from "next/cache";
import {
  analyzeFitServer,
  buildDossierServer,
  checkQualityServer,
  draftOutreachServer,
  hasAIKey,
  suggestProofTasksServer,
} from "@/lib/ai";
import {
  createCompany,
  deleteCompany,
  getCompany,
  replaceProofTasks,
  setArtifact,
  updateCompanyScalars,
} from "@/lib/companies";
import { getProfile } from "@/lib/profile";
import type { Company, ProofTask } from "@/lib/types";

async function requireCompany(id: string): Promise<Company> {
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
  const company = await updateCompanyScalars(id, patch);
  revalidatePath("/");
  revalidatePath(`/companies/${id}`);
  return company;
}

export async function deleteCompanyAction(id: string) {
  await deleteCompany(id);
  revalidatePath("/");
}

export async function saveArtifactAction(
  id: string,
  kind: "dossier" | "fit" | "outreach" | "quality",
  value: unknown
) {
  const company = await setArtifact(id, kind, value);
  revalidatePath(`/companies/${id}`);
  return company;
}

export async function saveProofTasksAction(
  id: string,
  tasks: Omit<ProofTask, "id">[]
) {
  const company = await replaceProofTasks(id, tasks);
  revalidatePath(`/companies/${id}`);
  return company;
}

export async function buildDossierAction(id: string) {
  const company = await requireCompany(id);
  const profile = await getProfile();
  const dossier = await buildDossierServer({ company, profile });
  const updated = await setArtifact(id, "dossier", dossier);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
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
  });
  const next = [
    ...company.proofTasks,
    ...tasks.map((t) => ({ ...t, done: false, evidenceLink: "", notes: "" })),
  ];
  const updated = await replaceProofTasks(id, next);
  revalidatePath(`/companies/${id}`);
  return { company: updated, mock: !hasAIKey() };
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
