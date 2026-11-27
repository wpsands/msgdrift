import { IMPORTANCE_WEIGHT, type DriftFinding, type PageAnalysis, type SeverityCounts } from "./schema";

type Scorable = Pick<PageAnalysis, "alignmentScore" | "importance"> & Partial<Pick<PageAnalysis, "error" | "charsAnalyzed">>;

/** A page counts toward the overall score only if it was actually read and analyzed. */
export function wasRead(page: Partial<Pick<PageAnalysis, "error" | "charsAnalyzed">>): boolean {
  return !page.error && (page.charsAnalyzed === undefined || page.charsAnalyzed > 0);
}

/**
 * Importance-weighted mean of page scores. Pages that could not be read are left
 * out rather than counted as 0: an unreadable page is unknown, not off-message.
 * Same weights as DriftReport.compute_overall_score in the CLI.
 */
export function computeOverallScore(pages: Scorable[]): number {
  const read = pages.filter(wasRead);
  if (read.length === 0) return 0;
  let totalWeight = 0;
  let weighted = 0;
  for (const page of read) {
    const w = IMPORTANCE_WEIGHT[page.importance];
    totalWeight += w;
    weighted += page.alignmentScore * w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weighted / totalWeight) * 10) / 10;
}

/**
 * Points a page loses per finding. The page score is 100 minus these, floored at 0.
 * Fitted so the twelve example pages land within a few points of the model's own
 * scores on average, while two pages with the same findings always get the same score.
 */
export const SEVERITY_PENALTY: Record<DriftFinding["severity"], number> = {
  critical: 20,
  major: 8,
  minor: 3,
  info: 1,
};

/** Page score from its findings. Deterministic: same findings, same score. */
export function scoreFromFindings(findings: Pick<DriftFinding, "severity">[]): number {
  const lost = findings.reduce((sum, f) => sum + SEVERITY_PENALTY[f.severity], 0);
  return Math.max(0, 100 - lost);
}

export function computeCounts(pages: Pick<PageAnalysis, "findings">[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const page of pages) {
    for (const f of page.findings) counts[f.severity] += 1;
  }
  return counts;
}

export function clampScore(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type ScoreBand = "aligned" | "drifting" | "off-message";

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "aligned";
  if (score >= 60) return "drifting";
  return "off-message";
}
