import { requireUser } from "@/lib/auth";
import { getCompanies } from "@/lib/companies";
import { CompaniesPage } from "@/components/pipeline/companies-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireUser();
  const companies = await getCompanies();
  return <CompaniesPage companies={companies} />;
}
