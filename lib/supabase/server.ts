import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseEnv(): { url: string; key: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  };
}

export function authConfigured(): boolean {
  const { url, key } = supabaseEnv();
  return Boolean(url && key);
}

// Server-side Supabase client bound to the request's cookie jar. `cookies()` is
// async in Next 16, so this is too.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. Harmless: proxy.ts refreshes
          // the session on every request, so the rotated token still lands.
        }
      },
    },
  });
}
