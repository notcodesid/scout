"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deleteCompanyAction } from "@/app/companies/actions";
import { Button, buttonVariants } from "@/components/ui/button";
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
          <ArrowLeft className="size-4" /> pipeline
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
            delete
          </Button>
        </div>
        {company.notes ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{company.notes}</p>
        ) : null}
      </div>

      <div
        className="flex flex-wrap items-center gap-x-7 gap-y-3"
        role="tablist"
        aria-label="pipeline stages"
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
                "flex items-center gap-2 py-1 text-sm lowercase transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                !unlocked && "cursor-not-allowed opacity-35 hover:text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
                  done
                    ? "bg-foreground text-background"
                    : isActive
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {done ? "\u2713" : i + 1}
              </span>
              <span className="whitespace-nowrap">{STAGE_LABELS[stage]}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-muted/40 p-6">
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
      </div>

      {company.fit?.recommendation === "skip" ? (
        <p className="text-sm text-muted-foreground">
          fit says skip. that&apos;s a feature — protecting your time is part of
          the product. if you disagree, answer the genuine-interest question and
          look again.
        </p>
      ) : null}
    </div>
  );
}
