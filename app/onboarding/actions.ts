"use server";

import { revalidatePath } from "next/cache";
import { parseResumeServer } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import {
  applyResumeExtract,
  saveContactStep,
  saveWorkStep,
} from "@/lib/onboarding";
import { extractResumeText, ResumeError } from "@/lib/resume";
import type { EvidenceProfile } from "@/lib/types";

export async function saveContactAction(input: {
  name: string;
  phone: string;
  phoneCountry: string;
  linkedinUrl: string;
  hasLinkedin: boolean;
}) {
  const user = await requireUser();
  await saveContactStep({ ...input, email: user.email ?? "" });
  revalidatePath("/onboarding");
  return { ok: true as const };
}

export interface ResumeUploadResult {
  ok: boolean;
  error?: string;
  mock?: boolean;
  fileName?: string;
  profile?: EvidenceProfile;
  summary?: {
    projects: number;
    experience: number;
    education: number;
    skills: number;
    links: number;
  };
}

// Takes the raw file so parsing and extraction happen server-side: the resume
// text never round-trips through the browser, and the AI key stays on the server.
export async function uploadResumeAction(
  formData: FormData
): Promise<ResumeUploadResult> {
  await requireUser();
  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file received. Try again." };
  }

  let text: string;
  try {
    text = await extractResumeText(file);
  } catch (err) {
    if (err instanceof ResumeError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not read that file." };
  }

  let extract;
  let mock = false;
  try {
    const res = await parseResumeServer(text);
    extract = res.data;
    mock = res.mock;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not read the resume: ${err.message}`
          : "Resume extraction failed.",
    };
  }

  const profile = await applyResumeExtract({
    fileName: file.name,
    resumeText: text,
    extract,
  });

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  return {
    ok: true,
    mock,
    fileName: file.name,
    profile,
    summary: {
      projects: extract.projects.length,
      experience: extract.experience.length,
      education: extract.education.length,
      skills: extract.skills.length,
      links: extract.links.length,
    },
  };
}

export async function completeOnboardingAction(input: {
  githubUsername: string;
  links: { label: string; url: string }[];
}) {
  await requireUser();
  const profile = await saveWorkStep({ ...input, complete: true });
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/onboarding");
  return { ok: true as const, profile };
}
