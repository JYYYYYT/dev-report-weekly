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

export type AIProvider = "openai" | "deepseek" | "claude" | "ollama";

export interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface UserIdentity {
  name: string;
  emails: string[];
}
