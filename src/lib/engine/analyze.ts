import { generateText, Output } from "ai";
import { fetchPages, type FetchResult } from "./crawler";
import { buildAnalysisPrompt, buildExecutiveSummaryPrompt, SYSTEM_PROMPT } from "./prompts";
import {
  LIMITS,
  pageAnalysisOutputSchema,
  type DriftReport,
  type PageAnalysis,
  type PageConfig,
  type ScanEvent,
  type ScanRequest,
} from "./schema";
import { clampScore, computeCounts, computeOverallScore } from "./scoring";

/**
 * Scan orchestration. Mirrors run_analysis in cli/src/msgdrift/agent.py:
 * fetch pages, analyze each against the source document, write an executive
 * summary, assemble a weighted report. Emits progress events for the UI.
 */

export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

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

  const sourceContent = `### ${request.sourceLabel || "positioning.md"}\n\n${request.sourceDocument.slice(0, LIMITS.maxSourceChars)}`;

  const analyses: PageAnalysis[] = new Array(pages.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < pages.length) {
      const index = cursor++;
      const page = pages[index];
      const content = fetched[index];
      emit({ type: "analyze:start", url: page.url });
      const analysis = await analyzePage({ page, content, sourceContent, model, signal: options.signal });
      analyses[index] = analysis;
      emit({ type: "analyze:done", url: page.url, score: analysis.alignmentScore, findings: analysis.findings.length });
    }
  };
  const concurrency = Math.max(1, Math.min(options.analysisConcurrency ?? 3, pages.length));
  await Promise.all(Array.from({ length: concurrency }, worker));

  emit({ type: "summary:start" });
  const executiveSummary = await generateExecutiveSummary(analyses, model, options.signal);

  const site = deriveSite(pages);
  const report: DriftReport = {
    id: options.id,
    version: 1,
    createdAt: new Date().toISOString(),
    site,
    sourceLabel: request.sourceLabel || "positioning.md",
    sourceChars: request.sourceDocument.length,
    model,
    pages: analyses,
    overallScore: computeOverallScore(analyses),
    executiveSummary,
    counts: computeCounts(analyses),
    durationMs: Date.now() - started,
  };
  return report;
}

interface AnalyzePageInput {
  page: PageConfig;
  content: FetchResult;
  sourceContent: string;
  model: string;
  signal?: AbortSignal;
}

export async function analyzePage({ page, content, sourceContent, model, signal }: AnalyzePageInput): Promise<PageAnalysis> {
  const base = {
    url: page.url,
    label: page.label || content.title || page.url,
    title: content.title,
    importance: page.importance,
    fetchStatus: content.fetchStatus,
    error: content.error,
  };

  if (content.error || !content.text.trim()) {
    return { ...base, findings: [], summary: `Could not analyze: ${content.error ?? "empty page content"}`, alignmentScore: 0, charsAnalyzed: 0 };
  }

  const pageText = content.text.slice(0, LIMITS.maxPageChars);
  const prompt = buildAnalysisPrompt({
    sourceContent,
    pageUrl: content.finalUrl || page.url,
    pageImportance: page.importance,
    pageTitle: content.title,
    pageContent: pageText,
  });

  try {
    const { output } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({ schema: pageAnalysisOutputSchema }),
      temperature: 0.2,
      maxOutputTokens: 4096,
      abortSignal: signal,
    });
    const findings = output.findings.slice(0, 12).map((f) => ({
      severity: f.severity,
      category: normalizeCategory(f.category),
      pageExcerpt: f.pageExcerpt.trim(),
      sourceExcerpt: f.sourceExcerpt.trim(),
      explanation: f.explanation.trim(),
    }));
    return {
      ...base,
      findings,
      summary: output.summary.trim(),
      alignmentScore: clampScore(output.alignmentScore),
      charsAnalyzed: pageText.length,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    const message = err instanceof Error ? err.message : "Analysis failed";
    return { ...base, findings: [], summary: `Analysis failed: ${message}`, alignmentScore: 0, error: message, charsAnalyzed: pageText.length };
  }
}

export async function generateExecutiveSummary(pages: PageAnalysis[], model: string, signal?: AbortSignal): Promise<string> {
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
      prompt: buildExecutiveSummaryPrompt(pageResults),
      temperature: 0.3,
      maxOutputTokens: 1024,
      abortSignal: signal,
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
