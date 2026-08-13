"use client";

import Link from "next/link";
import { useState } from "react";
import { Info } from "lucide-react";
import { updateCompanyAction } from "@/app/companies/actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { Company } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function TrackerPage({ companies }: { companies: Company[] }) {
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(companies.map((c) => [c.id, c.followUpDate]))
  );

  if (companies.length === 0) {
    return (
      <EmptyState
        title="Nothing to track yet"
        description="Add companies in the pipeline first. The tracker only nudges follow-ups when the application was actually strong."
        action={
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Go to pipeline
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow-ups amplify signal; they don't create it. Only nudge a strong application.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Verdict</th>
              <th className="px-4 py-3 font-medium">Proof</th>
              <th className="px-4 py-3 font-medium">Quality</th>
              <th className="px-4 py-3 font-medium">Follow-up date</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const doneTasks = company.proofTasks.filter((t) => t.done).length;
              const strong =
                Boolean(company.quality) &&
                (company.quality?.score ?? 0) >= 75 &&
                company.fit?.recommendation !== "skip";
              return (
                <tr key={company.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-medium hover:underline"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{STAGE_LABELS[company.stage]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {company.fit ? (
                      <Badge
                        variant={
                          company.fit.recommendation === "apply"
                            ? "success"
                            : company.fit.recommendation === "skip"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {company.fit.recommendation}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {company.proofTasks.length > 0
                      ? `${doneTasks}/${company.proofTasks.length}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {company.quality ? (
                      <span
                        className={
                          company.quality.score >= 75
                            ? "font-medium text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }
                      >
                        {company.quality.score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      aria-label={`Follow-up date for ${company.name}`}
                      value={dates[company.id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDates((prev) => ({ ...prev, [company.id]: value }));
                        updateCompanyAction(company.id, { followUpDate: value }).catch(() => {});
                      }}
                      className="h-8 w-40"
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{timeAgo(company.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-600/30 bg-amber-600/5 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground">
          The follow-up rule from the source article: follow up if your application was strong, with
          real effort behind it. If the quality score is below 75 or the verdict was skip, spend the
          time on proof instead. Follow-ups don't create signal.
        </p>
      </div>
    </div>
  );
}
