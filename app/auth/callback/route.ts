import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Google sends the user back here with a one-time code. Exchange it for a
// session, then immediately re-check the allowlist: anyone with a Google
// account can reach this point, so this is where non-allowlisted users are
// turned away. Their session is destroyed rather than left dangling.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth&detail=${encodeURIComponent(oauthError)}`
    );
  }
  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=exchange&detail=${encodeURIComponent(error.message)}`
    );
  }

  const email = data.user?.email ?? "";
  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=denied&email=${encodeURIComponent(email)}`
    );
  }

  return NextResponse.redirect(origin);
}
