import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getAuthStatus } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

// Pretendard Std — the Latin-only cut of Pretendard (SIL OFL). Same face
// builders.cv uses, at 285KB instead of the 2MB full build, which carries CJK
// glyphs this app never renders. Self-hosted via next/font/local: no external
// request, and the file is fingerprinted and preloaded automatically.
const pretendard = localFont({
  src: "./fonts/PretendardStdVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
});

export const metadata: Metadata = {
  title: "Scout — Manual Job Application Copilot",
  description:
    "Research companies, prove fit, and send outreach that earns a yes.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const status = await getAuthStatus();
  const email = status.state === "ok" ? status.email : null;
  return (
    <html lang="en" className={pretendard.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('scout:theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <StoreProvider>
          <AppShell email={email}>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
