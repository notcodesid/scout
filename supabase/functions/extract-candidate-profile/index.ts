import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CandidateProfile,
  ProfileSourceEvidence,
  SourceExtractionEvidence,
  coerceCandidateProfile,
  uniqueStrings,
} from "../_shared/mvp1.ts";
import { generateJsonFromGemini } from "../_shared/gemini.ts";
import { recordMvp1Event } from "../_shared/mvp1-events.ts";

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

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|main|header|footer|nav|aside|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n"),
  )
    .trim();
}

function extractLinkText(fragment: string): string {
  return stripHtmlToText(fragment).replace(/\s+/g, " ").trim();
}

function extractHtmlLinks(html: string, baseUrl: string): Array<{ url: string; text: string }> {
  const links: Array<{ url: string; text: string }> = [];
  const matches = html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi);

  for (const match of matches) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const resolved = new URL(href, baseUrl).toString();
      links.push({
        url: resolved,
        text: extractLinkText(match[2] || ""),
      });
    } catch {
      // Skip invalid URLs.
    }
  }

  return links;
}

function pickRelevantPortfolioLinks(links: Array<{ url: string; text: string }>, rootUrl: string): string[] {
  const root = new URL(rootUrl);
  const keywords = /(about|project|work|experience|skill|stack|contact|blog|writing|portfolio|resume)/i;
  const seen = new Set<string>();

  return links
    .filter((link) => {
      try {
        const parsed = new URL(link.url);
        return parsed.origin === root.origin && !parsed.hash;
      } catch {
        return false;
      }
    })
    .filter((link) => link.url !== root.toString())
    .sort((a, b) => {
      const aScore = Number(keywords.test(`${a.text} ${a.url}`));
      const bScore = Number(keywords.test(`${b.text} ${b.url}`));
      return bScore - aScore || a.url.length - b.url.length;
    })
    .filter((link) => {
      if (seen.has(link.url)) return false;
      seen.add(link.url);
      return true;
    })
    .slice(0, 4)
    .map((link) => link.url);
}

async function fetchWebsitePage(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; ScoutBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const pageUrl = response.url || url;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";
  const text = stripHtmlToText(html);
  const links = extractHtmlLinks(html, pageUrl);

  return {
    url: pageUrl,
    title,
    text,
    links,
  };
}

async function fetchPortfolioContent(portfolioUrl: string) {
  const rootPage = await fetchWebsitePage(portfolioUrl);
  const relevantLinks = pickRelevantPortfolioLinks(rootPage.links, rootPage.url);
  const extraPages = await Promise.all(
    relevantLinks.map(async (url) => {
      try {
        return await fetchWebsitePage(url);
      } catch (error) {
        console.error("Failed to fetch related portfolio page:", url, error);
        return null;
      }
    }),
  );

  const pages = [rootPage, ...extraPages.filter(Boolean)];
  const externalLinks = Array.from(
    new Set(
      pages
        .flatMap((page) => page.links)
        .map((link) => link.url)
        .filter((url) => /linkedin\.com|github\.com|twitter\.com|x\.com/i.test(url)),
    ),
  );

  const combinedText = pages
    .map((page) => `page: ${page.url}\ntitle: ${page.title}\ncontent:\n${page.text.slice(0, 3500)}`)
    .join("\n\n---\n\n")
    .slice(0, 16000);

  return {
    canonicalUrl: rootPage.url,
    externalLinks,
    combinedText,
  };
}

function inferProfileFromWebsiteText(text: string, portfolioUrl: string, externalLinks: string[] = []): CandidateProfile {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(\+\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/)?.[0] || "";
  const linkedinUrl = externalLinks.find((link) => /linkedin\.com/i.test(link)) || "";
  const githubUrl = externalLinks.find((link) => /github\.com/i.test(link)) || "";
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const fullName = lines[0] && lines[0].length < 80 ? lines[0] : new URL(portfolioUrl).hostname.replace(/^www\./, "");
  const summaryLine = lines.find((line) => line.length > 50 && line.length < 320) || "";
  const skills = Array.from(
    new Set(
      (text.match(/\b(react|typescript|javascript|node|python|java|golang|docker|aws|sql|postgres|next\.js|nextjs|tailwind|graphql|machine learning|llm|ai|nlp|kubernetes|redis|mongodb|figma|swift|kotlin|prisma|express|hono|mongo|postgresql)\b/gi) || [])
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
    summary: summaryLine || text.slice(0, 400),
  });
}

function preferString(primary?: string, fallback?: string) {
  return primary?.trim() || fallback?.trim() || "";
}

function preferNumber(primary?: number, fallback?: number) {
  if (Number.isFinite(primary) && Number(primary) > 0) {
    return Number(primary);
  }

  if (Number.isFinite(fallback) && Number(fallback) > 0) {
    return Number(fallback);
  }

  return 0;
}

function mergeCandidateProfiles(resumeProfile?: CandidateProfile | null, portfolioProfile?: CandidateProfile | null): CandidateProfile {
  if (!resumeProfile && !portfolioProfile) {
    return coerceCandidateProfile({});
  }

  const resume = resumeProfile || coerceCandidateProfile({});
  const portfolio = portfolioProfile || coerceCandidateProfile({});

  return coerceCandidateProfile({
    fullName: preferString(resume.fullName, portfolio.fullName),
    email: preferString(resume.email, portfolio.email),
    phone: preferString(resume.phone, portfolio.phone),
    linkedinUrl: preferString(resume.linkedinUrl, portfolio.linkedinUrl),
    githubUrl: preferString(resume.githubUrl, portfolio.githubUrl),
    portfolioUrl: preferString(portfolio.portfolioUrl, resume.portfolioUrl),
    skills: uniqueStrings([...resume.skills, ...portfolio.skills]),
    experienceYears: preferNumber(resume.experienceYears, portfolio.experienceYears),
    education: preferString(resume.education, portfolio.education),
    preferredRoles:
      uniqueStrings([
        ...resume.preferredRoles,
        ...portfolio.preferredRoles,
      ]),
    summary: preferString(resume.summary, portfolio.summary),
  });
}

interface ExtractedSourceResult {
  profile: CandidateProfile;
  extractedText: string;
  evidence: SourceExtractionEvidence;
}

async function extractPortfolioProfile(portfolioUrl: string): Promise<ExtractedSourceResult> {
  const normalizedPortfolioUrl = new URL(portfolioUrl).toString();
  const websiteContent = await fetchPortfolioContent(normalizedPortfolioUrl);

  if (!websiteContent.combinedText || websiteContent.combinedText.length < 120) {
    throw new Error("Could not extract enough public content from the portfolio URL");
  }

  const prompt = `Extract a candidate profile from this portfolio website content and return strict JSON only.

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
- Estimate experienceYears conservatively from the visible public content.
- Set portfolioUrl to the canonical site URL.
- Output JSON only.

Portfolio URL:
${websiteContent.canonicalUrl}

Social links:
${websiteContent.externalLinks.join("\n")}

Website content:
${websiteContent.combinedText}`;

  let parsed: Partial<CandidateProfile> | null = null;
  let extractionMethod = "gemini_portfolio";
  let fallbackUsed = false;

  try {
    const content = await generateJsonFromGemini({
      systemInstruction: "You extract structured candidate data from portfolio websites. Return valid JSON only.",
      prompt,
      temperature: 0.1,
    });
    parsed = parseJsonObject(content);
  } catch (error) {
    fallbackUsed = true;
    extractionMethod = "portfolio_heuristic";
    console.error("Gemini portfolio parsing failed, using heuristic fallback:", error);
  }

  if (!parsed) {
    fallbackUsed = true;
    extractionMethod = "portfolio_heuristic";
    parsed = inferProfileFromWebsiteText(websiteContent.combinedText, websiteContent.canonicalUrl, websiteContent.externalLinks);
  }

  return {
    profile: coerceCandidateProfile(parsed),
    extractedText: websiteContent.combinedText.slice(0, 12000),
    evidence: {
      source: "portfolio",
      used: true,
      extractionMethod,
      fallbackUsed,
      metadata: {
        canonicalUrl: websiteContent.canonicalUrl,
        externalLinks: websiteContent.externalLinks.length,
      },
    },
  };
}

async function extractResumeProfile(
  resumePath: string,
  fileName?: string,
): Promise<ExtractedSourceResult> {
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

  const prompt = `Extract a candidate profile from this resume and return strict JSON only.

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

If the PDF is visually structured, use the actual document content rather than guessing from partial text extraction.`;

  let parsed: Partial<CandidateProfile> | null = null;
  let extractionMethod = "gemini_resume_pdf";
  let fallbackUsed = false;

  try {
    const content = await generateJsonFromGemini({
      systemInstruction: "You extract structured candidate data from resumes. Return valid JSON only.",
      prompt,
      parts: [
        {
          inline_data: {
            mime_type: "application/pdf",
            data: toBase64(pdfBuffer),
          },
        },
      ],
      temperature: 0.1,
    });
    parsed = parseJsonObject(content);
  } catch (error) {
    fallbackUsed = true;
    extractionMethod = "gemini_resume_text";
    console.error("Gemini PDF parsing failed, falling back to extracted text:", error);
  }

  if (!parsed) {
    const textPrompt = `${prompt}

Resume text:
${extractedText}`;

    try {
      const content = await generateJsonFromGemini({
        systemInstruction: "You extract structured candidate data from resumes. Return valid JSON only.",
        prompt: textPrompt,
        temperature: 0.1,
      });
      parsed = parseJsonObject(content);
    } catch (error) {
      fallbackUsed = true;
      extractionMethod = "resume_regex_fallback";
      console.error("Gemini text parsing failed, using regex fallback:", error);
    }
  }

  if (!parsed) {
    fallbackUsed = true;
    extractionMethod = "resume_regex_fallback";
    parsed = inferProfileFromText(extractedText, fileName);
  }

  return {
    profile: coerceCandidateProfile(parsed),
    extractedText,
    evidence: {
      source: "resume",
      used: true,
      extractionMethod,
      fallbackUsed,
      metadata: {
        resumePath,
        fileName: fileName || "",
      },
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumePath, fileName, portfolioUrl, submissionId } = await req.json();
    const normalizedPortfolioUrl =
      typeof portfolioUrl === "string" && portfolioUrl.trim().length > 0 ? new URL(portfolioUrl).toString() : null;
    const hasResumeSource = typeof resumePath === "string" && resumePath.trim().length > 0;
    const hasPortfolioSource = Boolean(normalizedPortfolioUrl);

    if (!hasResumeSource && !hasPortfolioSource) {
      throw new Error("portfolioUrl or resumePath is required");
    }

    const warnings: string[] = [];
    const sourceResults: ExtractedSourceResult[] = [];
    const sourceErrors: Array<{ source: "resume" | "portfolio"; error: string }> = [];

    if (hasResumeSource) {
      try {
        sourceResults.push(await extractResumeProfile(String(resumePath), typeof fileName === "string" ? fileName : undefined));
      } catch (error) {
        console.error("Resume extraction failed:", error);
        sourceErrors.push({
          source: "resume",
          error: error instanceof Error ? error.message : "Resume extraction failed",
        });
      }
    }

    if (hasPortfolioSource && normalizedPortfolioUrl) {
      try {
        sourceResults.push(await extractPortfolioProfile(normalizedPortfolioUrl));
      } catch (error) {
        console.error("Portfolio extraction failed:", error);
        sourceErrors.push({
          source: "portfolio",
          error: error instanceof Error ? error.message : "Portfolio extraction failed",
        });
      }
    }

    if (sourceResults.length === 0) {
      const failureMessage = sourceErrors.map((entry) => `${entry.source}: ${entry.error}`).join(" | ") || "Failed to extract candidate profile";

      try {
        await recordMvp1Event(createAdminClient(), {
          submissionId: typeof submissionId === "string" ? submissionId : null,
          eventType: "profile_extract",
          status: "failure",
          fallbackUsed: false,
          metadata: {
            resumeProvided: hasResumeSource,
            portfolioProvided: hasPortfolioSource,
            errors: sourceErrors,
          },
        });
      } catch (eventError) {
        console.error("Failed to record extraction failure event:", eventError);
      }

      throw new Error(failureMessage);
    }

    if (sourceErrors.length > 0) {
      warnings.push(
        ...sourceErrors.map((entry) =>
          entry.source === "resume"
            ? `Resume data could not be fully used: ${entry.error}.`
            : `Portfolio data could not be fully used: ${entry.error}.`,
        ),
      );
    }

    const resumeResult = sourceResults.find((entry) => entry.evidence.source === "resume");
    const portfolioResult = sourceResults.find((entry) => entry.evidence.source === "portfolio");
    const profile = mergeCandidateProfiles(resumeResult?.profile, portfolioResult?.profile);
    const sourceEvidence: ProfileSourceEvidence = {
      usedSources: sourceResults.map((entry) => entry.evidence.source),
      sources: [
        ...sourceResults.map((entry) => entry.evidence),
        ...sourceErrors.map(
          (entry): SourceExtractionEvidence => ({
            source: entry.source,
            used: false,
            extractionMethod: "failed",
            fallbackUsed: false,
            error: entry.error,
          }),
        ),
      ],
      warnings,
      fallbackUsed: sourceResults.some((entry) => entry.evidence.fallbackUsed) || sourceErrors.length > 0,
    };
    const extractedText = sourceResults
      .map((entry) => `source: ${entry.evidence.source}\n${entry.extractedText}`)
      .join("\n\n---\n\n")
      .slice(0, 12000);

    try {
      await recordMvp1Event(createAdminClient(), {
        submissionId: typeof submissionId === "string" ? submissionId : null,
        eventType: "profile_extract",
        status: "success",
        fallbackUsed: sourceEvidence.fallbackUsed,
        metadata: {
          usedSources: sourceEvidence.usedSources,
          warnings,
          extractionMethods: sourceResults.map((entry) => ({
            source: entry.evidence.source,
            method: entry.evidence.extractionMethod,
            fallbackUsed: entry.evidence.fallbackUsed,
          })),
        },
      });
    } catch (eventError) {
      console.error("Failed to record extraction success event:", eventError);
    }

    return new Response(
      JSON.stringify({
        profile,
        extractedTextPreview: extractedText.slice(0, 1200),
        sourceEvidence,
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
