import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CandidateProfile,
  MatchJobResult,
  candidateKeywordPool,
  coerceCandidateProfile,
  normalizeScore,
  tokenize,
} from "../_shared/mvp1.ts";
import { recordMvp1Event } from "../_shared/mvp1-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnifiedJob {
  id: string;
  source_slug: string;
  source_label?: string;
  title: string;
  company_name: string;
  company_slug: string;
  company_one_liner: string;
  company_logo_url: string | null;
  company_website_url: string | null;
  job_type: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  remote: string;
  skills: string[];
  description: string;
  apply_url: string;
  job_url: string;
  seniority: string;
  category: string;
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

function experienceScore(profile: CandidateProfile, job: UnifiedJob) {
  const text = `${job.title} ${job.seniority}`.toLowerCase();
  const years = profile.experienceYears || 0;

  if (/(senior|staff|principal|lead|architect)/.test(text)) {
    return years >= 5 ? 16 : years >= 3 ? 9 : 2;
  }

  if (/(intern|new grad|junior|entry|associate|fresher)/.test(text)) {
    return years <= 2 ? 16 : 10;
  }

  return years >= 2 ? 14 : 10;
}

function matchingSkills(profile: CandidateProfile, jobTokens: Set<string>) {
  return profile.skills.filter((skill) => tokenize(skill).some((token) => jobTokens.has(token)));
}

function matchingRoleLabels(profile: CandidateProfile, jobTokens: Set<string>) {
  return profile.preferredRoles.filter((role) => tokenize(role).some((token) => jobTokens.has(token)));
}

function matchingContextKeywords(profile: CandidateProfile, jobTokens: Set<string>) {
  return Array.from(
    new Set(
      [...tokenize(profile.summary), ...tokenize(profile.education)].filter((token) => jobTokens.has(token)),
    ),
  ).slice(0, 3);
}

function overlapScore(values: string[]) {
  return values.reduce((score, value) => score + Math.max(1, tokenize(value).length), 0);
}

function scoreJob(job: UnifiedJob, profile: CandidateProfile): MatchJobResult {
  const allText = [
    job.title,
    job.company_name,
    job.company_one_liner,
    job.location,
    job.category,
    job.skills?.join(" ") || "",
    job.description,
    job.remote,
  ].join(" ");
  const jobTokens = new Set(tokenize(allText));
  const matchedRoles = matchingRoleLabels(profile, jobTokens);
  const matchedSkills = matchingSkills(profile, jobTokens);
  const matchedContextKeywords = matchingContextKeywords(profile, jobTokens);
  const keywordPool = candidateKeywordPool(profile);
  const keywordScore = keywordPool.filter((keyword) => jobTokens.has(keyword.toLowerCase())).length;

  let rawScore = 18;
  rawScore += Math.min(overlapScore(matchedRoles) * 8, 24);
  rawScore += Math.min(overlapScore(matchedSkills) * 6, 24);
  rawScore += Math.min(keywordScore * 3, 18);
  rawScore += Math.min(matchedContextKeywords.length * 4, 12);
  rawScore += experienceScore(profile, job);

  if (job.remote === "Remote") {
    rawScore += 4;
  } else if (job.remote === "Hybrid") {
    rawScore += 2;
  }

  const fitReasons: string[] = [];
  if (matchedRoles.length > 0) {
    fitReasons.push(`Role overlap: ${matchedRoles.slice(0, 2).join(", ")}.`);
  }
  if (matchedSkills.length > 0) {
    fitReasons.push(`Skill overlap: ${matchedSkills.slice(0, 3).join(", ")}.`);
  }
  if (matchedContextKeywords.length > 0) {
    fitReasons.push(`Profile keywords echoed in the role: ${matchedContextKeywords.join(", ")}.`);
  }
  if (profile.experienceYears > 0) {
    fitReasons.push(`Seniority fit for ${profile.experienceYears}+ years of experience.`);
  }
  if (job.remote === "Remote") {
    fitReasons.push("Remote-friendly role.");
  } else if (job.remote === "Hybrid") {
    fitReasons.push("Hybrid role with partial remote flexibility.");
  }
  if (fitReasons.length < 2 && job.company_one_liner) {
    fitReasons.push(`Company focus: ${job.company_one_liner.slice(0, 110)}${job.company_one_liner.length > 110 ? "..." : ""}`);
  }
  if (fitReasons.length === 0) {
    fitReasons.push("Relevant fit based on role title, company focus, and experience level.");
  }

  return {
    targetType: "job",
    jobId: job.id,
    jobTitle: job.title,
    companyName: job.company_name,
    companySlug: job.company_slug,
    companyBatch: "",
    companyOneLiner: job.company_one_liner,
    location: job.location,
    roleType: job.seniority,
    jobType: job.job_type,
    jobUrl: job.job_url,
    applyUrl: job.apply_url,
    matchScore: normalizeScore(rawScore),
    fitReasons: fitReasons.slice(0, 4),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateProfile, limit = 12, sources, remoteOnly, submissionId } = await req.json();
    const profile = coerceCandidateProfile(candidateProfile || {});

    const supabase = createAdminClient();

    let query = supabase
      .from("canonical_job_listings")
      .select(
        "id, source_slug, source_label, title, company_name, company_slug, company_one_liner, company_logo_url, company_website_url, job_type, location, salary_min, salary_max, salary_currency, remote, skills, description, apply_url, job_url, seniority, category",
      )
      .order("last_seen_at", { ascending: false })
      .limit(500);

    if (sources && Array.isArray(sources) && sources.length > 0) {
      query = query.in("source_slug", sources);
    }

    if (remoteOnly) {
      query = query.eq("remote", "Remote");
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const jobs = ((data || []) as UnifiedJob[]).map((job) => scoreJob(job, profile));
    const ranked = jobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Math.max(1, Math.min(limit, 20)));

    const sourceCounts = ((data || []) as UnifiedJob[]).reduce(
      (acc, job) => {
        const src = job.source_slug || "other";
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    await recordMvp1Event(supabase, {
      submissionId: typeof submissionId === "string" ? submissionId : null,
      eventType: "job_match",
      status: "success",
      metadata: {
        totalScored: jobs.length,
        returnedCount: ranked.length,
        sourceBreakdown: sourceCounts,
        remoteOnly: Boolean(remoteOnly),
        sources: Array.isArray(sources) ? sources : [],
      },
    });

    return new Response(
      JSON.stringify({
        data: ranked,
        totalScored: jobs.length,
        sourceBreakdown: sourceCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in match-jobs:", error);
    try {
      await recordMvp1Event(createAdminClient(), {
        eventType: "job_match",
        status: "failure",
        metadata: {
          error: error instanceof Error ? error.message : "Failed to match jobs",
        },
      });
    } catch (eventError) {
      console.error("Failed to record job-match failure event:", eventError);
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to match jobs",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
