import { create } from "zustand";
import i18n from "@/i18n";
import {
  cancelClaudeGeneration,
  cancelCodexGeneration,
  detectClaude as detectLocalClaude,
  detectCodex as detectLocalCodex,
  requestReport,
  scanRepository,
} from "@/lib/bridge";
import {
  buildEvidence,
  renderReportMarkdown,
  resolveDateRange,
  validateGeneratedReport,
} from "@/lib/report";
import type {
  AIConfig,
  AIProvider,
  LocalAgentStatus,
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
  codexStatus: LocalAgentStatus | null;
  isDetectingCodex: boolean;
  claudeStatus: LocalAgentStatus | null;
  isDetectingClaude: boolean;

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
  detectCodex: () => Promise<LocalAgentStatus>;
  detectClaude: () => Promise<LocalAgentStatus>;
  cancelWeeklyReport: () => Promise<void>;
}

export const providerPresets: Record<
  AIProvider,
  Pick<AIConfig, "baseUrl" | "model">
> = {
  codex: { baseUrl: "", model: "default" },
  claude: { baseUrl: "", model: "default" },
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
    CODEX_NOT_FOUND: "errors.codexNotFound",
    CODEX_AUTH_REQUIRED: "errors.codexAuthRequired",
    CODEX_INCOMPATIBLE: "errors.codexIncompatible",
    CODEX_BUSY: "errors.codexBusy",
    CODEX_TIMEOUT: "errors.codexTimeout",
    CODEX_EXECUTION_FAILED: "errors.codexExecutionFailed",
    CODEX_INVALID_RESPONSE: "errors.codexInvalidResponse",
    CODEX_START_FAILED: "errors.codexStartFailed",
    CLAUDE_NOT_FOUND: "errors.claudeNotFound",
    CLAUDE_AUTH_REQUIRED: "errors.claudeAuthRequired",
    CLAUDE_INCOMPATIBLE: "errors.claudeIncompatible",
    CLAUDE_BUSY: "errors.claudeBusy",
    CLAUDE_TIMEOUT: "errors.claudeTimeout",
    CLAUDE_EXECUTION_FAILED: "errors.claudeExecutionFailed",
    CLAUDE_AUTH_FAILED: "errors.claudeAuthFailed",
    CLAUDE_MODEL_UNAVAILABLE: "errors.claudeModelUnavailable",
    CLAUDE_GATEWAY_INCOMPATIBLE: "errors.claudeGatewayIncompatible",
    CLAUDE_SERVICE_UNAVAILABLE: "errors.claudeServiceUnavailable",
    CLAUDE_RATE_LIMITED: "errors.claudeRateLimited",
    CLAUDE_INVALID_RESPONSE: "errors.claudeInvalidResponse",
    CLAUDE_START_FAILED: "errors.claudeStartFailed",
    DESKTOP_REQUIRED: "errors.desktopRequired",
  };
  return keys[message] ? i18n.t(keys[message]) : message;
}

const persisted = loadPreferences();
let codexDetectionPromise: Promise<LocalAgentStatus> | null = null;
let claudeDetectionPromise: Promise<LocalAgentStatus> | null = null;

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
  codexStatus: null,
  isDetectingCodex: false,
  claudeStatus: null,
  isDetectingClaude: false,

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
    if (state.aiConfig.provider === "codex") {
      const status = state.codexStatus ?? (await get().detectCodex());
      if (!status.available || !status.compatible || !status.authenticated) {
        set({ generationError: errorMessage(status.message) });
        return false;
      }
    }
    if (state.aiConfig.provider === "claude") {
      const status = state.claudeStatus ?? (await get().detectClaude());
      if (!status.available || !status.compatible || !status.authenticated) {
        set({ generationError: errorMessage(status.message) });
        return false;
      }
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
      const message = error instanceof Error ? error.message : String(error);
      if (message === "CODEX_CANCELED" || message === "CLAUDE_CANCELED") {
        set({ isGenerating: false, generationError: "" });
        return false;
      }
      set({ isGenerating: false, generationError: errorMessage(error) });
      return false;
    }
  },

  detectCodex: () => {
    if (codexDetectionPromise) return codexDetectionPromise;
    set({ isDetectingCodex: true });
    const pending = detectLocalCodex()
      .then((status) => {
        set({ codexStatus: status, isDetectingCodex: false });
        return status;
      })
      .catch((error: unknown) => {
        const status: LocalAgentStatus = {
          available: false,
          authenticated: false,
          compatible: false,
          version: null,
          message: error instanceof Error ? error.message : String(error),
        };
        set({ codexStatus: status, isDetectingCodex: false });
        return status;
      })
      .finally(() => {
        codexDetectionPromise = null;
      });
    codexDetectionPromise = pending;
    return pending;
  },

  detectClaude: () => {
    if (claudeDetectionPromise) return claudeDetectionPromise;
    set({ isDetectingClaude: true });
    const pending = detectLocalClaude()
      .then((status) => {
        set({ claudeStatus: status, isDetectingClaude: false });
        return status;
      })
      .catch((error: unknown) => {
        const status: LocalAgentStatus = {
          available: false,
          authenticated: false,
          compatible: false,
          version: null,
          message: error instanceof Error ? error.message : String(error),
        };
        set({ claudeStatus: status, isDetectingClaude: false });
        return status;
      })
      .finally(() => {
        claudeDetectionPromise = null;
      });
    claudeDetectionPromise = pending;
    return pending;
  },

  cancelWeeklyReport: async () => {
    const { aiConfig, isGenerating } = get();
    if (!isGenerating) return;
    if (aiConfig.provider === "codex") {
      await cancelCodexGeneration();
    } else if (aiConfig.provider === "claude") {
      await cancelClaudeGeneration();
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
