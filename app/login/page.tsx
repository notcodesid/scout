import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { signInWithGoogleAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAuthStatus, missingAuthEnv } from "@/lib/auth";

export const dynamic = "force-dynamic";

function ErrorNote({
  error,
  detail,
  email,
}: {
  error?: string;
  detail?: string;
  email?: string;
}) {
  if (!error) return null;

  if (error === "unconfigured") {
    const missing = missingAuthEnv();
    return (
      <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm">
        <p className="font-medium text-amber-700">
          Auth is not configured
        </p>
        <p className="mt-1 text-muted-foreground">
          Set {missing.length ? "these in " : ""}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> and
          restart the dev server:
        </p>
        <ul className="mt-2 space-y-0.5">
          {missing.map((m) => (
            <li key={m} className="font-mono text-xs text-amber-700">
              {m}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const message =
    error === "denied"
      ? `${email || "That account"} is not on the allowlist. Add it to AUTH_ALLOWED_EMAILS if it should be.`
      : error === "missing_code"
        ? "Google redirected back without an authorization code. Try again."
        : detail || "Sign-in failed. Try again.";

  return (
    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-left text-sm">
      <p className="font-medium text-destructive">Sign-in blocked</p>
      <p className="mt-1 break-words text-muted-foreground">{message}</p>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string; email?: string }>;
}) {
  const { error, detail, email } = await searchParams;
  const status = await getAuthStatus();
  if (status.state === "ok") redirect("/");

  const blocked = status.state === "unconfigured";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm p-6 text-center">
        <Radar className="mx-auto size-8" />
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Scout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fewer companies, better applications. Sign in to reach your pipeline.
        </p>

        <form action={signInWithGoogleAction} className="mt-5">
          <Button type="submit" className="w-full" disabled={blocked}>
            Continue with Google
          </Button>
        </form>

        <ErrorNote
          error={blocked ? "unconfigured" : error}
          detail={detail}
          email={email}
        />

        <p className="mt-4 text-xs text-muted-foreground">
          Scout is a single-person tool. Only allowlisted accounts can sign in.
        </p>
      </Card>
    </div>
  );
}
