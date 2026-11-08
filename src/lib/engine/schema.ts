import { z } from "zod";

/**
 * Domain model for a drift scan. Mirrors the Pydantic models in cli/src/msgdrift/models.py
 * so reports produced by the web app and the CLI share one shape.
 */

export const SEVERITIES = ["critical", "major", "minor", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const IMPORTANCES = ["high", "medium", "low"] as const;
export type PageImportance = (typeof IMPORTANCES)[number];

export const IMPORTANCE_WEIGHT: Record<PageImportance, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const CATEGORIES = [
  "contradiction",
  "omission",
  "tone",
  "dilution",
  "audience-mismatch",
  "claim-drift",
  "framing",
  "stale-messaging",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LIMITS = {
  maxPages: 6,
  maxSourceChars: 20_000,
  maxPageChars: 15_000,
  minPageChars: 200,
  minSourceChars: 200,
  fetchTimeoutMs: 20_000,
} as const;

export const pageConfigSchema = z.object({
  url: z.url(),
  importance: z.enum(IMPORTANCES).default("medium"),
  label: z.string().max(120).default(""),
});
export type PageConfig = z.infer<typeof pageConfigSchema>;

export const scanRequestSchema = z.object({
  sourceDocument: z
    .string()
    .min(LIMITS.minSourceChars, `Positioning document needs at least ${LIMITS.minSourceChars} characters.`)
    .max(LIMITS.maxSourceChars, `Positioning document is capped at ${LIMITS.maxSourceChars} characters.`),
  sourceLabel: z.string().max(120).default("positioning.md"),
  pages: z.array(pageConfigSchema).min(1).max(LIMITS.maxPages),
});
export type ScanRequest = z.infer<typeof scanRequestSchema>;

export const driftFindingSchema = z.object({
  severity: z.enum(SEVERITIES),
  category: z.string().describe("Type of drift: contradiction, omission, tone, dilution, audience-mismatch, claim-drift, framing, stale-messaging"),
  pageExcerpt: z.string().describe("The relevant text quoted from the website"),
  sourceExcerpt: z.string().describe("The relevant text quoted from the positioning document"),
  explanation: z.string().describe("Why this is drift and what the business impact is"),
});
export type DriftFinding = z.infer<typeof driftFindingSchema>;

/** What the model returns for one page. */
export const pageAnalysisOutputSchema = z.object({
  findings: z.array(driftFindingSchema),
  summary: z.string().describe("2-3 sentence summary of the page's overall messaging alignment"),
  alignmentScore: z.number().min(0).max(100).describe("0 = completely off-message, 100 = perfectly aligned"),
});
export type PageAnalysisOutput = z.infer<typeof pageAnalysisOutputSchema>;

export interface PageContent {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
  fetchStatus: number;
  error: string | null;
}

export interface PageAnalysis {
  url: string;
  label: string;
  title: string;
  importance: PageImportance;
  findings: DriftFinding[];
  summary: string;
  alignmentScore: number;
  fetchStatus: number;
  error: string | null;
  charsAnalyzed: number;
}

export interface SeverityCounts {
  critical: number;
  major: number;
  minor: number;
  info: number;
}

export interface DriftReport {
  id: string;
  version: 1;
  createdAt: string;
  site: string;
  sourceLabel: string;
  sourceChars: number;
  model: string;
  pages: PageAnalysis[];
  overallScore: number;
  executiveSummary: string;
  counts: SeverityCounts;
  durationMs: number;
  /** SHA-256 of the owner's delete token. Never sent to clients; stripped on export. */
  ownerTokenHash?: string;
}

/** Events streamed to the browser while a scan runs. */
export type ScanEvent =
  | { type: "start"; pages: number }
  | { type: "fetch:start"; url: string }
  | { type: "fetch:done"; url: string; status: number; chars: number; title: string; error: string | null }
  | { type: "analyze:start"; url: string }
  | { type: "analyze:done"; url: string; score: number; findings: number }
  | { type: "summary:start" }
  | { type: "done"; reportId: string; overallScore: number; deleteToken: string }
  | { type: "error"; message: string };
