import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { authConfigured, createClient } from "./supabase/server";

// Scout is a single-person tool, so login is a gate rather than multi-tenancy:
// a Google account either appears in AUTH_ALLOWED_EMAILS or it gets nothing.
// Everything below fails CLOSED — an unset or empty allowlist locks everyone
// out, including a misconfigured deploy. That is deliberate: the failure mode
// of a mistake here should be "nobody gets in", never "everybody gets in".
export function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const list = allowedEmails();
  if (!list.length) return false;
  return list.includes(email.trim().toLowerCase());
}

export type AuthStatus =
  | { state: "unconfigured"; missing: string[] }
  | { state: "anonymous" }
  | { state: "denied"; email: string }
  | { state: "ok"; user: User; email: string };

export function missingAuthEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!allowedEmails().length) missing.push("AUTH_ALLOWED_EMAILS");
  return missing;
}

// Memoized for the render pass so a page + its server actions don't each pay
// for a round trip. getUser() is used rather than getSession(): getSession()
// only decodes the cookie, which the client controls, so it must never be the
// basis of an authorization decision.
export const getAuthStatus = cache(async (): Promise<AuthStatus> => {
  const missing = missingAuthEnv();
  if (missing.length) return { state: "unconfigured", missing };
  if (!authConfigured()) return { state: "unconfigured", missing: ["supabase"] };

  const supabase = await createClient();
  // getUser() throws (AuthRetryableFetchError) on network/DNS failure rather
  // than returning { error } — e.g. NXDOMAIN when NEXT_PUBLIC_SUPABASE_URL
  // points at a deleted/paused project. Treat as anonymous so callers
  // redirect to /login instead of 500ing.
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { state: "anonymous" };
    const email = data.user.email ?? "";
    if (!isAllowedEmail(email)) return { state: "denied", email };
    return { state: "ok", user: data.user, email };
  } catch {
    return { state: "anonymous" };
  }
});

export async function getSessionUser(): Promise<User | null> {
  const status = await getAuthStatus();
  return status.state === "ok" ? status.user : null;
}

// The real gate. Call this at the top of every server action, route handler,
// and protected page — proxy.ts is only an optimistic redirect and must not be
// treated as the security boundary.
export async function requireUser(): Promise<User> {
  const status = await getAuthStatus();
  if (status.state === "ok") return status.user;
  if (status.state === "denied") redirect("/login?error=denied");
  if (status.state === "unconfigured") redirect("/login?error=unconfigured");
  redirect("/login");
}

// Signed in, but has the profile been set up? Pages that assume a profile call
// this so a first-time user lands in /onboarding instead of an empty pipeline.
// Kept out of proxy.ts deliberately: it is a DB read, and proxy runs on every
// request including prefetches.
export async function requireOnboardedUser(): Promise<User> {
  const user = await requireUser();
  const { isOnboarded } = await import("./onboarding");
  if (!(await isOnboarded())) redirect("/onboarding");
  const { isIntakeDone } = await import("./intake");
  if (!(await isIntakeDone())) redirect("/onboarding/intake");
  return user;
}

// Same check for JSON endpoints, which should 401 rather than redirect.
export async function requireUserJson(): Promise<User | null> {
  const status = await getAuthStatus();
  return status.state === "ok" ? status.user : null;
}
