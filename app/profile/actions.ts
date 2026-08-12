"use server";

import { revalidatePath } from "next/cache";
import { analyzeGithub } from "@/lib/github";
import { saveProfile } from "@/lib/profile";
import type { EvidenceProfile } from "@/lib/types";

export async function saveProfileAction(input: EvidenceProfile) {
  const saved = await saveProfile(input);
  revalidatePath("/profile");
  return saved;
}

export async function analyzeGithubAction(username: string) {
  const report = await analyzeGithub(username);
  revalidatePath("/profile");
  return report;
}
