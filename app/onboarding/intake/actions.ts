"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  completeIntake,
  getIntakeState,
  intentFor,
  saveIntakeAnswer,
  toStep,
} from "@/lib/intake";
import { checkAnswerServer } from "@/lib/ai";
import type { IntakeStep } from "@/lib/intake-spec";

export async function answerIntakeAction(input: {
  field: string;
  section: string;
  question: string;
  value: unknown;
  display: string;
  /** 1 on the first try. A second attempt is always accepted. */
  attempt?: number;
}): Promise<IntakeStep & { followUp?: string }> {
  await requireUser();

  const attempt = input.attempt ?? 1;
  const text = typeof input.value === "string" ? input.value.trim() : "";
  // Only free text can be junk; option widgets can only emit valid choices.
  // One push-back maximum, then take whatever they give — being nagged twice
  // about the same question is worse than a thin profile field.
  if (text && attempt < 2) {
    const check = await checkAnswerServer({
      question: input.question,
      intent: await intentFor(input.field),
      answer: text,
    });
    if (!check.ok) {
      const state = await getIntakeState();
      return { ...toStep(state), question: check.followUp, followUp: check.followUp };
    }
  }

  await saveIntakeAnswer(input);
  const state = await getIntakeState();
  if (state.done) await completeIntake();
  revalidatePath("/onboarding/intake");
  revalidatePath("/profile");
  return toStep(state);
}

export async function finishIntakeAction() {
  await requireUser();
  await completeIntake();
  revalidatePath("/");
  revalidatePath("/onboarding/intake");
  return { ok: true as const };
}
