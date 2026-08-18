"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveProfile } from "@/lib/profile";
import type { EvidenceProfile } from "@/lib/types";

export async function saveProfileAction(input: EvidenceProfile) {
  await requireUser();
  const saved = await saveProfile(input);
  revalidatePath("/profile");
  return saved;
}
