import { getProfile } from "@/lib/profile";
import { ProfileWizard } from "@/components/profile/profile-wizard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  return <ProfileWizard initialProfile={profile} />;
}
