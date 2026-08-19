"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, Plus, Trash2 } from "lucide-react";
import { deleteCompanyAction } from "@/app/companies/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  doneCount,
  followUpDue,
  nextAction,
  sortForPipeline,
  todayISO,
} from "@/lib/pipeline";
import type { Company } from "@/lib/types";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";


/** Five dots, one per stage — the gate made visible at a glance. */
function StageTrack({ company }: { company: Company }) {
  const done = doneCount(company);
  return (
    <span className="flex items-center gap-1" aria-label={`${done} of 5 stages complete`}>
      {STAGE_ORDER.map((stage, i) => (
        <span
          key={stage}
          title={STAGE_LABELS[stage]}
          className={cn(
            "size-1.5 rounded-full",
            i < done ? "bg-foreground" : "bg-muted-foreground/25"
          )}
        />
      ))}
    </span>
  );
}

export function CompaniesPage({ companies }: { companies: Company[] }) {
  const router = useRouter();

  async function remove(id: string) {
    await deleteCompanyAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight">pipeline</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Fewer companies, better applications. One company at a time, through research, fit,
            proof, outreach, and quality.
          </p>
        </div>
        {companies.length > 0 ? (
          <Link href="/companies/new" className={cn(buttonVariants())}>
            <Plus /> add company
          </Link>
        ) : null}
      </div>

      {/* followUpDate reminder */}
      {(() => {
        const today = todayISO();
        const due = companies.filter((c) => followUpDue(c, today));
        if (!due.length) return null;
        return (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-amber-500/10 px-4 py-3 text-sm">
            <Bell className="size-4 shrink-0 text-amber-700" />
            <span className="text-amber-800">
              {due.length} {due.length === 1 ? "company needs" : "companies need"} a follow-up
            </span>
            <span className="text-amber-700/80">
              {due.map((c) => c.name || "untitled").join(", ")}
            </span>
          </div>
        );
      })()}

      {companies.length === 0 ? (
        <div className="flex flex-col items-center gap-6 px-6 py-24 text-center">
          <div className="space-y-2">
            <p className="text-[15px] font-medium">no companies yet</p>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              scout works one company at a time. outreach stays locked until you
              have verified research, an honest fit verdict, and one completed
              proof task.
            </p>
          </div>

          <Link href="/companies/new" className={cn(buttonVariants())}>
            <Plus /> add company
          </Link>

          {/* The gate, stated once and quietly. Read from STAGE_ORDER so it can
              never drift from the stages the workspace actually enforces. */}
          <ol className="flex flex-wrap items-center justify-center gap-2 pt-6 font-mono text-[11px] lowercase text-muted-foreground/60">
            {STAGE_ORDER.map((stage, i) => (
              <li key={stage} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden>&rarr;</span> : null}
                <span>{STAGE_LABELS[stage]}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : companies.length > 0 ? (
        <div className="space-y-2">
          {sortForPipeline(companies).map((company) => {
            const next = nextAction(company);
            const due = followUpDue(company, todayISO());
            return (
              <Card
                key={company.id}
                className={cn(
                  "group border-transparent bg-card/70 shadow-none transition-colors hover:border-border hover:bg-card",
                  // Nothing owed: recede so the eye lands on live work.
                  !next.actionable && "opacity-60"
                )}
              >
                <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Link
                        href={`/companies/${company.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {company.name || "untitled company"}
                      </Link>
                      <StageTrack company={company} />
                      <span className="font-mono text-[11px] lowercase text-muted-foreground">
                        {STAGE_LABELS[company.stage]}
                      </span>
                      {due ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
                          <Bell className="size-3" /> follow up
                        </span>
                      ) : null}
                    </div>
                    {/* The point of the row: what is standing in the way. */}
                    <p
                      className={cn(
                        "mt-1.5 truncate text-sm",
                        next.actionable ? "text-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {next.label}
                    </p>
                  </div>

                  <span className="hidden shrink-0 font-mono text-[11px] lowercase text-muted-foreground sm:block">
                    {timeAgo(company.updatedAt)}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(company.id)}
                      aria-label={`delete ${company.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Link
                    href={`/companies/${company.id}`}
                    aria-label={`open ${company.name}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "shrink-0 text-muted-foreground"
                    )}
                  >
                    <ArrowRight />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

