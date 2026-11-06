import { describe, expect, it } from "vitest";
import { reportToMarkdown } from "./markdown";
import type { DriftReport } from "./schema";

const report: DriftReport = {
  id: "abc123def456",
  version: 1,
  createdAt: "2026-11-06T12:00:00.000Z",
  site: "acme.com",
  sourceLabel: "positioning.md",
  sourceChars: 1200,
  model: "anthropic/claude-sonnet-5.5",
  overallScore: 71.5,
  executiveSummary: "Mostly aligned. Pricing undersells the mid-market focus.",
  counts: { critical: 0, major: 1, minor: 0, info: 0 },
  durationMs: 42000,
  pages: [
    {
      url: "https://acme.com/pricing",
      label: "Pricing",
      title: "Pricing | Acme",
      importance: "high",
      alignmentScore: 64,
      summary: "Pricing speaks to SMB.",
      fetchStatus: 200,
      error: null,
      charsAnalyzed: 3000,
      findings: [
        {
          severity: "major",
          category: "audience-mismatch",
          pageExcerpt: "Perfect for small teams getting started",
          sourceExcerpt: "We serve mid-market revenue teams of 50 to 500 reps",
          explanation: "The page targets SMB while the positioning targets mid-market.",
        },
      ],
    },
  ],
};

describe("reportToMarkdown", () => {
  it("renders header, table, and findings", () => {
    const md = reportToMarkdown(report, "https://msgdrift.com/r/abc123def456");
    expect(md).toContain("# msgdrift report: acme.com");
    expect(md).toContain("**72/100**");
    expect(md).toContain("| [Pricing](https://acme.com/pricing) | high | 64 | 1 |");
    expect(md).toContain("#### MAJOR · audience-mismatch");
    expect(md).toContain("Share link: https://msgdrift.com/r/abc123def456");
  });
});
