import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import ResumeUpload from "./ResumeUpload";
import StartupSelector, { StartupOption } from "./StartupSelector";
import EmailPreview from "./EmailPreview";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  githubUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  skills: z.string().optional(),
  experienceYears: z.string().optional(),
  education: z.string().optional(),
  preferredRoles: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GeneratedEmail {
  id?: string;
  startupId: string;
  startupName: string;
  subject: string;
  body: string;
}

type InputMethod = "resume" | "manual";

interface MatchedStartup extends StartupOption {
  website: string;
  founded: string;
  teamSize: number;
  location: string;
  founders: { name: string; linkedin?: string }[];
}

const generateUuid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // RFC 4122 version 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const ColdEmailForm = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [inputMethod, setInputMethod] = useState<InputMethod>("resume");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [matchedStartups, setMatchedStartups] = useState<MatchedStartup[]>([]);
  const [selectedStartups, setSelectedStartups] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      bio: "",
    },
  });

  const selectedStartupData = matchedStartups.filter((s) =>
    selectedStartups.includes(s.id)
  );

  const handleNext = async () => {
    if (step === 1) {
      const isContactValid = await form.trigger(["fullName", "email"]);
      if (!isContactValid) {
        return;
      }

      if (inputMethod === "resume") {
        if (!resumeFile) {
          toast({
            title: "Resume required",
            description: "Upload your resume, or switch to Fill Manually.",
            variant: "destructive",
          });
          return;
        }
      } else {
        const isManualValid = await form.trigger([
          "skills",
          "experienceYears",
          "education",
          "preferredRoles",
          "linkedinUrl",
          "githubUrl",
          "portfolioUrl",
          "bio",
        ]);
        if (!isManualValid) {
          return;
        }

        const skills = (form.getValues("skills") || "").trim();
        if (!skills) {
          form.setError("skills", {
            type: "manual",
            message: "Please enter at least one skill",
          });
          return;
        }
      }

      setIsMatching(true);
      try {
        const values = form.getValues();
        const { data: matchData, error: matchError } = await supabase.functions.invoke(
          "match-startups",
          {
            body: {
              limit: 10,
              candidate: {
                fullName: values.fullName,
                email: values.email,
                skills: values.skills || "",
                experienceYears: values.experienceYears || "",
                education: values.education || "",
                preferredRoles: values.preferredRoles || "",
                bio: values.bio || "",
                inputMethod,
                resume: resumeFile
                  ? {
                      fileName: resumeFile.name,
                      fileType: resumeFile.type,
                      fileSize: resumeFile.size,
                    }
                  : null,
              },
            },
          }
        );

        if (matchError) {
          throw new Error("Failed to find startup matches");
        }

        const matches = (matchData?.data || []) as MatchedStartup[];
        if (matches.length === 0) {
          throw new Error("No startup matches found. Please try updating your details.");
        }

        setMatchedStartups(matches);
        setSelectedStartups(matches.slice(0, 5).map((startup) => startup.id));
        setStep(2);
      } catch (error: any) {
        toast({
          title: "Matching failed",
          description: error.message || "Could not match startups right now. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsMatching(false);
      }
    } else if (step === 2) {
      if (selectedStartups.length === 0) {
        toast({
          title: "Select startups",
          description: "Please select at least one startup to generate emails",
          variant: "destructive",
        });
        return;
      }
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 4) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const values = form.getValues();
    const parsedSkills = values.skills
      ? values.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const parsedPreferredRoles = values.preferredRoles
      ? values.preferredRoles.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    try {
      const submissionId = generateUuid();
      // Upload resume if provided
      let resumeUrl = null;
      if (resumeFile) {
        const fileName = `${Date.now()}-${resumeFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(fileName, resumeFile);

        if (uploadError) {
          console.error("Resume upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("resumes")
            .getPublicUrl(fileName);
          resumeUrl = urlData.publicUrl;
        }
      }

      // Save engineer submission
      const { error: submissionError } = await supabase
        .from("engineer_submissions")
        .insert({
          id: submissionId,
          full_name: values.fullName,
          email: values.email,
          phone: values.phone || null,
          linkedin_url: values.linkedinUrl || null,
          github_url: values.githubUrl || null,
          portfolio_url: values.portfolioUrl || null,
          resume_url: resumeUrl,
          skills: parsedSkills,
          experience_years: values.experienceYears ? parseInt(values.experienceYears) : 0,
          education: values.education || null,
          preferred_roles: parsedPreferredRoles,
          bio: values.bio || null,
          user_id: null,
        });

      if (submissionError) {
        console.error("Submission error:", submissionError);
        throw new Error("Failed to save your information");
      }

      setSubmissionId(submissionId);

      // Generate cold emails
      const { data: emailData, error: emailError } = await supabase.functions.invoke(
        "generate-cold-emails",
        {
          body: {
            submissionId: submissionId,
            selectedStartups: selectedStartupData,
            userId: null,
          },
        }
      );

      if (emailError) {
        console.error("Email generation error:", emailError);
        throw new Error("Failed to generate emails");
      }

      if (emailData?.error) {
        throw new Error(emailData.error);
      }

      setGeneratedEmails(emailData.emails || []);
      setStep(3);

      toast({
        title: "Emails generated!",
        description: `${emailData.emails?.length || 0} personalized cold emails are ready`,
      });
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setInputMethod("resume");
    setMatchedStartups([]);
    setSelectedStartups([]);
    setGeneratedEmails([]);
    setSubmissionId(null);
    setResumeFile(null);
    form.reset();
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${s < step
                  ? "bg-primary text-primary-foreground"
                  : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
            >
              {s < step ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-12 ${s < step ? "bg-primary" : "bg-secondary"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="mb-8 flex justify-between text-sm">
        <span className={step >= 1 ? "text-primary" : "text-muted-foreground"}>
          Your Info
        </span>
        <span className={step >= 2 ? "text-primary" : "text-muted-foreground"}>
          Select Startups
        </span>
        <span className={step >= 3 ? "text-primary" : "text-muted-foreground"}>
          Get Emails
        </span>
      </div>

      {/* Step Content */}
      <div className="glass-card p-6 md:p-8">
        {step === 1 && (
          <Form {...form}>
            <form className="space-y-6">
              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold">
                  Tell us about yourself
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose one: upload your resume or fill details manually.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={inputMethod === "resume" ? "default" : "outline"}
                  onClick={() => setInputMethod("resume")}
                  className="h-11"
                >
                  Upload Resume
                </Button>
                <Button
                  type="button"
                  variant={inputMethod === "manual" ? "default" : "outline"}
                  onClick={() => setInputMethod("manual")}
                  className="h-11"
                >
                  Fill Manually
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {inputMethod === "resume" ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Resume *</p>
                  <ResumeUpload
                    selectedFile={resumeFile}
                    onFileSelect={setResumeFile}
                  />
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills * (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="React, TypeScript, Python, Machine Learning"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="experienceYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="education"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education</FormLabel>
                          <FormControl>
                            <Input placeholder="BS Computer Science, MIT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="preferredRoles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Roles (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Software Engineer, Full Stack Developer"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://linkedin.com/in/..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="githubUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="portfolioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a bit about yourself and what you're looking for..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Your Best Startup Matches
              </h2>
              <p className="text-sm text-muted-foreground">
                We ranked startups from your profile. Keep up to 5 for email generation.
              </p>
            </div>

            <StartupSelector
              startups={matchedStartups}
              selectedIds={selectedStartups}
              onSelectionChange={setSelectedStartups}
              maxSelection={5}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Your Personalized Emails
              </h2>
              <p className="text-sm text-muted-foreground">
                Copy these emails and send them from your own email client
              </p>
            </div>

            <EmailPreview
              emails={generatedEmails}
              engineerEmail={form.getValues("email")}
            />

            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleStartOver}>
                Generate More Emails
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div className="mt-8 flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className={`gap-2 ${step === 1 ? "invisible" : ""}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              variant="default"
              onClick={handleNext}
              disabled={isSubmitting || isMatching}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {step === 2 ? "Generating..." : "Processing..."}
                </>
              ) : isMatching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding Matches...
                </>
              ) : (
                <>
                  {step === 2 ? "Generate Emails" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColdEmailForm;
