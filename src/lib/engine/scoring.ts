import { IMPORTANCE_WEIGHT, type PageAnalysis, type SeverityCounts } from "./schema";

/** Importance-weighted mean of page scores. Matches DriftReport.compute_overall_score in the CLI. */
export function computeOverallScore(pages: Pick<PageAnalysis, "alignmentScore" | "importance">[]): number {
  if (pages.length === 0) return 0;
  let totalWeight = 0;
  let weighted = 0;
  for (const page of pages) {
    const w = IMPORTANCE_WEIGHT[page.importance];
    totalWeight += w;
    weighted += page.alignmentScore * w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weighted / totalWeight) * 10) / 10;
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
