import { notFound } from "next/navigation";
import { getCompany } from "@/lib/companies";
import { CompanyWorkspace } from "@/components/workspace/company-workspace";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();
  return <CompanyWorkspace initialCompany={company} />;
}
