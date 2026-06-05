import { create } from "zustand";
import type {
  Project,
  ProjectCommitSummary,
  TimeRangeValue,
  AIConfig,
  UserIdentity,
} from "../types";
import { getFolderName } from "../lib/utils";

interface AppState {
  projects: Project[];
  selectedProjectIds: string[];
  timeRange: TimeRangeValue;
  summaries: ProjectCommitSummary[];
  aiContext: string;
  generatedReport: string;
  isGenerating: boolean;
  aiConfig: AIConfig;
  userIdentity: UserIdentity;
  settingsOpen: boolean;
  currentStep: number;

  // Actions
  addProject: (project: Omit<Project, "alias">) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string) => void;
  deselectProject: (id: string) => void;
  setTimeRange: (range: TimeRangeValue) => void;
  setSummaries: (summaries: ProjectCommitSummary[]) => void;
  setAiContext: (context: string) => void;
  setGeneratedReport: (report: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setAiConfig: (config: Partial<AIConfig>) => void;
  setUserIdentity: (identity: Partial<UserIdentity>) => void;
  setSettingsOpen: (open: boolean) => void;
  setCurrentStep: (step: number) => void;
}

const defaultAiConfig: AIConfig = {
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
};

const defaultUserIdentity: UserIdentity = {
  name: "",
  emails: [],
};

export const useAppStore = create<AppState>((set) => ({
  projects: [
    { id: "demo-1", path: "/Users/demo/frontend", alias: "frontend" },
    { id: "demo-2", path: "/Users/demo/backend-api", alias: "backend-api" },
    { id: "demo-3", path: "/Users/demo/admin-dashboard", alias: "admin-dashboard" },
  ],
  selectedProjectIds: ["demo-1", "demo-2"],
  timeRange: { type: "this-week" },
  summaries: [],
  aiContext: "",
  generatedReport: "",
  isGenerating: false,
  aiConfig: defaultAiConfig,
  userIdentity: defaultUserIdentity,
  settingsOpen: false,
  currentStep: 0,

  addProject: (project) =>
    set((state) => ({
      projects: [
        ...state.projects,
        { ...project, alias: getFolderName(project.path) },
      ],
      selectedProjectIds: [...state.selectedProjectIds, project.id],
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectIds: state.selectedProjectIds.filter((pid) => pid !== id),
    })),

  selectProject: (id) =>
    set((state) => ({
      selectedProjectIds: [...state.selectedProjectIds, id],
    })),

  deselectProject: (id) =>
    set((state) => ({
      selectedProjectIds: state.selectedProjectIds.filter((pid) => pid !== id),
    })),

  setTimeRange: (range) => set({ timeRange: range }),
  setSummaries: (summaries) => set({ summaries }),
  setAiContext: (context) => set({ aiContext: context }),
  setGeneratedReport: (report) => set({ generatedReport: report }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setAiConfig: (config) =>
    set((state) => ({ aiConfig: { ...state.aiConfig, ...config } })),
  setUserIdentity: (identity) =>
    set((state) => ({
      userIdentity: { ...state.userIdentity, ...identity },
    })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCurrentStep: (step) => set({ currentStep: step }),
}));
