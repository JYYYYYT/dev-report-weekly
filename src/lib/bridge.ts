import { invoke } from "@tauri-apps/api/core";
import type {
  ActivityEvidence,
  AIConfig,
  DateRange,
  LocalAgentStatus,
  Project,
  ProjectCommitSummary,
  ProjectInspection,
  UserIdentity,
} from "@/types";

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function chooseRepository(): Promise<string | null> {
  if (!isTauriRuntime()) {
    throw new Error("DESKTOP_REQUIRED");
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

export async function inspectRepository(path: string): Promise<ProjectInspection> {
  return invoke<ProjectInspection>("inspect_repository", { path });
}

export async function scanRepository(
  project: Project,
  dateRange: DateRange,
  identity: UserIdentity,
): Promise<ProjectCommitSummary> {
  return invoke<ProjectCommitSummary>("scan_repository", {
    request: { project, dateRange, identity },
  });
}

export async function requestReport(
  config: AIConfig,
  evidence: ActivityEvidence[],
  extraContext: string,
  language: string,
): Promise<string> {
  return invoke<string>("generate_report", {
    request: { config, evidence, extraContext, language },
  });
}

function desktopOnlyAgentStatus(): LocalAgentStatus {
  return {
    available: false,
    authenticated: false,
    compatible: false,
    version: null,
    message: "DESKTOP_REQUIRED",
  };
}

export async function detectCodex(): Promise<LocalAgentStatus> {
  if (!isTauriRuntime()) {
    return desktopOnlyAgentStatus();
  }
  return invoke<LocalAgentStatus>("detect_codex");
}

export async function cancelCodexGeneration(): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("DESKTOP_REQUIRED");
  }
  return invoke<void>("cancel_codex_generation");
}

export async function detectClaude(): Promise<LocalAgentStatus> {
  if (!isTauriRuntime()) {
    return desktopOnlyAgentStatus();
  }
  return invoke<LocalAgentStatus>("detect_claude");
}

export async function cancelClaudeGeneration(): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("DESKTOP_REQUIRED");
  }
  return invoke<void>("cancel_claude_generation");
}
