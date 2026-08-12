"use client";

import { useParams } from "next/navigation";
import { CompanyWorkspace } from "@/components/workspace/company-workspace";

export default function CompanyPage() {
  const params = useParams<{ id: string }>();
  return <CompanyWorkspace companyId={params.id} />;
}
