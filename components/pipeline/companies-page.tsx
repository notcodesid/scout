"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Plus, Trash2 } from "lucide-react";
import { addCompanyAction, deleteCompanyAction } from "@/app/companies/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export function CompaniesPage({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await addCompanyAction({
        name: name.trim(),
        url: url.trim(),
        jobUrl: jobUrl.trim(),
        notes: notes.trim(),
      });
      setName("");
      setUrl("");
      setJobUrl("");
      setNotes("");
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add company");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await deleteCompanyAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fewer companies, better applications. One company at a time, through research, fit,
            proof, outreach, and quality.
          </p>
        </div>
        <Button onClick={() => setFormOpen((v) => !v)}>
          <Plus /> Add company
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" htmlFor="c-name">
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Labs"
                  required
                />
              </Field>
              <Field label="Company URL" htmlFor="c-url">
                <Input
                  id="c-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://acme.com"
                />
              </Field>
              <Field label="Job post URL" htmlFor="c-job">
                <Input
                  id="c-job"
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://acme.com/jobs/engineer"
                />
              </Field>
              <Field
                label="What do you know already?"
                htmlFor="c-notes"
                hint="Paste the job description, founder names, or anything you found. The research stage builds from this."
                className="sm:col-span-2"
              >
                <Textarea
                  id="c-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste the job post or any notes..."
                />
              </Field>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={!name.trim() || saving}>
                  {saving ? "Adding..." : "Add to pipeline"}
                </Button>
                <Button variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title="No companies yet"
          description="Add the first company you want to apply to properly, then work it through the pipeline. The point is to go deep, not wide."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Add company
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {companies.map((company) => {
            const doneTasks = company.proofTasks.filter((t) => t.done).length;
            return (
              <Card key={company.id}>
                <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/companies/${company.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {company.name || "Untitled company"}
                      </Link>
                      <Badge variant="secondary">{STAGE_LABELS[company.stage]}</Badge>
                      {company.fit?.recommendation ? (
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
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {timeAgo(company.updatedAt)}
                      {company.proofTasks.length > 0
                        ? ` · proof ${doneTasks}/${company.proofTasks.length}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/companies/${company.id}`}
                    aria-label={`Open ${company.name}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                  >
                    <ArrowRight />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(company.id)}
                    aria-label={`Delete ${company.name}`}
                  >
                    <Trash2 />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
