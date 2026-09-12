import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next 16 renamed `middleware.ts` to `proxy.ts`. Two jobs here, and only two:
//
//  1. Refresh the Supabase session cookie. Server Components cannot write
//     cookies, so without this the access token would silently expire.
//  2. Bounce obviously-anonymous requests to /login before they render.
//
// This is an OPTIMISTIC check, not the security boundary. The real gate is
// requireUser() in lib/auth.ts, called by every server action, route handler,
// and protected page. Never rely on this file alone to protect data.

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/actions"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// JSON endpoints must answer 401, not 307 to an HTML login page — a redirect
// would hand callers a page where they expected data. They are still protected:
// each handler calls requireUserJson() itself.
function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Unconfigured: send everything to /login, which explains what is missing.
  // Failing closed here matches lib/auth.ts.
  if (!url || !key) {
    if (isPublic(request.nextUrl.pathname) || isApi(request.nextUrl.pathname)) {
      return response;
    }
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "?error=unconfigured";
    return NextResponse.redirect(to);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must run: this is what rotates the token onto `response`.
  // Wrapped: Supabase auth-js throws AuthRetryableFetchError on network/DNS
  // failure (e.g. NXDOMAIN, paused project) instead of returning { error }.
  // Without this, one bad NEXT_PUBLIC_SUPABASE_URL 500s every route.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Unreachable auth backend: fail closed for protected pages, but never
    // 500 public/API routes. Protected pages redirect with a distinct error
    // so /login can explain it instead of showing a stack trace.
    if (isPublic(request.nextUrl.pathname) || isApi(request.nextUrl.pathname)) {
      return response;
    }
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "?error=auth_unavailable";
    return NextResponse.redirect(to);
  }

  if (!user && !isPublic(request.nextUrl.pathname) && !isApi(request.nextUrl.pathname)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  // Skip static assets so the auth round trip doesn't run on every image.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
