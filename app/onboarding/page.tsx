import { redirect } from "next/navigation";
import { hasAIKey } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { isOnboarded } from "@/lib/onboarding";
import { getProfile } from "@/lib/profile";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireUser();
  if (await isOnboarded()) redirect("/");
  const profile = await getProfile();
  return <OnboardingWizard initialProfile={profile} aiConfigured={hasAIKey()} />;
}
