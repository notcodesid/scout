import { getProfile } from "@/lib/profile";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  return <ProfileEditor initialProfile={profile} />;
}
