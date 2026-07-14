export interface Project {
  id: string;
  path: string;
  alias: string;
}

export interface Commit {
  hash: string;
  shortHash: string;
  subject: string;
  body?: string;
  date: string;
  authorName: string;
  authorEmail: string;
  filesChanged: string[];
  additions: number;
  deletions: number;
}

export interface ProjectCommitSummary {
  projectId: string;
  projectPath: string;
  alias: string;
  commits: Commit[];
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: string[];
}

export interface ActivityEvidence {
  id: string;
  projectId: string;
  repository: string;
  commitHash: string;
  shortHash: string;
  subject: string;
  committedAt: string;
  files: string[];
  additions: number;
  deletions: number;
}

export interface ReportItem {
  summary: string;
  evidenceIds: string[];
}

export interface ReportSection {
  heading: string;
  items: ReportItem[];
}

export interface GeneratedReportPayload {
  title: string;
  sections: ReportSection[];
  risks: ReportItem[];
  nextSteps: ReportItem[];
}

export type TimeRange =
  | "this-week"
  | "last-week"
  | "last-7-days"
  | "last-30-days"
  | "custom";

export interface TimeRangeValue {
  type: TimeRange;
  start?: string;
  end?: string;
}

export type AIProvider =
  | "codex"
  | "claude"
  | "openai"
  | "deepseek"
  | "ollama"
  | "custom";

export interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LocalAgentStatus {
  available: boolean;
  authenticated: boolean;
  compatible: boolean;
  version: string | null;
  message: string;
}

export interface UserIdentity {
  name: string;
  emails: string[];
}

export interface ProjectInspection {
  path: string;
  alias: string;
  gitUserName: string | null;
  gitUserEmail: string | null;
}

export interface DateRange {
  since: string;
  until: string;
}
