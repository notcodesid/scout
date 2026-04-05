import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Briefcase, Building2, CheckCircle, ExternalLink, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import ResumeUpload from "./ResumeUpload";
import EmailPreview from "./EmailPreview";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApplyFlowDraft, CandidateProfile, GeneratedEmail, JobMatch, MatchTarget, StartupMatch, defaultCandidateProfile, profileToSubmissionPayload } from "@/lib/mvp1";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "scout-mvp1-apply-draft";

function generateUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function serializeDraft(draft: ApplyFlowDraft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function readDraft(): ApplyFlowDraft | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ApplyFlowDraft;
  } catch {
    return null;
  }
}

function emptyDraft(): ApplyFlowDraft {
  return {
    step: 1,
    submissionId: null,
    storagePath: null,
    resumeUrl: null,
    resumeName: null,
    profile: null,
    selectedMode: "jobs",
    selectedTargetIds: [],
    jobMatches: [],
    startupMatches: [],
    generatedEmails: [],
  };
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

  const currentTargets = draft.selectedMode === "jobs" ? draft.jobMatches : draft.startupMatches;
  const selectedTargets = useMemo(() => {
    const selectedIds = new Set(draft.selectedTargetIds);
    return currentTargets.filter((target) => selectedIds.has(target.targetType === "job" ? target.jobId : target.id));
  }, [currentTargets, draft.selectedTargetIds]);

  const topJobScore = draft.jobMatches[0]?.matchScore || 0;
  const shouldSuggestStartups = draft.jobMatches.length === 0 || topJobScore < 55;

  const updateDraft = (updater: (current: ApplyFlowDraft) => ApplyFlowDraft) => {
    setDraft((current) => updater(current));
  };

  const updateFormValue = (field: keyof typeof initialFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const resetFlow = () => {
    setResumeFile(null);
    setFormValues(initialFormValues);
    localStorage.removeItem(STORAGE_KEY);
    setDraft(emptyDraft());
  };

  const ensureSubmission = async (profile: CandidateProfile, profileSource: "resume_llm" | "edited") => {
    const payload = {
      ...profileToSubmissionPayload(profile),
      id: draft.submissionId || generateUuid(),
      resume_url: draft.resumeUrl,
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
    if (!resumeFile) {
      toast({
        title: "Resume required",
        description: "Upload a PDF resume to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const storagePath = `guest/${Date.now()}-${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, resumeFile);
      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from("resumes").getPublicUrl(storagePath);
      const { data, error } = await supabase.functions.invoke("extract-candidate-profile", {
        body: {
          resumePath: storagePath,
          fileName: resumeFile.name,
        },
      });

      if (error) {
        throw error;
      }

      const profile = (data?.profile || defaultCandidateProfile()) as CandidateProfile;
      updateDraft((current) => ({
        ...current,
        step: 2,
        storagePath,
        resumeUrl: publicData.publicUrl,
        resumeName: resumeFile.name,
        profile,
      }));

      await ensureSubmission(profile, "resume_llm");

      toast({
        title: "Profile extracted",
        description: "Review the extracted candidate data before matching.",
      });
    } catch (error: unknown) {
      toast({
        title: "Extraction failed",
        description: getErrorMessage(error, "We could not parse the resume right now."),
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMatchTargets = async () => {
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

      const [jobsResponse, startupsResponse] = await Promise.all([
        supabase.functions.invoke("match-jobs", {
          body: {
            candidateProfile: profile,
            limit: 10,
          },
        }),
        supabase.functions.invoke("match-startups", {
          body: {
            candidateProfile: profile,
            limit: 8,
          },
        }),
      ]);

      if (jobsResponse.error) throw jobsResponse.error;
      if (startupsResponse.error) throw startupsResponse.error;

      updateDraft((current) => ({
        ...current,
        step: 3,
        submissionId,
        profile,
        selectedMode: "jobs",
        selectedTargetIds: [],
        jobMatches: (jobsResponse.data?.data || []) as JobMatch[],
        startupMatches: (startupsResponse.data?.data || []) as StartupMatch[],
        generatedEmails: [],
      }));
    } catch (error: unknown) {
      toast({
        title: "Matching failed",
        description: getErrorMessage(error, "We could not rank YC jobs right now."),
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleToggleTarget = (target: MatchTarget) => {
    const id = target.targetType === "job" ? target.jobId : target.id;
    updateDraft((current) => {
      const selected = current.selectedTargetIds.includes(id)
        ? current.selectedTargetIds.filter((item) => item !== id)
        : [...current.selectedTargetIds, id];

      return {
        ...current,
        selectedTargetIds: selected,
      };
    });
  };

  const handleGenerateEmails = async () => {
    if (!draft.profile) {
      toast({
        title: "Profile missing",
        description: "Resume extraction and profile review must be completed first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedTargets.length === 0) {
      toast({
        title: "Select at least one target",
        description: "Choose the jobs or startups you want to generate outreach for.",
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
          selectedTargets,
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
        <span>Upload Resume</span>
        <span>Review Profile</span>
        <span>Select Targets</span>
        <span>Copy Emails</span>
      </div>

      <div className="glass-card p-6 md:p-8">
        {draft.step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold">Upload your resume</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Scout will parse the resume into a structured candidate profile, then you can edit it before matching against live YC roles.
              </p>
            </div>

            {draft.resumeName && !resumeFile && (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-sm text-muted-foreground">
                Saved draft found for <span className="font-medium text-foreground">{draft.resumeName}</span>. You can continue from the last step or upload a new resume to restart.
              </div>
            )}

            <ResumeUpload selectedFile={resumeFile} onFileSelect={setResumeFile} />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleExtractProfile()} disabled={isExtracting || !resumeFile}>
                {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Extract Profile
              </Button>
              {draft.profile && (
                <Button variant="outline" onClick={() => updateDraft((current) => ({ ...current, step: Math.max(2, current.step) }))}>
                  Resume already parsed
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
                  Edit anything the parser missed. This version of the profile will drive matching and email generation.
                </p>
              </div>
              {draft.resumeName && (
                <Badge variant="secondary">{draft.resumeName}</Badge>
              )}
            </div>

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
              <Button onClick={() => void handleMatchTargets()} disabled={isMatching}>
                {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Find YC Fits
              </Button>
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold">Choose your outreach targets</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Job matches are the default. Switch to startup outreach if you want broader company-level emails or the job matches are weak.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={draft.selectedMode === "jobs" ? "default" : "outline"}
                  onClick={() => updateDraft((current) => ({ ...current, selectedMode: "jobs", selectedTargetIds: [] }))}
                >
                  <Briefcase className="h-4 w-4" />
                  Jobs
                </Button>
                <Button
                  variant={draft.selectedMode === "startups" ? "default" : "outline"}
                  onClick={() => updateDraft((current) => ({ ...current, selectedMode: "startups", selectedTargetIds: [] }))}
                >
                  <Building2 className="h-4 w-4" />
                  Startups
                </Button>
              </div>
            </div>

            {shouldSuggestStartups && draft.selectedMode === "jobs" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p>
                    The top job matches are relatively weak right now. Startup-level outreach may give you a better first-pass set of companies to contact.
                  </p>
                </div>
              </div>
            )}

            {currentTargets.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
                No matches are available for this mode yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {currentTargets.map((target) => {
                  const targetId = target.targetType === "job" ? target.jobId : target.id;
                  const isSelected = draft.selectedTargetIds.includes(targetId);
                  const title = target.targetType === "job" ? target.jobTitle : target.name;
                  const subtitle = target.targetType === "job" ? target.companyName : target.description;
                  const meta = target.targetType === "job" ? `${target.location} • ${target.jobType}` : target.website;

                  return (
                    <button
                      key={`${target.targetType}-${targetId}`}
                      type="button"
                      onClick={() => handleToggleTarget(target)}
                      className={cn(
                        "rounded-2xl border p-5 text-left transition-all",
                        isSelected ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40 hover:bg-secondary/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{title}</p>
                            <Badge variant="secondary">{target.matchScore}% fit</Badge>
                            {target.targetType === "job" && target.companyBatch && <Badge variant="accent">{target.companyBatch}</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {target.targetType === "job" ? target.companyName : subtitle}
                          </p>
                        </div>
                        <div className={cn("mt-1 h-5 w-5 rounded-full border", isSelected ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">{target.targetType === "job" ? target.companyOneLiner || subtitle : subtitle}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {target.fitReasons.map((reason) => (
                          <Badge key={reason} variant="outline" className="whitespace-normal text-left">
                            {reason}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span>{meta}</span>
                        <span className="inline-flex items-center gap-1">
                          Review target
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>
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
              <Button onClick={() => void handleGenerateEmails()} disabled={isGenerating || selectedTargets.length === 0}>
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
