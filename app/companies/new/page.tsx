import { requireOnboardedUser } from "@/lib/auth";
import { AddCompanyForm } from "@/components/pipeline/add-company-form";

export const dynamic = "force-dynamic";

// Static segment, so this wins over /companies/[id] — "new" is never treated
// as a company id.
export default async function NewCompanyPage() {
  await requireOnboardedUser();
  return <AddCompanyForm />;
}
