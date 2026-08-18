import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getIntakeState, isIntakeDone, toStep } from "@/lib/intake";
import { isOnboarded } from "@/lib/onboarding";
import { IntakeChat } from "@/components/intake/intake-chat";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  await requireUser();
  // Ordering matters: the three-step form must be finished before the
  // conversation, and a finished intake should never reopen.
  if (!(await isOnboarded())) redirect("/onboarding");
  if (await isIntakeDone()) redirect("/");

  const state = await getIntakeState();

  return <IntakeChat initial={toStep(state)} />;
}
