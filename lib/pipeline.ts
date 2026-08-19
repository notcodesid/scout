import { STAGE_ORDER, type Company, type Stage } from "./types";

// The five-stage gate is the product: you cannot reach outreach without
// verified research, a fit verdict, and a completed proof task. This module is
// the single definition of that gate — the workspace tabs and the pipeline list
// both read it, so they can never disagree about what is unlocked.

export function stageDone(company: Company, stage: Stage): boolean {
  switch (stage) {
    case "research":
      return Boolean(company.dossier);
    case "fit":
      return Boolean(company.fit);
    case "proof":
      return company.proofTasks.some((t) => t.done);
    case "outreach":
      return Boolean(company.outreach);
    case "quality":
      return Boolean(company.quality);
  }
}

export function stageUnlocked(company: Company, stage: Stage): boolean {
  switch (stage) {
    case "research":
      return true;
    case "fit":
      return Boolean(company.dossier?.verified);
    case "proof":
      return Boolean(company.fit);
    case "outreach":
      return (
        Boolean(company.dossier?.verified) &&
        Boolean(company.fit) &&
        company.proofTasks.some((t) => t.done)
      );
    case "quality":
      return Boolean(company.outreach);
  }
}

export function lockReason(stage: Stage): string {
  switch (stage) {
    case "fit":
      return "verify the research dossier first";
    case "proof":
      return "complete the fit analysis first";
    case "outreach":
      return "verify research, finish fit analysis, and complete at least one proof task";
    case "quality":
      return "draft outreach first";
    default:
      return "";
  }
}

export function doneCount(company: Company): number {
  return STAGE_ORDER.filter((s) => stageDone(company, s)).length;
}

export interface NextAction {
  /** What to do next, in the imperative. */
  label: string;
  /** false when nothing is owed — skipped, or finished. */
  actionable: boolean;
  /** true once every stage is complete. */
  complete: boolean;
}

// Walks the same gate in order and reports the first thing standing in the way.
// Order matters: an unverified dossier blocks fit even though fit is "next".
export function nextAction(company: Company): NextAction {
  if (company.fit?.recommendation === "skip") {
    return { label: "fit says skip — protecting your time", actionable: false, complete: false };
  }
  if (!company.dossier) {
    return { label: "run research to build the dossier", actionable: true, complete: false };
  }
  if (!company.dossier.verified) {
    return { label: "verify the dossier — fit is locked until you do", actionable: true, complete: false };
  }
  if (!company.fit) {
    return { label: "run the fit analysis", actionable: true, complete: false };
  }
  if (!company.proofTasks.length) {
    return { label: "add a proof task", actionable: true, complete: false };
  }
  const done = company.proofTasks.filter((t) => t.done).length;
  if (!done) {
    return {
      label: `complete a proof task — 0 of ${company.proofTasks.length} done, outreach locked`,
      actionable: true,
      complete: false,
    };
  }
  if (!company.outreach) {
    return { label: "draft the outreach", actionable: true, complete: false };
  }
  if (!company.quality) {
    return { label: "run the quality check", actionable: true, complete: false };
  }
  return { label: "ready to send", actionable: false, complete: true };
}

/** followUpDate is a plain YYYY-MM-DD string, compared as such to avoid timezone drift. */
export function followUpDue(company: Company, today: string): boolean {
  if (!company.followUpDate) return false;
  return company.followUpDate <= today;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Actionable work first, then waiting, then skipped — most recently touched
// first within each band.
export function sortForPipeline(companies: Company[]): Company[] {
  const rank = (c: Company) => {
    const n = nextAction(c);
    if (n.actionable) return 0;
    if (n.complete) return 1;
    return 2; // skipped
  };
  return [...companies].sort(
    (a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt
  );
}
