"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Build the callback URL from the actual request host so the same code works
// on localhost and on a deployment without a hardcoded origin.
async function originFromRequest(): Promise<string> {
  const h = await headers();
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const origin = await originFromRequest();
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error || !data.url) {
      redirect(`/login?error=oauth&detail=${encodeURIComponent(error?.message ?? "no url")}`);
    }
    redirect(data.url);
  } catch (e) {
    redirect(
      `/login?error=auth_unavailable&detail=${encodeURIComponent(e instanceof Error ? e.message : "auth fetch failed")}`,
    );
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // Unreachable auth backend — still bounce to /login.
  }
  redirect("/login");
}
