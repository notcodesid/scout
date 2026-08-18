"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { completeIntake, getIntakeState, saveIntakeAnswer, toStep } from "@/lib/intake";
import type { IntakeStep } from "@/lib/intake-spec";

export async function answerIntakeAction(input: {
  field: string;
  section: string;
  question: string;
  value: unknown;
  display: string;
}): Promise<IntakeStep> {
  await requireUser();
  await saveIntakeAnswer(input);
  const state = await getIntakeState();
  if (state.done) await completeIntake();
  revalidatePath("/onboarding/intake");
  return toStep(state);
}

export async function finishIntakeAction() {
  await requireUser();
  await completeIntake();
  revalidatePath("/");
  revalidatePath("/onboarding/intake");
  return { ok: true as const };
}
