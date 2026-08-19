"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { useScout } from "@/lib/store";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("scout:theme", next ? "dark" : "light");
    } catch {
      // ignore
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export function AppShell({
  children,
  email,
}: {
  children: ReactNode;
  email: string | null;
}) {
  const pathname = usePathname();
  const { updateProfile } = useScout();
  const signedIn = Boolean(email);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/profile")
      // Guard on res.ok: a 401 body would otherwise be merged into the profile.
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          updateProfile(data);
        }
      })
      .catch(() => {
        // DB may not be reachable; keep the local mirror as-is
      });
    return () => {
      cancelled = true;
    };
  }, [updateProfile, signedIn]);

  // The intake owns the whole viewport: its transcript is an internal scroll
  // area, which only works if the page itself cannot grow or scroll.
  if (pathname === "/onboarding/intake") {
    return <div className="h-dvh overflow-hidden">{children}</div>;
  }

  // Login and the rest of onboarding render bare: no nav, no settings, nothing
  // that assumes a finished profile. Onboarding is a funnel — links out are exits.
  if (pathname === "/login" || pathname.startsWith("/onboarding")) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-7 px-4 sm:px-6">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            Scout
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {email ? (
              <div className="flex items-center gap-3 pl-1">
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {email}
                </span>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-sm text-foreground transition-opacity hover:opacity-70"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
