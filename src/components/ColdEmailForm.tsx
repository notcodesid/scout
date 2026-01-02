import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import ResumeUpload from "./ResumeUpload";
import StartupSelector from "./StartupSelector";
import EmailPreview from "./EmailPreview";
import { startups, StartupFull } from "@/data/startups";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  githubUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  skills: z.string().min(1, "Please enter at least one skill"),
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

const ColdEmailForm = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedStartups, setSelectedStartups] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const selectedStartupData = startups.filter((s) =>
    selectedStartups.includes(s.id)
  );

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await form.trigger();
      if (isValid) {
        setStep(2);
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

    try {
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
      const { data: submission, error: submissionError } = await supabase
        .from("engineer_submissions")
        .insert({
          full_name: values.fullName,
          email: values.email,
          phone: values.phone || null,
          linkedin_url: values.linkedinUrl || null,
          github_url: values.githubUrl || null,
          portfolio_url: values.portfolioUrl || null,
          resume_url: resumeUrl,
          skills: values.skills.split(",").map((s) => s.trim()),
          experience_years: values.experienceYears ? parseInt(values.experienceYears) : 0,
          education: values.education || null,
          preferred_roles: values.preferredRoles
            ? values.preferredRoles.split(",").map((r) => r.trim())
            : [],
          bio: values.bio || null,
        })
        .select()
        .single();

      if (submissionError) {
        console.error("Submission error:", submissionError);
        throw new Error("Failed to save your information");
      }

      setSubmissionId(submission.id);

      // Generate cold emails
      const { data: emailData, error: emailError } = await supabase.functions.invoke(
        "generate-cold-emails",
        {
          body: {
            submissionId: submission.id,
            selectedStartups: selectedStartupData,
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
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s < step
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
                className={`h-0.5 w-12 ${
                  s < step ? "bg-primary" : "bg-secondary"
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
                  This information helps us personalize your cold emails
                </p>
              </div>

              {/* Resume Upload */}
              <div>
                <p className="mb-2 text-sm font-medium">Resume (Optional)</p>
                <ResumeUpload
                  selectedFile={resumeFile}
                  onFileSelect={setResumeFile}
                />
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
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Choose your target startups
              </h2>
              <p className="text-sm text-muted-foreground">
                Select the YC startups you want to reach out to
              </p>
            </div>

            <StartupSelector
              startups={startups}
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
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              variant="hero"
              onClick={handleNext}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {step === 2 ? "Generating..." : "Processing..."}
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
