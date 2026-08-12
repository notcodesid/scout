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
  Company,
  EvidenceProfile,
  Project,
  ProofTask,
  Stage,
} from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "scout:v1";

const emptyProfile: EvidenceProfile = {
  name: "",
  headline: "",
  location: "",
  email: "",
  links: [],
  skills: [],
  projects: [],
};

const emptyAI: AIConfig = { baseUrl: "", model: "", apiKey: "" };

function defaultState(): AppState {
  return { profile: emptyProfile, companies: [], ai: emptyAI };
}

function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      profile: { ...emptyProfile, ...(parsed.profile ?? {}) },
      companies: parsed.companies ?? [],
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
  addCompany: (
    company: Omit<
      Company,
      "id" | "createdAt" | "updatedAt" | "stage" | "proofTasks" | "followUpDate"
    >
  ) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  setCompanyStage: (id: string, stage: Stage) => void;
  addProofTask: (companyId: string, task: Omit<ProofTask, "id">) => void;
  updateProofTask: (companyId: string, taskId: string, patch: Partial<ProofTask>) => void;
  deleteProofTask: (companyId: string, taskId: string) => void;
  setAI: (patch: Partial<AIConfig>) => void;
  loadSample: () => void;
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

  const addCompany = useCallback(
    (
      company: Omit<
        Company,
        "id" | "createdAt" | "updatedAt" | "stage" | "proofTasks" | "followUpDate"
      >
    ) => {
      setState((s) => ({
        ...s,
        companies: [
          {
            ...company,
            id: uid(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stage: "research",
            proofTasks: [],
            followUpDate: "",
          },
          ...s.companies,
        ],
      }));
    },
    []
  );

  const updateCompany = useCallback((id: string, patch: Partial<Company>) => {
    setState((s) => ({
      ...s,
      companies: s.companies.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
      ),
    }));
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setState((s) => ({ ...s, companies: s.companies.filter((c) => c.id !== id) }));
  }, []);

  const setCompanyStage = useCallback(
    (id: string, stage: Stage) => {
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === id ? { ...c, stage, updatedAt: Date.now() } : c
        ),
      }));
    },
    []
  );

  const addProofTask = useCallback(
    (companyId: string, task: Omit<ProofTask, "id">) => {
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === companyId
            ? { ...c, proofTasks: [...c.proofTasks, { ...task, id: uid() }] }
            : c
        ),
      }));
    },
    []
  );

  const updateProofTask = useCallback(
    (companyId: string, taskId: string, patch: Partial<ProofTask>) => {
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === companyId
            ? {
                ...c,
                proofTasks: c.proofTasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
              }
            : c
        ),
      }));
    },
    []
  );

  const deleteProofTask = useCallback(
    (companyId: string, taskId: string) => {
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === companyId
            ? { ...c, proofTasks: c.proofTasks.filter((t) => t.id !== taskId) }
            : c
        ),
      }));
    },
    []
  );

  const setAI = useCallback((patch: Partial<AIConfig>) => {
    setState((s) => ({ ...s, ai: { ...s.ai, ...patch } }));
  }, []);

  const loadSample = useCallback(() => {
    const sample: AppState = {
      profile: {
        name: "Your Name",
        headline: "Full-stack developer building for real users",
        location: "India",
        email: "you@example.com",
        links: [
          { label: "GitHub", url: "https://github.com/you" },
          { label: "Portfolio", url: "https://you.dev" },
        ],
        skills: ["TypeScript", "React", "Node.js", "Postgres"],
        projects: [
          {
            id: uid(),
            name: "Submission tracker for design students",
            problem:
              "Design students track deadlines across 5+ platforms and miss submissions.",
            work: "Built a tool that aggregates deadlines from 5 platforms into one view with reminders.",
            outcome: "Used by 150+ students; processes ~2k deadline checks a week.",
            users:
              "Posted in 3 design communities; ~40 signups in the first week, 15 stayed active.",
            links: ["https://yoursite.com"],
            tags: ["React", "Supabase"],
          },
        ],
      },
      companies: [
        {
          id: uid(),
          name: "Sample Startup",
          url: "https://samplestartup.com",
          jobUrl: "",
          notes: "Paste the job post here. This is sample data so you can try the flow.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stage: "research",
          contacts: [],
          proofTasks: [],
          followUpDate: "",
        },
      ],
      ai: { ...state.ai },
    };
    setState(sample);
  }, [state.ai]);

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
      addCompany,
      updateCompany,
      deleteCompany,
      setCompanyStage,
      addProofTask,
      updateProofTask,
      deleteProofTask,
      setAI,
      loadSample,
      resetAll,
    }),
    [
      state,
      updateProfile,
      addProject,
      updateProject,
      deleteProject,
      addCompany,
      updateCompany,
      deleteCompany,
      setCompanyStage,
      addProofTask,
      updateProofTask,
      deleteProofTask,
      setAI,
      loadSample,
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
