import { requireOnboardedUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { ProfileView } from "@/components/profile/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireOnboardedUser();
  const profile = await getProfile();
  return <ProfileView initialProfile={profile} />;
}
