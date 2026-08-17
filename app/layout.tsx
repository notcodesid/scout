import type { Metadata } from "next";
import "./globals.css";
import { getAuthStatus } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/app-shell";

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
    <html lang="en" suppressHydrationWarning>
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
