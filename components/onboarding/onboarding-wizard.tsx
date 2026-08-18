"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  Check,
  Download,
  FileText,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  completeOnboardingAction,
  saveContactAction,
  uploadResumeAction,
  type ResumeUploadResult,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EvidenceProfile } from "@/lib/types";
import { COUNTRIES, countryByCode } from "./country-codes";

const STEP_COUNT = 3;

function Dots({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            i <= index ? "bg-foreground" : "bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function Field({
  label,
  optional,
  htmlFor,
  children,
}: {
  label: string;
  optional?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-sm font-medium">
        {label}
        {optional ? (
          <span className="text-sm font-normal text-muted-foreground">Optional</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

export function OnboardingWizard({
  initialProfile,
  aiConfigured,
}: {
  initialProfile: EvidenceProfile;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState(initialProfile.name);
  const [phoneCountry, setPhoneCountry] = useState(initialProfile.phoneCountry || "US");
  const [phone, setPhone] = useState(initialProfile.phone);
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile.linkedinUrl);
  const [noLinkedin, setNoLinkedin] = useState(!initialProfile.hasLinkedin);

  // Step 2
  const [resume, setResume] = useState<ResumeUploadResult | null>(
    initialProfile.resumeFileName
      ? { ok: true, fileName: initialProfile.resumeFileName }
      : null
  );
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Step 3
  const [github, setGithub] = useState(initialProfile.githubUsername);
  const [site, setSite] = useState("");
  const [research, setResearch] = useState("");
  const [x, setX] = useState("");
  const [extra, setExtra] = useState<{ label: string; url: string }[]>([]);

  const country = countryByCode(phoneCountry);

  async function next() {
    setError("");
    if (step === 0) {
      if (!name.trim()) return setError("Add your name so we know who you are.");
      if (!noLinkedin && !linkedinUrl.trim()) {
        return setError("Add your LinkedIn, or tick the box below if you don't have one.");
      }
      setBusy(true);
      try {
        await saveContactAction({
          name,
          phone,
          phoneCountry,
          linkedinUrl,
          hasLinkedin: !noLinkedin,
        });
        setStep(1);
      } catch {
        setError("Could not save. Check your connection and try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (step === 1) {
      if (noLinkedin && !resume?.ok) {
        return setError("Without LinkedIn, a resume is how we learn your background.");
      }
      setStep(2);
      return;
    }

    setBusy(true);
    try {
      const links = [
        { label: "Site", url: site },
        { label: "Research", url: research },
        { label: "X", url: x ? (x.startsWith("http") ? x : `https://x.com/${x.replace(/^@/, "")}`) : "" },
        ...extra,
      ].filter((l) => l.url.trim());
      await completeOnboardingAction({ githubUsername: github.trim(), links });
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not finish setup. Try again.");
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setError("");
    setBusy(true);
    setResume(null);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await uploadResumeAction(fd);
      setResume(res);
      if (!res.ok) setError(res.error ?? "Could not read that file.");
      // Seed step 3 from whatever the resume revealed, so the user confirms
      // rather than retypes.
      if (res.ok && res.profile) {
        if (res.profile.githubUsername) setGithub(res.profile.githubUsername);
        for (const l of res.profile.links) {
          const label = l.label.toLowerCase();
          if (label.includes("x") || label.includes("twitter")) setX((v) => v || l.url);
          else if (label.includes("paper") || label.includes("research")) setResearch((v) => v || l.url);
          else if (!label.includes("github") && !label.includes("linkedin")) {
            setSite((v) => v || l.url);
          }
        }
      }
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-8 shadow-sm sm:p-10">
        {step === 0 ? (
          <StepContact
            {...{
              name,
              setName,
              phone,
              setPhone,
              phoneCountry,
              setPhoneCountry,
              country,
              linkedinUrl,
              setLinkedinUrl,
              noLinkedin,
              setNoLinkedin,
            }}
          />
        ) : step === 1 ? (
          <StepResume
            noLinkedin={noLinkedin}
            resume={resume}
            busy={busy}
            dragging={dragging}
            setDragging={setDragging}
            aiConfigured={aiConfigured}
            fileInput={fileInput}
            onFile={upload}
            onClear={() => setResume(null)}
          />
        ) : (
          <StepWork
            {...{ github, setGithub, site, setSite, research, setResearch, x, setX, extra, setExtra }}
          />
        )}

        {error ? (
          <p className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex items-center">
          <div className="flex-1">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep((s) => s - 1);
                }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
            ) : null}
          </div>
          <Dots index={step} />
          <div className="flex flex-1 justify-end">
            <Button onClick={next} disabled={busy} className="min-w-24">
              {busy ? <Loader2 className="animate-spin" /> : null}
              {step === STEP_COUNT - 1 ? "Continue" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepContact(p: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  phoneCountry: string;
  setPhoneCountry: (v: string) => void;
  country: ReturnType<typeof countryByCode>;
  linkedinUrl: string;
  setLinkedinUrl: (v: string) => void;
  noLinkedin: boolean;
  setNoLinkedin: (v: boolean) => void;
}) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">How can we reach you?</h1>
      <p className="mt-3 text-muted-foreground">
        Let&apos;s build your profile. The basics take about two minutes, then your resume
        does the rest. Your progress saves automatically.
      </p>

      <div className="mt-8 space-y-6">
        <Field label="Name" htmlFor="o-name">
          <Input
            id="o-name"
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </Field>

        <Field label="Phone" optional htmlFor="o-phone">
          <div className="flex">
            <select
              aria-label="Country calling code"
              value={p.phoneCountry}
              onChange={(e) => p.setPhoneCountry(e.target.value)}
              className="h-9 rounded-l-md border border-r-0 border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.dial}
                </option>
              ))}
            </select>
            <Input
              id="o-phone"
              type="tel"
              className="rounded-l-none"
              value={p.phone}
              onChange={(e) => p.setPhone(e.target.value)}
              placeholder={p.country.placeholder}
              autoComplete="tel-national"
            />
          </div>
        </Field>

        <Field label="LinkedIn" htmlFor="o-linkedin">
          <Input
            id="o-linkedin"
            value={p.linkedinUrl}
            onChange={(e) => p.setLinkedinUrl(e.target.value)}
            placeholder="linkedin.com/in/you"
            disabled={p.noLinkedin}
          />
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={p.noLinkedin}
              onChange={(e) => {
                p.setNoLinkedin(e.target.checked);
                if (e.target.checked) p.setLinkedinUrl("");
              }}
              className="size-4 rounded border-input accent-foreground"
            />
            I don&apos;t have a LinkedIn account
          </label>
        </Field>
      </div>
    </>
  );
}

function StepResume(p: {
  noLinkedin: boolean;
  resume: ResumeUploadResult | null;
  busy: boolean;
  dragging: boolean;
  setDragging: (v: boolean) => void;
  aiConfigured: boolean;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const s = p.resume?.summary;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Add your resume</h1>
      <p className="mt-3 text-muted-foreground">
        {p.noLinkedin
          ? "Since you don't have LinkedIn, your resume is how we get to know your background and build your profile."
          : "Your resume fills in the rest. We pull out your projects, experience, education, and skills so you don't retype them."}
      </p>

      {p.resume?.ok ? (
        <div className="mt-8 rounded-xl border bg-background p-5">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.resume.fileName}</p>
              {s ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Found {s.projects} project{s.projects === 1 ? "" : "s"}, {s.experience} role
                  {s.experience === 1 ? "" : "s"}, {s.education} education entr
                  {s.education === 1 ? "y" : "ies"}, {s.skills} skill
                  {s.skills === 1 ? "" : "s"}
                  {s.links ? `, ${s.links} link${s.links === 1 ? "" : "s"}` : ""}.
                </p>
              ) : null}
              {p.resume.mock ? (
                <p className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                  No AI key configured, so nothing was extracted. The file was read, but
                  set AI_API_KEY and re-upload to fill your profile.
                </p>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  <Check className="size-3.5" /> Added to your profile — you can edit it later.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={p.onClear}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Remove resume"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            p.setDragging(true);
          }}
          onDragLeave={() => p.setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            p.setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) p.onFile(f);
          }}
          onClick={() => p.fileInput.current?.click()}
          className={cn(
            "mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
            p.dragging ? "border-foreground bg-accent" : "hover:bg-accent/40",
            p.busy && "pointer-events-none opacity-60"
          )}
        >
          {p.busy ? (
            <>
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="mt-3 font-medium">Reading your resume…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pulling out projects, experience, education, and skills.
              </p>
            </>
          ) : (
            <>
              <Download className="size-6 text-muted-foreground" />
              <p className="mt-3 font-medium">Upload or drag and drop</p>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF or Word (.docx), 10MB max
              </p>
            </>
          )}
          <input
            ref={p.fileInput}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </>
  );
}

function StepWork(p: {
  github: string;
  setGithub: (v: string) => void;
  site: string;
  setSite: (v: string) => void;
  research: string;
  setResearch: (v: string) => void;
  x: string;
  setX: (v: string) => void;
  extra: { label: string; url: string }[];
  setExtra: (v: { label: string; url: string }[]) => void;
}) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Show us your work</h1>
      <p className="mt-3 text-muted-foreground">
        GitHub, a personal site, published research, anything you&apos;re proud of. This is
        the proof-of-work part.
      </p>

      <div className="mt-8 space-y-6">
        <Field label="GitHub" htmlFor="o-github">
          <Input
            id="o-github"
            value={p.github}
            onChange={(e) => p.setGithub(e.target.value)}
            placeholder="github.com/your-handle"
          />
        </Field>
        <Field label="Site" optional htmlFor="o-site">
          <Input
            id="o-site"
            value={p.site}
            onChange={(e) => p.setSite(e.target.value)}
            placeholder="portfolio.example"
          />
        </Field>
        <Field label="Research" optional htmlFor="o-research">
          <Input
            id="o-research"
            value={p.research}
            onChange={(e) => p.setResearch(e.target.value)}
            placeholder="arxiv.org/abs/2406.01234"
          />
        </Field>
        <Field label="X" optional htmlFor="o-x">
          <Input
            id="o-x"
            value={p.x}
            onChange={(e) => p.setX(e.target.value)}
            placeholder="@ your_handle"
          />
        </Field>

        {p.extra.map((l, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Label" htmlFor={`o-extra-label-${i}`}>
                <Input
                  id={`o-extra-label-${i}`}
                  value={l.label}
                  onChange={(e) => {
                    const next = [...p.extra];
                    next[i] = { ...next[i], label: e.target.value };
                    p.setExtra(next);
                  }}
                  placeholder="Talk, podcast, demo…"
                />
              </Field>
            </div>
            <div className="flex-[2]">
              <Field label="URL" htmlFor={`o-extra-url-${i}`}>
                <Input
                  id={`o-extra-url-${i}`}
                  value={l.url}
                  onChange={(e) => {
                    const next = [...p.extra];
                    next[i] = { ...next[i], url: e.target.value };
                    p.setExtra(next);
                  }}
                  placeholder="https://…"
                />
              </Field>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => p.setExtra(p.extra.filter((_, j) => j !== i))}
              aria-label="Remove link"
            >
              <X />
            </Button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => p.setExtra([...p.extra, { label: "", url: "" }])}
          className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-4" /> Add another link
        </button>
      </div>
    </>
  );
}
