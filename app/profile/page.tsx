import { requireOnboardedUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { ProfileWizard } from "@/components/profile/profile-wizard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireOnboardedUser();
  const profile = await getProfile();
  return <ProfileWizard initialProfile={profile} />;
}
