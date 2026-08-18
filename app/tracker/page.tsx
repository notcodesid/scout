import { requireOnboardedUser } from "@/lib/auth";
import { TrackerPage } from "@/components/tracker/tracker-page";
import { getCompanies } from "@/lib/companies";

export const dynamic = "force-dynamic";

export default async function Tracker() {
  await requireOnboardedUser();
  const companies = await getCompanies();
  return <TrackerPage companies={companies} />;
}
