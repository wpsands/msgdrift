import { ExternalLink } from "lucide-react";
import { SEVERITIES, type DriftFinding, type DriftReport, type PageAnalysis, type Severity } from "@/lib/engine/schema";
import { ScoreRing, bandColor, bandLabel } from "./score-ring";
import { SeverityBadge, SeverityCount } from "./severity-badge";
import { ShareBar } from "./share-bar";

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };

export function ReportView({ report, shareUrl, example = false }: { report: DriftReport; shareUrl: string; example?: boolean }) {
  const scanned = new Date(report.createdAt);
  const total = SEVERITIES.reduce((n, s) => n + report.counts[s], 0);
  const sortedPages = [...report.pages].sort((a, b) => a.alignmentScore - b.alignmentScore);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {example && (
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-muted">
          Example report. The company is fictional; the analysis is a real msgdrift run on the fictional copy.
        </p>
      )}

      <header className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
        <ScoreRing score={report.overallScore} />
        <div className="space-y-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Drift report</p>
            <h1 className="font-display mt-1 text-4xl text-ink sm:text-5xl">{report.site}</h1>
            <p className="mt-2 text-sm text-muted">
              {report.pages.length} page{report.pages.length === 1 ? "" : "s"} scanned against {report.sourceLabel} on{" "}
              <time dateTime={report.createdAt}>{scanned.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</time>
              {" · "}
              {total} finding{total === 1 ? "" : "s"}
              {" · "}
              {Math.round(report.durationMs / 1000)}s
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SEVERITIES.map((s) => (
              <SeverityCount key={s} severity={s} count={report.counts[s]} />
            ))}
          </div>
          <ShareBar reportId={report.id} shareUrl={shareUrl} example={example} />
        </div>
      </header>

      <section className="card mt-10 p-6 sm:p-8">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted">Executive summary</h2>
        <p className="mt-3 text-lg leading-relaxed text-ink">{report.executiveSummary}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted">Pages, weakest first</h2>
        <ol className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
          {sortedPages.map((p) => (
            <li key={p.url} className="flex items-center gap-4 px-4 py-3 sm:px-5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: bandColor(p.alignmentScore) }} aria-hidden="true" />
              <a href={`#page-${slug(p.url)}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline">
                {p.label || p.url}
              </a>
              <span className="hidden font-mono text-xs text-muted sm:inline">{p.importance}</span>
              <span className="text-xs text-muted">{p.findings.length} finding{p.findings.length === 1 ? "" : "s"}</span>
              <span className="w-10 text-right font-mono text-sm tabular-nums text-ink">{Math.round(p.alignmentScore)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 space-y-10">
        {sortedPages.map((p) => (
          <PageSection key={p.url} page={p} />
        ))}
      </div>

      <footer className="mt-14 border-t border-line pt-6 text-xs text-muted">
        Model: <span className="font-mono">{report.model}</span>. Importance weights: high 3x, medium 2x, low 1x. Scores are the
        model&apos;s judgment of semantic alignment and are best read as a ranking across pages, not an absolute grade.
      </footer>
    </article>
  );
}

function PageSection({ page }: { page: PageAnalysis }) {
  const findings = [...page.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return (
    <section id={`page-${slug(page.url)}`} className="scroll-mt-20">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-3xl text-ink">{page.label || page.url}</h2>
          <a href={page.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-muted hover:text-ink">
            {page.url}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          </a>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">{page.importance} importance</span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: bandColor(page.alignmentScore) }} aria-hidden="true" />
            <span className="font-mono text-lg tabular-nums text-ink">{Math.round(page.alignmentScore)}</span>
            <span className="text-muted">{bandLabel(page.alignmentScore)}</span>
          </span>
        </div>
      </header>
      <p className="mt-3 max-w-3xl text-ink-2">{page.summary}</p>
      {page.error && !page.findings.length && (
        <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-ink-2">
          This page could not be analyzed: {page.error}
        </p>
      )}
      {findings.length > 0 && (
        <ol className="mt-5 grid gap-4">
          {findings.map((f, i) => (
            <FindingCard key={i} finding={f} />
          ))}
        </ol>
      )}
      {findings.length === 0 && !page.error && <p className="mt-4 text-sm text-good">No drift found on this page.</p>}
    </section>
  );
}

function FindingCard({ finding }: { finding: DriftFinding }) {
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <span className="font-mono text-xs text-muted">{finding.category}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">On the page</p>
          <blockquote className="excerpt mt-1.5 text-sm">{finding.pageExcerpt}</blockquote>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">In the positioning</p>
          <blockquote className="excerpt mt-1.5 text-sm">{finding.sourceExcerpt}</blockquote>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">{finding.explanation}</p>
    </li>
  );
}

function slug(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
