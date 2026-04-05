import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CandidateProfile, GeneratedEmailOutput, coerceCandidateProfile } from "../_shared/mvp1.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectedTarget {
  targetType: "job" | "startup";
  startupId?: string;
  startupName?: string;
  companyName?: string;
  companySlug?: string;
  jobId?: string;
  jobTitle?: string;
  location?: string;
  roleType?: string;
  jobType?: string;
  companyBatch?: string;
  companyOneLiner?: string;
  jobUrl?: string;
  applyUrl?: string;
  description?: string;
  website?: string;
  tags?: string[];
  fitReasons?: string[];
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeTarget(target: SelectedTarget) {
  const startupId = target.startupId || target.companySlug || target.jobId || "unknown";
  const startupName = target.startupName || target.companyName || "Unknown Company";

  return {
    targetType: target.targetType,
    startupId,
    startupName,
    metadata: {
      ...target,
      startupId,
      startupName,
    },
  };
}

function parseAiJson<T>(content: string): T | null {
  if (!content) return null;

  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fallbackEmail(profile: CandidateProfile, target: SelectedTarget): Omit<GeneratedEmailOutput, "id"> {
  const normalized = normalizeTarget(target);
  const jobReference = target.targetType === "job" && target.jobTitle ? ` for the ${target.jobTitle} role` : "";
  const fitSummary = (target.fitReasons || []).slice(0, 2).join(" ") || `Your profile aligns with ${normalized.startupName}${jobReference}.`;
  const subjectOptions = [
    `${profile.fullName || "Candidate"} interested in ${normalized.startupName}${jobReference}`,
    `${target.jobTitle || "Engineer"} application for ${normalized.startupName}`,
    `Potential fit for ${normalized.startupName}`,
  ];
  const body = `Hi ${normalized.startupName} team,

I’m ${profile.fullName || "an engineer"} and I’m reaching out about ${normalized.startupName}${jobReference}. My background in ${profile.skills.slice(0, 3).join(", ") || "software engineering"} and ${profile.summary || "building product-focused software"} feels relevant to what you’re building.

${fitSummary}

If helpful, I’d love to share more context and see whether there might be a fit.

Best,
${profile.fullName || ""}
${profile.email || ""}`.trim();

  return {
    targetType: normalized.metadata.targetType,
    startupId: normalized.startupId,
    startupName: normalized.startupName,
    subject: subjectOptions[0],
    subjectOptions,
    fitSummary,
    body,
    targetMetadata: normalized.metadata,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, candidateProfile, selectedTargets, userId } = await req.json();
    const targets = Array.isArray(selectedTargets) ? (selectedTargets as SelectedTarget[]) : [];

    if (targets.length === 0) {
      throw new Error("At least one selected target is required");
    }

    const supabase = createAdminClient();
    let profile = coerceCandidateProfile(candidateProfile || {});

    if (!profile.fullName && submissionId) {
      const { data: submission, error } = await supabase
        .from("engineer_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (error || !submission) {
        throw new Error("Submission not found");
      }

      profile = coerceCandidateProfile({
        fullName: submission.full_name,
        email: submission.email,
        phone: submission.phone || "",
        linkedinUrl: submission.linkedin_url || "",
        githubUrl: submission.github_url || "",
        portfolioUrl: submission.portfolio_url || "",
        skills: submission.skills || [],
        experienceYears: submission.experience_years || 0,
        education: submission.education || "",
        preferredRoles: submission.preferred_roles || [],
        summary: typeof submission.extracted_profile === "object" && submission.extracted_profile && "summary" in submission.extracted_profile
          ? String(submission.extracted_profile.summary || "")
          : submission.bio || "",
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const generated: GeneratedEmailOutput[] = [];

    for (const target of targets) {
      const normalized = normalizeTarget(target);
      const prompt = `Generate a structured cold outreach package for a candidate.

Return strict JSON only:
{
  "fitSummary": string,
  "subjectOptions": string[],
  "subject": string,
  "body": string
}

Rules:
- fitSummary: 1-2 sentences, concrete, no bullets, under 220 characters.
- subjectOptions: exactly 3 concise subject lines.
- subject: choose the best subject from subjectOptions.
- body: under 150 words, plain text only, no markdown, direct CTA at the end.
- Mention the company and specific role when targetType is "job".
- Sound human and specific, not salesy.

Candidate:
${JSON.stringify(profile, null, 2)}

Target:
${JSON.stringify(target, null, 2)}`;

      let packageOutput = fallbackEmail(profile, target);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You write concise, specific cold emails for startup job outreach and must return strict JSON only.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const parsed = parseAiJson<{ fitSummary?: string; subjectOptions?: string[]; subject?: string; body?: string }>(
          aiData.choices?.[0]?.message?.content || "",
        );

        if (parsed?.body && parsed?.subject) {
          packageOutput = {
            ...packageOutput,
            fitSummary: (parsed.fitSummary || packageOutput.fitSummary).trim(),
            subjectOptions: (parsed.subjectOptions || packageOutput.subjectOptions).slice(0, 3),
            subject: parsed.subject.trim(),
            body: parsed.body.trim(),
          };
        }
      }

      const { data: savedEmail, error } = await supabase
        .from("generated_emails")
        .insert({
          submission_id: submissionId || null,
          startup_id: normalized.startupId,
          startup_name: normalized.startupName,
          subject: packageOutput.subject,
          body: packageOutput.body,
          status: "generated",
          user_id: userId || null,
          response_status: "not_sent",
          target_type: normalized.metadata.targetType,
          target_metadata: packageOutput.targetMetadata,
          fit_summary: packageOutput.fitSummary,
          subject_options: packageOutput.subjectOptions,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save generated email:", error);
      }

      generated.push({
        ...packageOutput,
        id: savedEmail?.id,
      });
    }

    return new Response(JSON.stringify({ emails: generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-cold-email:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate cold emails",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
