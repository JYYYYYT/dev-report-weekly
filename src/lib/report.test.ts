import { describe, expect, it } from "vitest";
import {
  buildEvidence,
  renderReportMarkdown,
  resolveDateRange,
  validateGeneratedReport,
} from "@/lib/report";
import type { ProjectCommitSummary } from "@/types";

const summary: ProjectCommitSummary = {
  projectId: "repo-1",
  projectPath: "/private/repo",
  alias: "devweek",
  commits: [
    {
      hash: "abcdef1234567890",
      shortHash: "abcdef1",
      subject: "feat: add evidence validation",
      date: "2026-07-13T10:00:00+08:00",
      authorName: "Jane",
      authorEmail: "jane@example.com",
      filesChanged: ["src/lib/report.ts"],
      additions: 42,
      deletions: 3,
    },
    {
      hash: "fedcba0987654321",
      shortHash: "fedcba0",
      subject: "chore: update copy",
      date: "2026-07-12T10:00:00+08:00",
      authorName: "Jane",
      authorEmail: "jane@example.com",
      filesChanged: ["README.md"],
      additions: 5,
      deletions: 1,
    },
  ],
  totalCommits: 2,
  totalAdditions: 47,
  totalDeletions: 4,
  filesChanged: ["src/lib/report.ts", "README.md"],
};

describe("resolveDateRange", () => {
  const monday = new Date(2026, 6, 13, 12);

  it("resolves calendar weeks rather than subtracting seven arbitrary days", () => {
    expect(resolveDateRange({ type: "this-week" }, monday)).toEqual({
      since: "2026-07-13",
      until: "2026-07-13 23:59:59",
    });
    expect(resolveDateRange({ type: "last-week" }, monday)).toEqual({
      since: "2026-07-06",
      until: "2026-07-12 23:59:59",
    });
  });

  it("rejects inverted custom ranges", () => {
    expect(() =>
      resolveDateRange({
        type: "custom",
        start: "2026-07-13",
        end: "2026-07-01",
      }),
    ).toThrow("DATE_RANGE_ORDER");
  });
});

describe("evidence-backed report", () => {
  it("removes commits excluded during review", () => {
    const evidence = buildEvidence([summary], ["fedcba0987654321"]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].id).toBe("repo-1:abcdef1");
  });

  it("drops unsupported AI claims and keeps valid citations", () => {
    const evidence = buildEvidence([summary], []);
    const report = validateGeneratedReport(
      JSON.stringify({
        title: "Weekly report",
        sections: [
          {
            heading: "DevWeek",
            items: [
              {
                summary: "Added evidence validation.",
                evidenceIds: ["repo-1:abcdef1"],
              },
              {
                summary: "Improved revenue by 30%.",
                evidenceIds: ["made-up-id"],
              },
            ],
          },
        ],
        risks: [],
        nextSteps: [],
      }),
      evidence,
    );

    expect(report.sections[0].items).toHaveLength(1);
    const markdown = renderReportMarkdown(report, evidence);
    expect(markdown).toContain("repo-1:abcdef1");
    expect(markdown).not.toContain("revenue");
    expect(markdown).not.toContain("/private/repo");
  });

  it("accepts explicit user context without pretending it is a commit", () => {
    const evidence = buildEvidence([summary], []);
    const report = validateGeneratedReport(
      JSON.stringify({
        title: "Weekly report",
        sections: [
          {
            heading: "Collaboration",
            items: [
              {
                summary: "Completed the architecture review.",
                evidenceIds: ["user-context"],
              },
            ],
          },
        ],
        risks: [],
        nextSteps: [],
      }),
      evidence,
      true,
    );

    expect(renderReportMarkdown(report, evidence)).toContain(
      "[user-context] 用户在生成前确认并补充的信息",
    );
  });
});
