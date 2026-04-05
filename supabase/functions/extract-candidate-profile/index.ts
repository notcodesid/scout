import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CandidateProfile, coerceCandidateProfile } from "../_shared/mvp1.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function decodePdfStringLiteral(input: string) {
  return input
    .replace(/\\\)/g, ")")
    .replace(/\\\(/g, "(")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function extractPdfText(buffer: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(buffer);
  const textParts: string[] = [];

  const literalMatches = raw.matchAll(/\((?:\\.|[^\\)]){1,400}\)\s*Tj/g);
  for (const match of literalMatches) {
    const literal = match[0].replace(/\)\s*Tj$/, "").slice(1);
    textParts.push(decodePdfStringLiteral(literal));
  }

  const arrayMatches = raw.matchAll(/\[(.*?)\]\s*TJ/gs);
  for (const match of arrayMatches) {
    const chunk = match[1];
    const innerMatches = chunk.matchAll(/\((?:\\.|[^\\)]){1,400}\)/g);
    for (const inner of innerMatches) {
      textParts.push(decodePdfStringLiteral(inner[0].slice(1, -1)));
    }
  }

  const hexMatches = raw.matchAll(/<([0-9A-Fa-f]{4,800})>\s*Tj/g);
  for (const match of hexMatches) {
    try {
      const hex = match[1];
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
      }
      textParts.push(new TextDecoder().decode(bytes));
    } catch {
      // Ignore malformed hex chunks.
    }
  }

  const collapsed = textParts.join("\n").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (collapsed.length >= 200) {
    return collapsed;
  }

  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\/[A-Za-z0-9#]+/g, " ")
    .replace(/[^ -~\n]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12000);
}

function parseJsonObject(content: string): Partial<CandidateProfile> | null {
  if (!content) return null;

  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as Partial<CandidateProfile>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Partial<CandidateProfile>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function inferProfileFromText(text: string, fileName = ""): CandidateProfile {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(\+\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/)?.[0] || "";
  const linkedinUrl = text.match(/https?:\/\/[^\s]*linkedin\.com\/[^\s)]+/i)?.[0] || "";
  const githubUrl = text.match(/https?:\/\/[^\s]*github\.com\/[^\s)]+/i)?.[0] || "";
  const portfolioUrl = text.match(/https?:\/\/(?![^\s]*linkedin\.com)(?![^\s]*github\.com)[^\s)]+/i)?.[0] || "";
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const fullName = lines[0] && lines[0].length < 80 ? lines[0] : fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
  const skills = Array.from(
    new Set(
      (text.match(/\b(react|typescript|javascript|node|python|java|golang|docker|aws|sql|postgres|next\.js|nextjs|tailwind|graphql|machine learning|llm|ai|nlp|kubernetes|redis|mongodb|figma|swift|kotlin)\b/gi) || [])
        .map((value) => value.replace(/\bnextjs\b/i, "Next.js")),
    ),
  );

  return coerceCandidateProfile({
    fullName,
    email,
    phone,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
    skills,
    summary: text.slice(0, 600),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumePath, fileName } = await req.json();

    if (!resumePath) {
      throw new Error("resumePath is required");
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from("resumes").download(resumePath);

    if (error || !data) {
      throw new Error("Failed to download resume");
    }

    const pdfBuffer = new Uint8Array(await data.arrayBuffer());
    const extractedText = extractPdfText(pdfBuffer).slice(0, 12000);

    if (!extractedText || extractedText.length < 80) {
      throw new Error("Could not extract enough text from the resume");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Extract a candidate profile from this resume text and return strict JSON only.

Schema:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "linkedinUrl": string,
  "githubUrl": string,
  "portfolioUrl": string,
  "skills": string[],
  "experienceYears": number,
  "education": string,
  "preferredRoles": string[],
  "summary": string
}

Rules:
- Use empty string when a scalar field is missing.
- Use [] when an array field is missing.
- Keep summary under 320 characters.
- Normalize skills and preferredRoles to concise, title-cased phrases.
- Estimate experienceYears conservatively from the resume.
- Output JSON only.

Resume text:
${extractedText}`;

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
            content: "You extract structured candidate data from resumes. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Resume extraction AI error:", aiResponse.status, errorText);
      throw new Error("Profile extraction failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObject(content) || inferProfileFromText(extractedText, fileName);
    const profile = coerceCandidateProfile(parsed);

    return new Response(
      JSON.stringify({
        profile,
        extractedTextPreview: extractedText.slice(0, 1200),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in extract-candidate-profile:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to extract candidate profile",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
