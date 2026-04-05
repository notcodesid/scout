import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CandidateProfile,
  MatchJobResult,
  candidateKeywordPool,
  coerceCandidateProfile,
  keywordOverlap,
  normalizeScore,
  tokenize,
} from "../_shared/mvp1.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YCJobListing {
  id: string;
  title: string;
  job_type: string;
  location: string;
  role_type: string;
  company_name: string;
  company_slug: string;
  company_batch: string;
  company_one_liner: string;
  apply_url: string;
  job_url: string;
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

function experienceScore(profile: CandidateProfile, job: YCJobListing) {
  const seniorityText = `${job.title} ${job.role_type}`.toLowerCase();
  const years = profile.experienceYears || 0;

  if (/(senior|staff|principal|lead)/.test(seniorityText)) {
    return years >= 5 ? 16 : years >= 3 ? 9 : 2;
  }

  if (/(intern|new grad|junior|entry)/.test(seniorityText)) {
    return years <= 2 ? 16 : 10;
  }

  return years >= 2 ? 14 : 10;
}

function scoreJob(job: YCJobListing, profile: CandidateProfile): MatchJobResult {
  const roleNeedles = profile.preferredRoles.flatMap((role) => tokenize(role));
  const keywordPool = candidateKeywordPool(profile);
  const jobText = `${job.title} ${job.role_type} ${job.company_name} ${job.company_one_liner} ${job.location}`;
  const jobTokens = new Set(tokenize(jobText));

  const roleOverlap = keywordOverlap(jobTokens, roleNeedles);
  const keywordScore = keywordOverlap(jobTokens, keywordPool);
  const primarySkills = profile.skills.slice(0, 5);
  const skillOverlap = keywordOverlap(jobTokens, primarySkills.flatMap((skill) => tokenize(skill)));

  let rawScore = 24;
  rawScore += roleOverlap * 18;
  rawScore += Math.min(keywordScore * 5, 25);
  rawScore += Math.min(skillOverlap * 10, 20);
  rawScore += experienceScore(profile, job);

  const fitReasons: string[] = [];
  if (roleOverlap > 0) {
    fitReasons.push(`Role alignment with ${profile.preferredRoles[0] || "your preferred engineering track"}.`);
  }
  if (skillOverlap > 0 && primarySkills.length > 0) {
    fitReasons.push(`Skill overlap around ${primarySkills.slice(0, 3).join(", ")}.`);
  }
  if (job.company_one_liner) {
    fitReasons.push(`Company focus overlaps with your profile summary and resume keywords.`);
  }
  if (fitReasons.length === 0) {
    fitReasons.push("Relevant engineering fit based on role title, company focus, and experience level.");
  }

  return {
    targetType: "job",
    jobId: job.id,
    jobTitle: job.title,
    companyName: job.company_name,
    companySlug: job.company_slug,
    companyBatch: job.company_batch,
    companyOneLiner: job.company_one_liner,
    location: job.location,
    roleType: job.role_type,
    jobType: job.job_type,
    jobUrl: job.job_url,
    applyUrl: job.apply_url,
    matchScore: normalizeScore(rawScore),
    fitReasons: fitReasons.slice(0, 3),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateProfile, limit = 12 } = await req.json();
    const profile = coerceCandidateProfile(candidateProfile || {});

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("yc_job_listings")
      .select("id, title, job_type, location, role_type, company_name, company_slug, company_batch, company_one_liner, apply_url, job_url")
      .order("rank", { ascending: true })
      .limit(200);

    if (error) {
      throw error;
    }

    const jobs = ((data || []) as YCJobListing[]).map((job) => scoreJob(job, profile));
    const ranked = jobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Math.max(1, Math.min(limit, 20)));

    return new Response(JSON.stringify({ data: ranked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in match-jobs:", error);
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
