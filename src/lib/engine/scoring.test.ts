import { describe, expect, it } from "vitest";
import { clampScore, computeCounts, computeOverallScore, scoreBand } from "./scoring";
import type { DriftFinding } from "./schema";

const finding = (severity: DriftFinding["severity"]): DriftFinding => ({
  severity,
  category: "tone",
  pageExcerpt: "a",
  sourceExcerpt: "b",
  explanation: "c",
});

describe("computeOverallScore", () => {
  it("returns 0 for no pages", () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it("weights high 3x, medium 2x, low 1x like the CLI", () => {
    const score = computeOverallScore([
      { alignmentScore: 90, importance: "high" },
      { alignmentScore: 60, importance: "medium" },
      { alignmentScore: 30, importance: "low" },
    ]);
    // (90*3 + 60*2 + 30*1) / 6 = 420 / 6 = 70
    expect(score).toBe(70);
  });

  it("leaves pages that could not be read out of the roll-up", () => {
    const score = computeOverallScore([
      { alignmentScore: 80, importance: "high" },
      { alignmentScore: 0, importance: "high", error: "Page had no readable text", charsAnalyzed: 0 },
      { alignmentScore: 60, importance: "low" },
    ]);
    // (80*3 + 60*1) / 4 = 75; counting the unread page as 0 would give 42.9
    expect(score).toBe(75);
  });

  it("returns 0 when no page could be read", () => {
    expect(computeOverallScore([{ alignmentScore: 0, importance: "high", error: "timeout", charsAnalyzed: 0 }])).toBe(0);
  });

  it("rounds to one decimal", () => {
    const score = computeOverallScore([
      { alignmentScore: 85, importance: "high" },
      { alignmentScore: 50, importance: "low" },
    ]);
    // (255 + 50) / 4 = 76.25 -> 76.3
    expect(score).toBe(76.3);
  });
});

describe("computeCounts", () => {
  it("tallies severities across pages", () => {
    const counts = computeCounts([
      { findings: [finding("critical"), finding("minor")] },
      { findings: [finding("major"), finding("minor"), finding("info")] },
      { findings: [] },
    ]);
    expect(counts).toEqual({ critical: 1, major: 1, minor: 2, info: 1 });
  });
});

describe("clampScore", () => {
  it("clamps into 0..100 and defaults bad input to 50", () => {
    expect(clampScore(140)).toBe(100);
    expect(clampScore(-3)).toBe(0);
    expect(clampScore(72.6)).toBe(73);
    expect(clampScore("x")).toBe(50);
    expect(clampScore(Number.NaN)).toBe(50);
  });
});

describe("scoreBand", () => {
  it("maps thresholds", () => {
    expect(scoreBand(80)).toBe("aligned");
    expect(scoreBand(79)).toBe("drifting");
    expect(scoreBand(60)).toBe("drifting");
    expect(scoreBand(59)).toBe("off-message");
  });
});
