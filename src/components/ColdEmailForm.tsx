import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, ExternalLink, FileText, Globe, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import ResumeUpload from "./ResumeUpload";
import EmailPreview from "./EmailPreview";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ApplyFlowDraft,
  CandidateProfile,
  GeneratedEmail,
  JobMatch,
  ProfileSourceEvidence,
  defaultCandidateProfile,
  profileToSubmissionPayload,
} from "@/lib/mvp1";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "scout-mvp1-apply-draft";
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

function generateUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyDraft(): ApplyFlowDraft {
  return {
    step: 1,
    submissionId: null,
    portfolioUrl: null,
    portfolioLabel: null,
    resumePath: null,
    resumeName: null,
    sourceEvidence: null,
    profile: null,
    selectedJobIds: [],
    jobMatches: [],
    generatedEmails: [],
  };
}

function serializeDraft(draft: ApplyFlowDraft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function readDraft(): ApplyFlowDraft | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ApplyFlowDraft>;
    return {
      ...emptyDraft(),
      ...parsed,
      sourceEvidence: parsed.sourceEvidence || null,
      selectedJobIds: parsed.selectedJobIds || [],
      jobMatches: parsed.jobMatches || [],
      generatedEmails: parsed.generatedEmails || [],
      profile: parsed.profile ? { ...defaultCandidateProfile(), ...parsed.profile } : null,
    };
  } catch {
    return null;
  }
}

function parseCommaList(input: string) {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function profileToFormState(profile: CandidateProfile) {
  return {
    ...profile,
    skills: profile.skills.join(", "),
    preferredRoles: profile.preferredRoles.join(", "),
    experienceYears: String(profile.experienceYears || ""),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildProfileFromForm(values: Record<string, string>): CandidateProfile {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    linkedinUrl: values.linkedinUrl.trim(),
    githubUrl: values.githubUrl.trim(),
    portfolioUrl: values.portfolioUrl.trim(),
    skills: parseCommaList(values.skills),
    experienceYears: Number.parseInt(values.experienceYears || "0", 10) || 0,
    education: values.education.trim(),
    preferredRoles: parseCommaList(values.preferredRoles),
    summary: values.summary.trim(),
  };
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const initialFormValues = {
  fullName: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  skills: "",
  experienceYears: "",
  education: "",
  preferredRoles: "",
  summary: "",
};

const ColdEmailForm = () => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ApplyFlowDraft>(() => readDraft() || emptyDraft());
  const [portfolioInputUrl, setPortfolioInputUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    serializeDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (draft.profile) {
      setFormValues(profileToFormState(draft.profile));
    }
  }, [draft.profile]);

  useEffect(() => {
    if (draft.portfolioUrl) {
      setPortfolioInputUrl(draft.portfolioUrl);
    }
  }, [draft.portfolioUrl]);

  const selectedJobs = useMemo(() => {
    const selectedIds = new Set(draft.selectedJobIds);
    return draft.jobMatches.filter((job) => selectedIds.has(job.jobId));
  }, [draft.jobMatches, draft.selectedJobIds]);

  const selectedResumeName = resumeFile?.name || draft.resumeName;
  const hasResumeSource = Boolean(resumeFile || draft.resumePath);
  const hasPortfolioSource = Boolean(portfolioInputUrl.trim() || draft.portfolioUrl);

  const updateDraft = (updater: (current: ApplyFlowDraft) => ApplyFlowDraft) => {
    setDraft((current) => updater(current));
  };

  const updateFormValue = (field: keyof typeof initialFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const resetFlow = () => {
    setPortfolioInputUrl("");
    setResumeFile(null);
    setFormValues(initialFormValues);
    localStorage.removeItem(STORAGE_KEY);
    setDraft(emptyDraft());
  };

  const removeResume = () => {
    setResumeFile(null);
    updateDraft((current) => ({
      ...current,
      resumePath: null,
      resumeName: null,
      sourceEvidence: current.step === 1 ? null : current.sourceEvidence,
    }));
  };

  const uploadResume = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Resume must be a PDF file");
    }

    if (file.size > MAX_RESUME_BYTES) {
      throw new Error("Resume must be 10MB or smaller");
    }

    const resumePath = `${generateUuid()}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage.from("resumes").upload(resumePath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/pdf",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    return {
      resumePath,
      resumeName: file.name,
    };
  };

  const ensureSubmission = async (
    profile: CandidateProfile,
    profileSource: "resume_llm" | "portfolio_url" | "combined_sources" | "edited",
    options?: {
      resumePath?: string | null;
      portfolioUrl?: string | null;
    },
  ) => {
    const payload = {
      ...profileToSubmissionPayload({
        ...profile,
        portfolioUrl: profile.portfolioUrl || options?.portfolioUrl || draft.portfolioUrl || "",
      }),
      id: draft.submissionId || generateUuid(),
      resume_url: options?.resumePath ?? draft.resumePath ?? null,
      profile_source: profileSource,
      user_id: null,
    };

    if (draft.submissionId) {
      const { error } = await supabase
        .from("engineer_submissions")
        .update(payload)
        .eq("id", draft.submissionId);

      if (error) throw error;
      return draft.submissionId;
    }

    const { error } = await supabase.from("engineer_submissions").insert(payload);
    if (error) throw error;

    updateDraft((current) => ({ ...current, submissionId: payload.id }));
    return payload.id;
  };

  const handleExtractProfile = async () => {
    const trimmedPortfolioUrl = portfolioInputUrl.trim();
    let normalizedPortfolioUrl: string | null = null;

    if (trimmedPortfolioUrl) {
      try {
        normalizedPortfolioUrl = new URL(trimmedPortfolioUrl).toString();
      } catch {
        if (!hasResumeSource) {
          toast({
            title: "Invalid URL",
            description: "Enter a valid public portfolio URL or remove it and continue with the resume only.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Ignoring invalid portfolio URL",
          description: "Resume extraction will continue without the invalid portfolio link.",
        });
      }
    }

    let resumePath = draft.resumePath;
    let resumeName = draft.resumeName;

    if (resumeFile) {
      setIsExtracting(true);
      try {
        const uploadedResume = await uploadResume(resumeFile);
        resumePath = uploadedResume.resumePath;
        resumeName = uploadedResume.resumeName;
      } catch (error: unknown) {
        setIsExtracting(false);
        toast({
          title: "Resume upload failed",
          description: getErrorMessage(error, "We could not upload the resume file."),
          variant: "destructive",
        });
        return;
      }
    }

    if (!normalizedPortfolioUrl && !resumePath) {
      toast({
        title: "Add at least one source",
        description: "Upload a resume, paste a portfolio URL, or provide both before continuing.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-candidate-profile", {
        body: {
          submissionId: draft.submissionId || undefined,
          portfolioUrl: normalizedPortfolioUrl || undefined,
          resumePath: resumePath || undefined,
          fileName: resumeName || undefined,
        },
      });

      if (error) {
        throw error;
      }

      const profile = (data?.profile || defaultCandidateProfile()) as CandidateProfile;
      const sourceEvidence = (data?.sourceEvidence || null) as ProfileSourceEvidence | null;

      updateDraft((current) => ({
        ...current,
        step: 2,
        portfolioUrl: profile.portfolioUrl || normalizedPortfolioUrl,
        portfolioLabel: (profile.portfolioUrl || normalizedPortfolioUrl)
          ? new URL(profile.portfolioUrl || normalizedPortfolioUrl || "").hostname.replace(/^www\./, "")
          : null,
        resumePath: resumePath || null,
        resumeName: resumeName || null,
        sourceEvidence,
        profile,
      }));

      if (resumeFile) {
        setResumeFile(null);
      }

      const profileSource =
        normalizedPortfolioUrl && resumePath
          ? "combined_sources"
          : resumePath
            ? "resume_llm"
            : "portfolio_url";

      await ensureSubmission(
        {
          ...profile,
          portfolioUrl: profile.portfolioUrl || normalizedPortfolioUrl || "",
        },
        profileSource,
        {
          resumePath,
          portfolioUrl: normalizedPortfolioUrl,
        },
      );

      const warnings = sourceEvidence?.warnings || [];
      if (warnings.length > 0) {
        toast({
          title: "Profile extracted with warnings",
          description: warnings[0],
        });
      } else {
        toast({
          title: "Profile extracted",
          description: "Review the extracted profile before matching.",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Extraction failed",
        description: getErrorMessage(error, "We could not extract a profile from the provided sources."),
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMatchJobs = async () => {
    const profile = buildProfileFromForm(formValues);

    if (!profile.fullName || !profile.email) {
      toast({
        title: "Profile incomplete",
        description: "Full name and email are required.",
        variant: "destructive",
      });
      return;
    }

    setIsMatching(true);
    try {
      const submissionId = await ensureSubmission(profile, "edited");

      const { data, error } = await supabase.functions.invoke("match-jobs", {
        body: {
          submissionId,
          candidateProfile: profile,
          limit: 12,
        },
      });

      if (error) {
        throw error;
      }

      updateDraft((current) => ({
        ...current,
        step: 3,
        submissionId,
        profile,
        selectedJobIds: [],
        jobMatches: (data?.data || []) as JobMatch[],
        generatedEmails: [],
      }));

      toast({
        title: "Jobs ranked",
        description: `${(data?.data || []).length} matches are ready to review.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Matching failed",
        description: getErrorMessage(error, "We could not rank jobs right now."),
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleToggleJob = (job: JobMatch) => {
    updateDraft((current) => {
      const selectedJobIds = current.selectedJobIds.includes(job.jobId)
        ? current.selectedJobIds.filter((item) => item !== job.jobId)
        : [...current.selectedJobIds, job.jobId];

      return {
        ...current,
        selectedJobIds,
      };
    });
  };

  const handleGenerateEmails = async () => {
    if (!draft.profile) {
      toast({
        title: "Profile missing",
        description: "Profile extraction and review must be completed first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedJobs.length === 0) {
      toast({
        title: "Select at least one job",
        description: "Choose the roles you want draft emails for.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cold-email", {
        body: {
          submissionId: draft.submissionId,
          candidateProfile: draft.profile,
          selectedTargets: selectedJobs,
          userId: null,
        },
      });

      if (error) throw error;

      updateDraft((current) => ({
        ...current,
        step: 4,
        generatedEmails: (data?.emails || []) as GeneratedEmail[],
      }));

      toast({
        title: "Emails generated",
        description: "Your copy-paste outreach drafts are ready.",
      });
    } catch (error: unknown) {
      toast({
        title: "Generation failed",
        description: getErrorMessage(error, "We could not generate the email drafts."),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                draft.step >= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {draft.step > step ? <CheckCircle className="h-4 w-4" /> : step}
            </div>
            {step < 4 && <div className={cn("h-0.5 w-14", draft.step > step ? "bg-primary" : "bg-secondary")} />}
          </div>
        ))}
      </div>

      <div className="mb-8 flex justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span>Add Sources</span>
        <span>Review Profile</span>
        <span>Select Jobs</span>
        <span>Copy Emails</span>
      </div>

      <div className="glass-card p-6 md:p-8">
        {draft.step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">Add a resume, portfolio, or both</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Scout can extract your profile from a resume PDF, a public portfolio, or both together. The combined path usually gives the best matching result.
              </p>
            </div>

            {(draft.resumeName || draft.portfolioLabel) && !resumeFile && !portfolioInputUrl && (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-sm text-muted-foreground">
                Saved draft found{draft.portfolioLabel ? ` for ${draft.portfolioLabel}` : ""}{draft.resumeName ? ` with ${draft.resumeName}` : ""}. You can continue from the last step or add fresh sources to restart.
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Resume PDF</p>
                </div>
                <ResumeUpload
                  selectedFileName={selectedResumeName}
                  hasUploadedFile={Boolean(draft.resumePath) && !resumeFile}
                  onFileSelect={setResumeFile}
                  onRemove={removeResume}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Portfolio URL</p>
                </div>
                <Input
                  type="url"
                  placeholder="https://www.notcodesid.com/"
                  value={portfolioInputUrl}
                  onChange={(event) => setPortfolioInputUrl(event.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Use your personal site, portfolio, or public project site. At least one source is required.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleExtractProfile()} disabled={isExtracting || (!hasResumeSource && !hasPortfolioSource)}>
                {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Extract Profile
              </Button>
              {draft.profile && (
                <Button variant="outline" onClick={() => updateDraft((current) => ({ ...current, step: Math.max(2, current.step) }))}>
                  Use saved draft
                </Button>
              )}
            </div>
          </div>
        )}

        {draft.step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold">Review extracted profile</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Edit anything the parser missed. This reviewed version drives matching and email generation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft.resumeName && <Badge variant="secondary">{draft.resumeName}</Badge>}
                {draft.portfolioLabel && <Badge variant="secondary">{draft.portfolioLabel}</Badge>}
              </div>
            </div>

            {draft.sourceEvidence && (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {draft.sourceEvidence.usedSources.map((source) => (
                    <Badge key={source} variant="outline">
                      {source === "resume" ? "Resume used" : "Portfolio used"}
                    </Badge>
                  ))}
                  {draft.sourceEvidence.fallbackUsed && (
                    <Badge variant="accent">Fallback used</Badge>
                  )}
                </div>
                {draft.sourceEvidence.warnings.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {draft.sourceEvidence.warnings.join(" ")}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Full name" value={formValues.fullName} onChange={(event) => updateFormValue("fullName", event.target.value)} />
              <Input type="email" placeholder="Email" value={formValues.email} onChange={(event) => updateFormValue("email", event.target.value)} />
              <Input placeholder="Phone" value={formValues.phone} onChange={(event) => updateFormValue("phone", event.target.value)} />
              <Input placeholder="Years of experience" value={formValues.experienceYears} onChange={(event) => updateFormValue("experienceYears", event.target.value)} />
              <Input placeholder="LinkedIn URL" value={formValues.linkedinUrl} onChange={(event) => updateFormValue("linkedinUrl", event.target.value)} />
              <Input placeholder="GitHub URL" value={formValues.githubUrl} onChange={(event) => updateFormValue("githubUrl", event.target.value)} />
              <Input placeholder="Portfolio URL" value={formValues.portfolioUrl} onChange={(event) => updateFormValue("portfolioUrl", event.target.value)} />
              <Input placeholder="Preferred roles, comma separated" value={formValues.preferredRoles} onChange={(event) => updateFormValue("preferredRoles", event.target.value)} />
            </div>

            <Input placeholder="Skills, comma separated" value={formValues.skills} onChange={(event) => updateFormValue("skills", event.target.value)} />
            <Input placeholder="Education" value={formValues.education} onChange={(event) => updateFormValue("education", event.target.value)} />
            <Textarea
              placeholder="Short professional summary"
              value={formValues.summary}
              onChange={(event) => updateFormValue("summary", event.target.value)}
              className="min-h-[140px]"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={() => updateDraft((current) => ({ ...current, step: 1 }))}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => void handleMatchJobs()} disabled={isMatching}>
                {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Find Job Fits
              </Button>
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">Choose jobs to draft for</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These roles are ranked from your reviewed profile. Pick the ones worth sending a manual outreach email to.
              </p>
            </div>

            {draft.jobMatches.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
                No job matches are available yet. Go back and tighten the profile details before trying again.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {draft.jobMatches.map((job) => {
                  const isSelected = draft.selectedJobIds.includes(job.jobId);
                  const meta = [job.location, job.jobType].filter(Boolean).join(" • ");

                  return (
                    <button
                      key={job.jobId}
                      type="button"
                      onClick={() => handleToggleJob(job)}
                      className={cn(
                        "rounded-2xl border p-5 text-left transition-all",
                        isSelected ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40 hover:bg-secondary/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{job.jobTitle}</p>
                            <Badge variant="secondary">{job.matchScore}% fit</Badge>
                            {job.companyBatch && <Badge variant="accent">{job.companyBatch}</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{job.companyName}</p>
                        </div>
                        <div className={cn("mt-1 h-5 w-5 rounded-full border", isSelected ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {job.companyOneLiner || "Company summary is not available for this role yet."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.fitReasons.map((reason) => (
                          <Badge key={reason} variant="outline" className="whitespace-normal text-left">
                            {reason}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span>{meta || "Details unavailable"}</span>
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Review job
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={() => updateDraft((current) => ({ ...current, step: 2 }))}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => void handleGenerateEmails()} disabled={isGenerating || selectedJobs.length === 0}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Generate Emails
              </Button>
            </div>
          </div>
        )}

        {draft.step === 4 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold">Copy and send</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  These drafts are plain-text outreach emails you can paste directly into your email client.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => updateDraft((current) => ({ ...current, step: 3 }))}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button variant="ghost" onClick={resetFlow}>
                  Start Over
                </Button>
              </div>
            </div>

            <EmailPreview emails={draft.generatedEmails} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ColdEmailForm;
