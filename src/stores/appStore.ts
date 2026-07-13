import { create } from "zustand";
import i18n from "@/i18n";
import { requestReport, scanRepository } from "@/lib/bridge";
import {
  buildEvidence,
  renderReportMarkdown,
  resolveDateRange,
  validateGeneratedReport,
} from "@/lib/report";
import type {
  AIConfig,
  AIProvider,
  Project,
  ProjectCommitSummary,
  TimeRangeValue,
  UserIdentity,
} from "@/types";

interface AppState {
  projects: Project[];
  selectedProjectIds: string[];
  timeRange: TimeRangeValue;
  summaries: ProjectCommitSummary[];
  excludedCommitHashes: string[];
  aiContext: string;
  generatedReport: string;
  isScanning: boolean;
  scanError: string;
  isGenerating: boolean;
  generationError: string;
  aiConfig: AIConfig;
  userIdentity: UserIdentity;
  settingsOpen: boolean;
  currentStep: number;

  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string) => void;
  deselectProject: (id: string) => void;
  setTimeRange: (range: TimeRangeValue) => void;
  setSummaries: (summaries: ProjectCommitSummary[]) => void;
  toggleCommit: (hash: string) => void;
  setAiContext: (context: string) => void;
  setGeneratedReport: (report: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setAiConfig: (config: Partial<AIConfig>) => void;
  selectAiProvider: (provider: AIProvider) => void;
  setUserIdentity: (identity: Partial<UserIdentity>) => void;
  setSettingsOpen: (open: boolean) => void;
  setCurrentStep: (step: number) => void;
  scanSelectedProjects: () => Promise<boolean>;
  generateWeeklyReport: (extraContext?: string) => Promise<boolean>;
}

export const providerPresets: Record<
  AIProvider,
  Pick<AIConfig, "baseUrl" | "model">
> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5-mini",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    model: "qwen3:8b",
  },
  custom: { baseUrl: "", model: "" },
};

const defaultAiConfig: AIConfig = {
  provider: "deepseek",
  apiKey: "",
  ...providerPresets.deepseek,
};

const defaultUserIdentity: UserIdentity = { name: "", emails: [] };

interface PersistedPreferences {
  projects: Project[];
  selectedProjectIds: string[];
  timeRange: TimeRangeValue;
  aiConfig: Omit<AIConfig, "apiKey">;
  userIdentity: UserIdentity;
}

function loadPreferences(): Partial<PersistedPreferences> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem("devweek-preferences") ?? "{}");
  } catch {
    return {};
  }
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const keys: Record<string, string> = {
    DATE_RANGE_INCOMPLETE: "errors.dateRangeIncomplete",
    DATE_RANGE_ORDER: "errors.dateRangeOrder",
    INVALID_AI_REPORT: "errors.invalidAiReport",
    UNVERIFIED_AI_REPORT: "errors.unverifiedAiReport",
  };
  return keys[message] ? i18n.t(keys[message]) : message;
}

const persisted = loadPreferences();

export const useAppStore = create<AppState>((set, get) => ({
  projects: persisted.projects ?? [],
  selectedProjectIds: persisted.selectedProjectIds ?? [],
  timeRange: persisted.timeRange ?? { type: "this-week" },
  summaries: [],
  excludedCommitHashes: [],
  aiContext: "",
  generatedReport: "",
  isScanning: false,
  scanError: "",
  isGenerating: false,
  generationError: "",
  aiConfig: { ...defaultAiConfig, ...persisted.aiConfig, apiKey: "" },
  userIdentity: persisted.userIdentity ?? defaultUserIdentity,
  settingsOpen: false,
  currentStep: 0,

  addProject: (project) =>
    set((state) => {
      const existing = state.projects.find((item) => item.path === project.path);
      const selectedId = existing?.id ?? project.id;
      const projects = existing ? state.projects : [...state.projects, project];
      return {
        projects,
        selectedProjectIds: state.selectedProjectIds.includes(selectedId)
          ? state.selectedProjectIds
          : [...state.selectedProjectIds, selectedId],
      };
    }),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      selectedProjectIds: state.selectedProjectIds.filter(
        (projectId) => projectId !== id,
      ),
      summaries: state.summaries.filter((summary) => summary.projectId !== id),
    })),
  selectProject: (id) =>
    set((state) => ({
      selectedProjectIds: state.selectedProjectIds.includes(id)
        ? state.selectedProjectIds
        : [...state.selectedProjectIds, id],
    })),
  deselectProject: (id) =>
    set((state) => ({
      selectedProjectIds: state.selectedProjectIds.filter(
        (projectId) => projectId !== id,
      ),
    })),
  setTimeRange: (timeRange) => set({ timeRange }),
  setSummaries: (summaries) => set({ summaries }),
  toggleCommit: (hash) =>
    set((state) => ({
      excludedCommitHashes: state.excludedCommitHashes.includes(hash)
        ? state.excludedCommitHashes.filter((item) => item !== hash)
        : [...state.excludedCommitHashes, hash],
    })),
  setAiContext: (aiContext) => set({ aiContext }),
  setGeneratedReport: (generatedReport) => set({ generatedReport }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setAiConfig: (config) =>
    set((state) => ({ aiConfig: { ...state.aiConfig, ...config } })),
  selectAiProvider: (provider) =>
    set((state) => ({
      aiConfig: {
        ...state.aiConfig,
        provider,
        ...providerPresets[provider],
      },
    })),
  setUserIdentity: (identity) =>
    set((state) => ({
      userIdentity: { ...state.userIdentity, ...identity },
    })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setCurrentStep: (currentStep) => set({ currentStep }),

  scanSelectedProjects: async () => {
    const state = get();
    const selected = state.projects.filter((project) =>
      state.selectedProjectIds.includes(project.id),
    );
    if (!selected.length) {
      set({ scanError: i18n.t("errors.noProjects") });
      return false;
    }

    set({ isScanning: true, scanError: "", excludedCommitHashes: [] });
    try {
      const dateRange = resolveDateRange(state.timeRange);
      const summaries = await Promise.all(
        selected.map((project) =>
          scanRepository(project, dateRange, state.userIdentity),
        ),
      );
      set({ summaries, isScanning: false });
      return true;
    } catch (error) {
      set({ isScanning: false, scanError: errorMessage(error) });
      return false;
    }
  },

  generateWeeklyReport: async (extraContext) => {
    const context = extraContext ?? get().aiContext;
    const state = get();
    const evidence = buildEvidence(
      state.summaries,
      state.excludedCommitHashes,
    );
    if (!evidence.length) {
      set({ generationError: i18n.t("errors.noEvidence") });
      return false;
    }
    if (
      (state.aiConfig.provider === "openai" ||
        state.aiConfig.provider === "deepseek") &&
      !state.aiConfig.apiKey.trim()
    ) {
      set({ generationError: i18n.t("errors.apiKeyRequired") });
      return false;
    }

    set({ isGenerating: true, generationError: "", aiContext: context });
    try {
      const locale = i18n.language.startsWith("zh") ? "zh" : "en";
      const language = locale === "zh" ? "简体中文" : "English";
      const raw = await requestReport(
        state.aiConfig,
        evidence,
        context,
        language,
      );
      const validated = validateGeneratedReport(
        raw,
        evidence,
        Boolean(context.trim()),
      );
      set({
        generatedReport: renderReportMarkdown(validated, evidence, locale),
        isGenerating: false,
        currentStep: 3,
      });
      return true;
    } catch (error) {
      set({ isGenerating: false, generationError: errorMessage(error) });
      return false;
    }
  },
}));

if (typeof window !== "undefined") {
  useAppStore.subscribe((state) => {
    const preferences: PersistedPreferences = {
      projects: state.projects,
      selectedProjectIds: state.selectedProjectIds,
      timeRange: state.timeRange,
      aiConfig: {
        provider: state.aiConfig.provider,
        baseUrl: state.aiConfig.baseUrl,
        model: state.aiConfig.model,
      },
      userIdentity: state.userIdentity,
    };
    window.localStorage.setItem(
      "devweek-preferences",
      JSON.stringify(preferences),
    );
  });
}
