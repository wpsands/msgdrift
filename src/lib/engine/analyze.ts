import { generateText, Output } from "ai";
import { fetchPages, type FetchResult } from "./crawler";
import { buildAnalysisPrompt, buildConsistencyPrompt, buildExecutiveSummaryPrompt, CONSISTENCY_SYSTEM_PROMPT, SYSTEM_PROMPT } from "./prompts";
import {
  LIMITS,
  pickBaseline,
  pageAnalysisOutputSchema,
  type DriftFinding,
  type DriftReport,
  type PageAnalysis,
  type PageAnalysisOutput,
  type PageConfig,
  type ScanEvent,
  type ScanMode,
  type ScanRequest,
} from "./schema";
import { computeCounts, computeOverallScore, scoreFromFindings } from "./scoring";

/**
 * Scan orchestration. Mirrors run_analysis in cli/src/msgdrift/agent.py:
 * fetch pages, analyze each against the source document, write an executive
 * summary, assemble a weighted report. Emits progress events for the UI.
 */

export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

/**
 * Gateway routing for every model call. Zero data retention asks the gateway to
 * route only to provider endpoints that do not retain prompts or responses.
 * Set SCAN_ZDR=0 to disable on a plan where it is unavailable.
 */
export function gatewayOptions() {
  return {
    gateway: {
      zeroDataRetention: process.env.SCAN_ZDR !== "0",
      only: ["anthropic"],
    },
  };
}

export interface RunScanOptions {
  id: string;
  model?: string;
  emit?: (event: ScanEvent) => void;
  signal?: AbortSignal;
  analysisConcurrency?: number;
}

export async function runScan(request: ScanRequest, options: RunScanOptions): Promise<DriftReport> {
  const started = Date.now();
  const model = options.model ?? process.env.SCAN_MODEL ?? DEFAULT_MODEL;
  const emit = options.emit ?? (() => {});
  const pages = request.pages;

  emit({ type: "start", pages: pages.length });

  const fetched = await fetchPages(
    pages.map((p) => p.url),
    {
      concurrency: 3,
      signal: options.signal,
      onStart: (url) => emit({ type: "fetch:start", url }),
      onDone: (r) => emit({ type: "fetch:done", url: r.url, status: r.fetchStatus, chars: r.text.length, title: r.title, error: r.error }),
    },
  );

  const mode = request.mode ?? "positioning";
  let sourceContent: string;
  let sourceLabel: string;
  let sourceChars: number;
  let baseline: DriftReport["baseline"];
  // Indexes of the pages that are analyzed and scored. In a consistency check the baseline is not.
  let targets = pages.map((_, i) => i);

  if (mode === "consistency") {
    const b = pickBaseline(pages);
    const home = fetched[b];
    if (home.error || home.text.trim().length < LIMITS.minPageChars) {
      throw new ScanInputError(
        `The homepage could not be read (${home.error ?? "too little text"}), so there is nothing to check the other pages against. Add a positioning document instead.`,
      );
    }
    const text = home.text.slice(0, LIMITS.maxSourceChars);
    const url = home.finalUrl || pages[b].url;
    sourceContent = `### Homepage: ${url}\n\n${text}`;
    sourceLabel = "the homepage";
    sourceChars = text.length;
    baseline = { url, title: home.title, chars: text.length };
    targets = targets.filter((i) => i !== b);
    emit({ type: "baseline", url: pages[b].url });
  } else {
    sourceLabel = request.sourceLabel || "positioning.md";
    sourceContent = `### ${sourceLabel}\n\n${request.sourceDocument.slice(0, LIMITS.maxSourceChars)}`;
    sourceChars = request.sourceDocument.length;
  }

  const analyses: PageAnalysis[] = new Array(targets.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const slot = cursor++;
      const page = pages[targets[slot]];
      const content = fetched[targets[slot]];
      emit({ type: "analyze:start", url: page.url });
      const analysis = await analyzePage({ page, content, sourceContent, model, mode, signal: options.signal });
      analyses[slot] = analysis;
      emit({ type: "analyze:done", url: page.url, score: analysis.alignmentScore, findings: analysis.findings.length });
    }
  };
  const concurrency = Math.max(1, Math.min(options.analysisConcurrency ?? 3, targets.length));
  await Promise.all(Array.from({ length: concurrency }, worker));

  emit({ type: "summary:start" });
  const executiveSummary = await generateExecutiveSummary(analyses, model, options.signal, mode);

  const site = deriveSite(pages);
  const report: DriftReport = {
    id: options.id,
    version: 1,
    createdAt: new Date().toISOString(),
    site,
    sourceLabel,
    sourceChars,
    model,
    pages: analyses,
    overallScore: computeOverallScore(analyses),
    executiveSummary,
    counts: computeCounts(analyses),
    durationMs: Date.now() - started,
    scoreMethod: "findings",
    ...(mode === "consistency" ? { mode, baseline } : {}),
  };
  return report;
}

/** A problem with what the visitor asked for. Its message is safe to show as is. */
export class ScanInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanInputError";
  }
}

interface AnalyzePageInput {
  page: PageConfig;
  content: FetchResult;
  sourceContent: string;
  model: string;
  mode?: ScanMode;
  signal?: AbortSignal;
}

export async function analyzePage({ page, content, sourceContent, model, mode = "positioning", signal }: AnalyzePageInput): Promise<PageAnalysis> {
  const base = {
    url: page.url,
    label: page.label || content.title || page.url,
    title: content.title,
    importance: page.importance,
    fetchStatus: content.fetchStatus,
    error: content.error,
  };

  const readable = content.text.trim().length;
  if (content.error || readable < LIMITS.minPageChars) {
    const error =
      content.error ??
      `Only ${readable} characters of readable text, below the ${LIMITS.minPageChars} needed to judge a page. It may render in JavaScript.`;
    return { ...base, error, findings: [], summary: `Not read: ${error}`, alignmentScore: 0, charsAnalyzed: 0 };
  }

  const pageText = content.text.slice(0, LIMITS.maxPageChars);
  const buildPrompt = mode === "consistency" ? buildConsistencyPrompt : buildAnalysisPrompt;
  const prompt = buildPrompt({
    sourceContent,
    pageUrl: content.finalUrl || page.url,
    pageImportance: page.importance,
    pageTitle: content.title,
    pageContent: pageText,
  });

  try {
    // A long page can produce eight findings that overrun the first token budget.
    // When the model is cut off, the parsed object is unreliable, so retry once
    // with more room rather than keep a truncated analysis.
    let output: PageAnalysisOutput | undefined;
    for (const maxOutputTokens of [4096, 8192]) {
      const result = await generateText({
        model,
        system: mode === "consistency" ? CONSISTENCY_SYSTEM_PROMPT : SYSTEM_PROMPT,
        prompt,
        output: Output.object({ schema: pageAnalysisOutputSchema }),
        temperature: 0.2,
        maxOutputTokens,
        abortSignal: signal,
        providerOptions: gatewayOptions(),
      });
      if (result.finishReason === "length" || !result.output.summary.trim()) continue;
      output = result.output;
      break;
    }
    if (!output) throw new Error("The model's answer was cut off before it finished, twice.");
    const findings = keepFindings(
      output.findings.slice(0, 12).map((f) => ({
        severity: f.severity,
        category: normalizeCategory(f.category),
        pageExcerpt: f.pageExcerpt.trim(),
        sourceExcerpt: f.sourceExcerpt.trim(),
        explanation: f.explanation.trim(),
      })),
      mode,
    );
    return {
      ...base,
      findings,
      summary: output.summary.trim(),
      alignmentScore: scoreFromFindings(findings),
      charsAnalyzed: pageText.length,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    const message = err instanceof Error ? err.message : "Analysis failed";
    return { ...base, findings: [], summary: `Analysis failed: ${message}`, alignmentScore: 0, error: message, charsAnalyzed: pageText.length };
  }
}

/**
 * A consistency check reports conflicts only. Drop anything the model returned
 * that is an omission or has no homepage quote, since neither is a conflict.
 */
export function keepFindings(findings: DriftFinding[], mode: ScanMode): DriftFinding[] {
  if (mode !== "consistency") return findings;
  return findings.filter((f) => f.category !== "omission" && f.sourceExcerpt.length > 0);
}

export async function generateExecutiveSummary(pages: PageAnalysis[], model: string, signal?: AbortSignal, mode: ScanMode = "positioning"): Promise<string> {
  const pageResults = pages
    .map((p) => {
      const findings = p.findings.length
        ? p.findings.map((f) => `  - [${f.severity}] ${f.category}: ${f.explanation}`).join("\n")
        : "  No drift findings.";
      return `### ${p.label || p.url} (importance: ${p.importance}, score: ${p.alignmentScore})\n${p.summary}\n${findings}`;
    })
    .join("\n\n");

  try {
    const { text } = await generateText({
      model,
      prompt: buildExecutiveSummaryPrompt(pageResults, mode),
      temperature: 0.3,
      maxOutputTokens: 1024,
      abortSignal: signal,
      providerOptions: gatewayOptions(),
    });
    return text.trim();
  } catch (err) {
    if (signal?.aborted) throw err;
    return "Executive summary generation failed.";
  }
}

function normalizeCategory(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z-]/g, "")
    .slice(0, 40) || "drift";
}

function deriveSite(pages: PageConfig[]): string {
  try {
    const first = pages.find((p) => p.importance === "high") ?? pages[0];
    return new URL(first.url).hostname.replace(/^www\./, "");
  } catch {
    return "site";
  }
}
