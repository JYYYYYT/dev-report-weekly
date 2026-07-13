import type {
  ActivityEvidence,
  Commit,
  GeneratedReportPayload,
  ProjectCommitSummary,
  ReportItem,
  TimeRangeValue,
} from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function resolveDateRange(
  range: TimeRangeValue,
  now = new Date(),
): { since: string; until: string } {
  if (range.type === "custom") {
    if (!range.start || !range.end) {
      throw new Error("DATE_RANGE_INCOMPLETE");
    }
    if (range.start > range.end) {
      throw new Error("DATE_RANGE_ORDER");
    }
    return { since: range.start, until: `${range.end} 23:59:59` };
  }

  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const thisMonday = new Date(today.getTime() - mondayOffset * DAY_MS);

  if (range.type === "this-week") {
    return { since: toLocalDate(thisMonday), until: `${toLocalDate(today)} 23:59:59` };
  }
  if (range.type === "last-week") {
    const previousMonday = new Date(thisMonday.getTime() - 7 * DAY_MS);
    const previousSunday = new Date(thisMonday.getTime() - DAY_MS);
    return {
      since: toLocalDate(previousMonday),
      until: `${toLocalDate(previousSunday)} 23:59:59`,
    };
  }

  const days = range.type === "last-7-days" ? 6 : 29;
  return {
    since: toLocalDate(new Date(today.getTime() - days * DAY_MS)),
    until: `${toLocalDate(today)} 23:59:59`,
  };
}

export function evidenceId(projectId: string, commit: Pick<Commit, "shortHash">) {
  return `${projectId}:${commit.shortHash}`;
}

export function buildEvidence(
  summaries: ProjectCommitSummary[],
  excludedCommitHashes: string[],
): ActivityEvidence[] {
  const excluded = new Set(excludedCommitHashes);
  return summaries.flatMap((summary) =>
    summary.commits
      .filter((commit) => !excluded.has(commit.hash))
      .map((commit) => ({
        id: evidenceId(summary.projectId, commit),
        projectId: summary.projectId,
        repository: summary.alias,
        commitHash: commit.hash,
        shortHash: commit.shortHash,
        subject: commit.subject,
        committedAt: commit.date,
        files: commit.filesChanged,
        additions: commit.additions,
        deletions: commit.deletions,
      })),
  );
}

export function renderEvidenceContext(
  evidence: ActivityEvidence[],
  locale: "zh" | "en" = "zh",
): string {
  if (!evidence.length) {
    return locale === "zh" ? "没有选中的 Git 证据。" : "No Git evidence selected.";
  }

  const byRepository = new Map<string, ActivityEvidence[]>();
  evidence.forEach((item) => {
    byRepository.set(item.repository, [
      ...(byRepository.get(item.repository) ?? []),
      item,
    ]);
  });
  return Array.from(byRepository.entries())
    .map(
      ([repository, items]) =>
        `【${repository}】\n${items
          .map(
            (item) =>
              `[${item.id}] ${item.subject} (${item.shortHash})\n` +
              `  ${locale === "zh" ? "文件" : "Files"}: ${
                item.files.join(", ") ||
                (locale === "zh" ? "无文件统计" : "No file statistics")
              }\n` +
              `  +${item.additions} / -${item.deletions}`,
          )
          .join("\n\n")}`,
    )
    .join("\n\n");
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(candidate.trim());
}

function cleanItems(
  value: unknown,
  validIds: Set<string>,
  allowUnsupported = false,
): ReportItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    if (typeof item.summary !== "string" || !item.summary.trim()) return [];
    const evidenceIds = Array.isArray(item.evidenceIds)
      ? item.evidenceIds.filter(
          (id): id is string => typeof id === "string" && validIds.has(id),
        )
      : [];
    if (!allowUnsupported && evidenceIds.length === 0) return [];
    return [{ summary: item.summary.trim(), evidenceIds }];
  });
}

export function validateGeneratedReport(
  raw: string,
  evidence: ActivityEvidence[],
  hasUserContext = false,
): GeneratedReportPayload {
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("INVALID_AI_REPORT");
  }

  const value = parsed as Record<string, unknown>;
  const validIds = new Set(evidence.map((item) => item.id));
  if (hasUserContext) validIds.add("user-context");
  const sections = Array.isArray(value.sections)
    ? value.sections.flatMap((candidate) => {
        if (!candidate || typeof candidate !== "object") return [];
        const section = candidate as Record<string, unknown>;
        if (typeof section.heading !== "string" || !section.heading.trim()) return [];
        const items = cleanItems(section.items, validIds);
        return items.length ? [{ heading: section.heading.trim(), items }] : [];
      })
    : [];

  if (!sections.length) {
    throw new Error("UNVERIFIED_AI_REPORT");
  }

  return {
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title.trim()
        : "本周工作总结",
    sections,
    risks: cleanItems(value.risks, validIds),
    nextSteps: cleanItems(value.nextSteps, validIds, true),
  };
}

function renderItem(item: ReportItem, locale: "zh" | "en"): string {
  const citations = item.evidenceIds.length
    ? locale === "zh"
      ? ` （证据：${item.evidenceIds.join("、")}）`
      : ` (Evidence: ${item.evidenceIds.join(", ")})`
    : "";
  return `- ${item.summary}${citations}`;
}

export function renderReportMarkdown(
  report: GeneratedReportPayload,
  evidence: ActivityEvidence[],
  locale: "zh" | "en" = "zh",
): string {
  const citedIds = new Set<string>();
  const collect = (item: ReportItem) => item.evidenceIds.forEach((id) => citedIds.add(id));
  report.sections.forEach((section) => section.items.forEach(collect));
  report.risks.forEach(collect);

  const sections = report.sections
    .map(
      (section) =>
        `### ${section.heading}\n${section.items
          .map((item) => renderItem(item, locale))
          .join("\n")}`,
    )
    .join("\n\n");
  const risks = report.risks.length
    ? `\n\n### ${locale === "zh" ? "问题与风险" : "Risks"}\n${report.risks
        .map((item) => renderItem(item, locale))
        .join("\n")}`
    : "";
  const nextSteps = report.nextSteps.length
    ? `\n\n### ${locale === "zh" ? "下周计划" : "Next steps"}\n${report.nextSteps
        .map((item) => renderItem(item, locale))
        .join("\n")}`
    : "";
  const indexLines = evidence
    .filter((item) => citedIds.has(item.id))
    .map(
      (item) =>
        `- [${item.id}] ${item.repository}@${item.shortHash} — ${item.subject}`,
    );
  if (citedIds.has("user-context")) {
    indexLines.push(
      locale === "zh"
        ? "- [user-context] 用户在生成前确认并补充的信息"
        : "- [user-context] Information reviewed and added by the user",
    );
  }
  const index = indexLines.join("\n");

  const title =
    locale === "en" && report.title === "本周工作总结"
      ? "Weekly work summary"
      : report.title;
  return `## ${title}\n\n${sections}${risks}${nextSteps}\n\n### ${
    locale === "zh" ? "证据索引" : "Evidence index"
  }\n${index}`;
}
