"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AIConfig,
  AppState,
  EvidenceProfile,
  Project,
} from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "scout:v1";

const emptyProfile: EvidenceProfile = {
  id: undefined,
  name: "",
  headline: "",
  about: "",
  location: "",
  email: "",
  phone: "",
  phoneCountry: "US",
  linkedinUrl: "",
  hasLinkedin: true,
  lookingFor: "",
  resumeFileName: "",
  resumeText: "",
  onboardedAt: null,
  timezone: "",
  githubUsername: "",
  availability: "",
  remote: false,
  openToRelocate: false,
  targetRoles: [],
  links: [],
  skills: [],
  projects: [],
  education: [],
  experience: [],
};

const emptyAI: AIConfig = { baseUrl: "", model: "", apiKey: "" };

function defaultState(): AppState {
  return { profile: emptyProfile, ai: emptyAI };
}

function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      profile: { ...emptyProfile, ...(parsed.profile ?? {}) },
      ai: { ...emptyAI, ...(parsed.ai ?? {}) },
    };
  } catch {
    return defaultState();
  }
}

interface ScoutContextValue {
  state: AppState;
  updateProfile: (patch: Partial<EvidenceProfile>) => void;
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setAI: (patch: Partial<AIConfig>) => void;
  resetAll: () => void;
}

const ScoutContext = createContext<ScoutContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Start from the same deterministic default on server and client so SSR
  // hydration always matches, then load real data on mount. This is the
  // standard pattern for local-first (localStorage) apps.
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable; keep running in memory
    }
  }, [state, ready]);

  const updateProfile = useCallback((patch: Partial<EvidenceProfile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const addProject = useCallback(
    (project: Omit<Project, "id">) => {
      setState((s) => ({
        ...s,
        profile: { ...s.profile, projects: [...s.profile.projects, { ...project, id: uid() }] },
      }));
    },
    []
  );

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        projects: s.profile.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      },
    }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, projects: s.profile.projects.filter((p) => p.id !== id) },
    }));
  }, []);

  const setAI = useCallback((patch: Partial<AIConfig>) => {
    setState((s) => ({ ...s, ai: { ...s.ai, ...patch } }));
  }, []);

  const resetAll = useCallback(() => {
    setState(defaultState());
  }, []);

  const value = useMemo<ScoutContextValue>(
    () => ({
      state,
      updateProfile,
      addProject,
      updateProject,
      deleteProject,
      setAI,
      resetAll,
    }),
    [
      state,
      updateProfile,
      addProject,
      updateProject,
      deleteProject,
      setAI,
      resetAll,
    ]
  );

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Scout</p>
      </div>
    );
  }

  return <ScoutContext.Provider value={value}>{children}</ScoutContext.Provider>;
}

export function useScout(): ScoutContextValue {
  const ctx = useContext(ScoutContext);
  if (!ctx) throw new Error("useScout must be used within StoreProvider");
  return ctx;
}
