import { NextResponse } from "next/server";

const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEFAULT_MODEL = "gemini-3.5-flash";

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.AI_API_KEY) });
}

export async function POST(req: Request) {
  let body: { system?: string; user?: string; model?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_key" }, { status: 400 });
  }

  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE).replace(/\/?$/, "/");
  const model = body.model || process.env.AI_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(`${baseUrl}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: body.system ?? "" },
          { role: "user", content: body.user ?? "" },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "provider_error", detail: detail.slice(0, 500) },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json({
      content: data?.choices?.[0]?.message?.content ?? "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "proxy_error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
