import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, selectedStartups } = await req.json();

    console.log("Generating emails for submission:", submissionId);
    console.log("Selected startups:", selectedStartups?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the submission
    const { data: submission, error: submissionError } = await supabase
      .from("engineer_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      console.error("Submission fetch error:", submissionError);
      throw new Error("Submission not found");
    }

    // Fetch cold email templates
    const { data: templates, error: templatesError } = await supabase
      .from("cold_email_templates")
      .select("*")
      .eq("is_active", true);

    if (templatesError) {
      console.error("Templates fetch error:", templatesError);
      throw new Error("Failed to fetch templates");
    }

    // Pick a random template or the first one
    const template = templates && templates.length > 0 
      ? templates[Math.floor(Math.random() * templates.length)]
      : {
          subject_template: "Interested in joining {{company_name}}",
          body_template: "Hi {{founder_name}},\n\nI'm {{candidate_name}}, and I'm reaching out because I'm excited about {{company_name}}. With skills in {{skills}}, I believe I could contribute to your team.\n\n{{personalized_pitch}}\n\nBest,\n{{candidate_name}}"
        };

    const generatedEmails = [];

    for (const startup of selectedStartups) {
      console.log("Generating email for:", startup.name);

      // Use AI to generate personalized pitch
      const aiPrompt = `You are helping an engineer write a cold email to a YC startup. Generate a brief, personalized pitch (2-3 sentences) that connects the candidate's background to the startup.

Candidate Info:
- Name: ${submission.full_name}
- Skills: ${(submission.skills || []).join(", ")}
- Experience: ${submission.experience_years || 0} years
- Education: ${submission.education || "Not specified"}
- Bio: ${submission.bio || "Not provided"}
- Preferred roles: ${(submission.preferred_roles || []).join(", ")}

Startup Info:
- Name: ${startup.name}
- Description: ${startup.description}
- Industry/Tags: ${(startup.tags || []).join(", ")}
- Founded: ${startup.founded}

Write a short, genuine personalized pitch that:
1. Shows specific interest in what the startup does
2. Connects the candidate's skills to the startup's needs
3. Is conversational and not overly formal
4. Is 2-3 sentences max

Only output the pitch text, nothing else.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an expert at writing personalized cold emails that get responses. Be concise and genuine." },
            { role: "user", content: aiPrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI generation failed");
      }

      const aiData = await aiResponse.json();
      const personalizedPitch = aiData.choices?.[0]?.message?.content || "";

      // Fill in the template
      const founderName = startup.founders?.[0]?.name?.split(" ")[0] || "there";
      const primarySkill = (submission.skills || [])[0] || "software development";
      const role = (submission.preferred_roles || [])[0] || "Software Engineer";

      const subject = template.subject_template
        .replace(/\{\{company_name\}\}/g, startup.name)
        .replace(/\{\{role\}\}/g, role)
        .replace(/\{\{primary_skill\}\}/g, primarySkill);

      const body = template.body_template
        .replace(/\{\{founder_name\}\}/g, founderName)
        .replace(/\{\{company_name\}\}/g, startup.name)
        .replace(/\{\{company_focus\}\}/g, startup.description?.slice(0, 100) || "your mission")
        .replace(/\{\{role\}\}/g, role)
        .replace(/\{\{skills\}\}/g, (submission.skills || []).slice(0, 3).join(", ") || "software development")
        .replace(/\{\{primary_skill\}\}/g, primarySkill)
        .replace(/\{\{personalized_pitch\}\}/g, personalizedPitch)
        .replace(/\{\{candidate_name\}\}/g, submission.full_name)
        .replace(/\{\{experience_years\}\}/g, String(submission.experience_years || 0))
        .replace(/\{\{linkedin_url\}\}/g, submission.linkedin_url || "")
        .replace(/\{\{portfolio_url\}\}/g, submission.portfolio_url || "")
        .replace(/\{\{industry\}\}/g, (startup.tags || [])[0] || "tech");

      // Save generated email to database
      const { data: savedEmail, error: saveError } = await supabase
        .from("generated_emails")
        .insert({
          submission_id: submissionId,
          startup_id: startup.id,
          startup_name: startup.name,
          subject: subject,
          body: body,
          status: "pending",
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving email:", saveError);
      }

      generatedEmails.push({
        id: savedEmail?.id,
        startupId: startup.id,
        startupName: startup.name,
        subject,
        body,
      });
    }

    console.log("Generated", generatedEmails.length, "emails successfully");

    return new Response(JSON.stringify({ emails: generatedEmails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in generate-cold-emails function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
