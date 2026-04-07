const GEMINI_MODEL = "gemini-2.5-flash";

interface GeminiJsonOptions {
  prompt?: string;
  parts?: Array<Record<string, unknown>>;
  systemInstruction?: string;
  temperature?: number;
}

interface GeminiTextOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}

function getGeminiApiKey() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

function extractGeminiText(payload: Record<string, unknown>): string {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content?.parts : [];
  const texts = parts
    .map((part) => (part as Record<string, unknown>)?.text)
    .filter((value): value is string => typeof value === "string");

  return texts.join("\n").trim();
}

async function callGemini(body: Record<string, unknown>) {
  const apiKey = getGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  return await response.json() as Record<string, unknown>;
}

export async function generateJsonFromGemini({ prompt, parts: extraParts, systemInstruction, temperature = 0.2 }: GeminiJsonOptions): Promise<string> {
  const parts = prompt ? [{ text: prompt }] : [];
  if (Array.isArray(extraParts)) {
    parts.push(...extraParts);
  }

  if (parts.length === 0) {
    throw new Error("Gemini request requires a prompt or parts");
  }

  const payload = await callGemini({
    systemInstruction: systemInstruction
      ? {
          parts: [{ text: systemInstruction }],
        }
      : undefined,
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  });

  return extractGeminiText(payload);
}

export async function generateTextFromGemini({ prompt, systemInstruction, temperature = 0.4 }: GeminiTextOptions): Promise<string> {
  const payload = await callGemini({
    systemInstruction: systemInstruction
      ? {
          parts: [{ text: systemInstruction }],
        }
      : undefined,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
    },
  });

  return extractGeminiText(payload);
}
