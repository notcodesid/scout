"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  KeyRound,
  Moon,
  Radar,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useScout } from "@/lib/store";

const NAV = [
  { href: "/", label: "Pipeline" },
  { href: "/profile", label: "Profile" },
  { href: "/tracker", label: "Tracker" },
];

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

function AISettings({ envConfigured }: { envConfigured: boolean }) {
  const { state, setAI } = useScout();
  const [open, setOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(state.ai.baseUrl);
  const [model, setModel] = useState(state.ai.model);
  const [apiKey, setApiKey] = useState(state.ai.apiKey);

  useEffect(() => {
    setBaseUrl(state.ai.baseUrl);
    setModel(state.ai.model);
    setApiKey(state.ai.apiKey);
  }, [state.ai]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const configured = Boolean(state.ai.apiKey.trim()) || envConfigured;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="AI settings"
      >
        <Settings2 />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI provider settings"
            className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4" />
                <h2 className="font-semibold">AI provider</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-base">Base URL (OpenAI-compatible)</Label>
                <Input
                  id="ai-base"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com/v1beta/openai/"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-model">Model</Label>
                <Input
                  id="ai-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gemini-3.5-flash"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-key">API key</Label>
                <Input
                  id="ai-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your key (stored only in this browser)"
                  autoComplete="off"
                />
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Free default: Google AI Studio (Gemini). Get a key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  aistudio.google.com/apikey
                </a>
                . Groq, OpenRouter, DeepSeek, and OpenAI also work via this field.
                The key stays in your browser; the app is local-first.
              </p>

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <span className={configured ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium"}>
                    {configured ? "live" : "mock mode"}
                  </span>
                </p>
                <Button
                  onClick={() => {
                    setAI({ baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() });
                    setOpen(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useScout();
  const [envConfigured, setEnvConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai")
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (!cancelled && data && typeof data.configured === "boolean") {
          setEnvConfigured(data.configured);
        }
      })
      .catch(() => {
        // keep default (false); the badge stays on mock
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aiConfigured = Boolean(state.ai.apiKey.trim()) || envConfigured;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Radar className="size-5" />
            Scout
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:inline-flex",
                aiConfigured
                  ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-600/10 text-amber-700 dark:text-amber-400"
              )}
              title={
                aiConfigured
                  ? "AI provider configured"
                  : "Mock mode: add an API key in settings for real AI"
              }
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  aiConfigured ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              {aiConfigured ? "AI on" : "Mock"}
            </span>
            <ThemeToggle />
            <AISettings envConfigured={envConfigured} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
