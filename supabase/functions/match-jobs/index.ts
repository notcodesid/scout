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

interface UnifiedJob {
  id: string;
  source_slug: string;
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

function scoreJob(job: UnifiedJob, profile: CandidateProfile): MatchJobResult {
  const roleNeedles = profile.preferredRoles.flatMap((role) => tokenize(role));
  const keywordPool = candidateKeywordPool(profile);
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

  const roleOverlap = keywordOverlap(jobTokens, roleNeedles);
  const keywordScore = keywordOverlap(jobTokens, keywordPool);
  const skillTokens = profile.skills.flatMap((s) => tokenize(s));
  const skillOverlap = keywordOverlap(jobTokens, skillTokens);

  let rawScore = 20;
  rawScore += roleOverlap * 18;
  rawScore += Math.min(keywordScore * 5, 25);
  rawScore += Math.min(skillOverlap * 10, 20);
  rawScore += experienceScore(profile, job);

  if (job.remote === "Remote") {
    rawScore += 5;
  }

  const fitReasons: string[] = [];
  if (roleOverlap > 0) {
    fitReasons.push(`Role alignment with ${profile.preferredRoles[0] || "your target track"}.`);
  }
  if (skillOverlap > 0 && profile.skills.length > 0) {
    fitReasons.push(`Skill overlap around ${profile.skills.slice(0, 3).join(", ")}.`);
  }
  if (job.company_one_liner) {
    fitReasons.push("Company focus matches your profile keywords and stated interests.");
  }
  if (job.remote === "Remote") {
    fitReasons.push("Remote-friendly role — a strong signal for distributed teams.");
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
    fitReasons: fitReasons.slice(0, 3),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateProfile, limit = 12, sources, remoteOnly } = await req.json();
    const profile = coerceCandidateProfile(candidateProfile || {});

    const supabase = createAdminClient();

    let query = supabase
      .from("job_listings")
      .select(
        "id, source_slug, title, company_name, company_slug, company_one_liner, company_logo_url, company_website_url, job_type, location, salary_min, salary_max, salary_currency, remote, skills, description, apply_url, job_url, seniority, category",
      )
      .limit(300);

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

    const sourceCounts = ranked.reduce(
      (acc, job) => {
        const src = job.jobUrl?.split("/")[2]?.replace("www.", "").split(".")[0] || "other";
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

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
