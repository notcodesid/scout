"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCompanyAction } from "@/app/companies/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function AddCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const company = await addCompanyAction({
        name: name.trim(),
        url: url.trim(),
        jobUrl: jobUrl.trim(),
        notes: notes.trim(),
      });
      // Adding a company is the start of working it, so go straight into the
      // stages. The workspace opens on the first unfinished one — research.
      router.push(`/companies/${company.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not add the company");
      // Only reset on failure: on success the component unmounts mid-navigation,
      // and the typed input survives if the push never lands.
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">add company</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          one company at a time. once it&apos;s in, you go straight to research.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl bg-muted/40 p-6 sm:grid-cols-2">
        <Field label="company name" htmlFor="c-name">
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Labs"
            autoFocus
            required
          />
        </Field>
        <Field label="company url" htmlFor="c-url">
          <Input
            id="c-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://acme.com"
          />
        </Field>
        <Field label="job post url" htmlFor="c-job" className="sm:col-span-2">
          <Input
            id="c-job"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://acme.com/jobs/engineer"
          />
        </Field>
        <Field
          label="what do you know already?"
          htmlFor="c-notes"
          hint="the job post, founder names, anything you found. research builds from this."
          className="sm:col-span-2"
        >
          <Textarea
            id="c-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="paste the job post, requirements, or your own notes..."
            rows={5}
          />
        </Field>

        {error ? (
          <p className="text-sm text-destructive sm:col-span-2">{error}</p>
        ) : null}

        <div className="flex items-center gap-1 pt-1 sm:col-span-2">
          <Button type="submit" disabled={!name.trim() || saving}>
            {saving ? "adding..." : "add to pipeline"}
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
            cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
