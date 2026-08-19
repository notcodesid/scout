"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deleteCompanyAction } from "@/app/companies/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stageDone, stageUnlocked, lockReason } from "@/lib/pipeline";
import { STAGE_LABELS, STAGE_ORDER, type Company, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  FitStage,
  OutreachStage,
  ProofStage,
  QualityStage,
  ResearchStage,
} from "./stages";

export function CompanyWorkspace({ initialCompany }: { initialCompany: Company }) {
  const router = useRouter();
  const [company, setCompany] = useState<Company>(initialCompany);
  const [active, setActive] = useState<Stage>(() =>
    STAGE_ORDER.find((s) => !stageDone(initialCompany, s)) ?? "quality"
  );

  async function remove() {
    await deleteCompanyAction(company.id);
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Pipeline
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          {company.url ? (
            <a
              href={company.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" /> website
            </a>
          ) : null}
          {company.jobUrl ? (
            <a
              href={company.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" /> job post
            </a>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={remove}
          >
            Delete
          </Button>
        </div>
        {company.notes ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{company.notes}</p>
        ) : null}
      </div>

      <div
        className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1"
        role="tablist"
        aria-label="Pipeline stages"
      >
        {STAGE_ORDER.map((stage, i) => {
          const done = stageDone(company, stage);
          const unlocked = stageUnlocked(company, stage);
          const isActive = active === stage;
          return (
            <button
              key={stage}
              role="tab"
              aria-selected={isActive}
              disabled={!unlocked}
              title={!unlocked ? lockReason(stage) : undefined}
              onClick={() => setActive(stage)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
                !unlocked && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                {STAGE_LABELS[stage]}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="p-5 sm:p-6">
        {active === "research" ? (
          <ResearchStage company={company} setCompany={setCompany} />
        ) : active === "fit" ? (
          <FitStage company={company} setCompany={setCompany} />
        ) : active === "proof" ? (
          <ProofStage company={company} setCompany={setCompany} />
        ) : active === "outreach" ? (
          <OutreachStage company={company} setCompany={setCompany} />
        ) : (
          <QualityStage company={company} setCompany={setCompany} />
        )}
      </Card>

      {company.fit?.recommendation === "skip" ? (
        <p className="text-sm text-muted-foreground">
          Fit says skip. That's a feature: protecting your time is part of the product. If you
          disagree, answer the genuine-interest question and look again.
        </p>
      ) : null}
    </div>
  );
}
