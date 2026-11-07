import Link from "next/link";
import { SEVERITIES, type DriftFinding, type DriftReport, type PageAnalysis, type Severity } from "@/lib/engine/schema";
import { ScoreInline, ScoreRuler } from "./score-ring";
import { SeverityCount, SeverityMark } from "./severity-badge";
import { OwnerActions } from "./owner-actions";
import { ShareBar } from "./share-bar";

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };

export function ReportView({ report, shareUrl, example = false }: { report: DriftReport; shareUrl: string; example?: boolean }) {
  const scanned = new Date(report.createdAt);
  const total = SEVERITIES.reduce((n, s) => n + report.counts[s], 0);
  const sortedPages = [...report.pages].sort((a, b) => a.alignmentScore - b.alignmentScore);

  return (
    <article className="page py-12 sm:py-16">
      <header className="grid-12 gap-y-10">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">
            Drift report
            {example && <span className="ml-3 normal-case tracking-normal text-blue">Example. Fictional company, real analysis.</span>}
          </p>
          <h1 className="h-display mt-4">{report.site}</h1>
          <p className="mt-5 text-[15px] text-ink-2">
            {report.pages.length} page{report.pages.length === 1 ? "" : "s"} read against <span className="font-mono">{report.sourceLabel}</span>,{" "}
            <time dateTime={report.createdAt}>{scanned.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</time>.{" "}
            {total} finding{total === 1 ? "" : "s"} in {Math.round(report.durationMs / 1000)} seconds.
          </p>
          <div className="mt-8">
            <ShareBar reportId={report.id} shareUrl={shareUrl} example={example} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <ScoreRuler score={report.overallScore} />
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4">
            {SEVERITIES.map((s) => (
              <SeverityCount key={s} severity={s} count={report.counts[s]} />
            ))}
          </div>
        </div>
      </header>

      <section className="rule-strong mt-16 pt-8 grid-12 gap-y-6">
        <h2 className="label col-span-12 md:col-span-3">Summary</h2>
        <p className="quote col-span-12 text-xl leading-relaxed md:col-span-8">{report.executiveSummary}</p>
      </section>

      <section className="rule mt-14 pt-8 grid-12 gap-y-6">
        <h2 className="label col-span-12 md:col-span-3">Pages, weakest first</h2>
        <ol className="col-span-12 md:col-span-9">
          {sortedPages.map((p, i) => (
            <li key={p.url} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 border-b border-rule py-3 last:border-b-0 sm:grid-cols-[2rem_1fr_6rem_8rem_8rem]">
              <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
              <a href={`#page-${slug(p.url)}`} className="min-w-0 truncate font-medium hover:text-blue">
                {p.label || p.url}
              </a>
              <span className="hidden font-mono text-xs text-muted sm:inline">{p.importance}</span>
              <span className="hidden text-sm text-muted sm:inline">
                {p.findings.length} finding{p.findings.length === 1 ? "" : "s"}
              </span>
              <span className="text-right">
                <ScoreInline score={p.alignmentScore} />
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-20 space-y-20">
        {sortedPages.map((p, i) => (
          <PageSection key={p.url} page={p} index={i + 1} />
        ))}
      </div>

      <footer className="rule mt-20 pt-6 text-sm text-muted">
        Read with <span className="font-mono">{report.model}</span>. Overall score weights pages by importance: high 3x, medium 2x, low 1x. Scores are a
        model&apos;s judgment of alignment. Read them as a ranking across pages rather than a grade. This report keeps only the
        sentences it quotes; the full document was not saved. <Link href="/privacy" className="link">Privacy</Link>.
      </footer>
      {!example && <OwnerActions reportId={report.id} />}
    </article>
  );
}

function PageSection({ page, index }: { page: PageAnalysis; index: number }) {
  const findings = [...page.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return (
    <section id={`page-${slug(page.url)}`} className="scroll-mt-10">
      <div className="rule-strong grid-12 gap-y-6 pt-6">
        <div className="col-span-12 md:col-span-3">
          <p className="font-mono text-xs text-muted">{String(index).padStart(2, "0")}</p>
          <p className="label mt-2">{page.importance} importance</p>
        </div>
        <div className="col-span-12 md:col-span-6">
          <h2 className="h-section">{page.label || page.url}</h2>
          <a href={page.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block max-w-full truncate font-mono text-xs text-muted hover:text-blue">
            {page.url}
          </a>
          <p className="mt-6 text-[17px] leading-relaxed text-ink-2">{page.summary}</p>
          {page.error && !page.findings.length && (
            <p className="mt-4 border-l-2 border-blue pl-4 text-sm text-ink-2">This page could not be read: {page.error}</p>
          )}
        </div>
        <div className="col-span-12 md:col-span-3">
          <ScoreRuler score={page.alignmentScore} compact />
        </div>
      </div>

      {findings.length > 0 ? (
        <ol className="mt-10">
          {findings.map((f, i) => (
            <FindingRow key={i} finding={f} n={i + 1} />
          ))}
        </ol>
      ) : (
        !page.error && <p className="mt-8 text-sm text-ink-2">No drift found on this page.</p>
      )}
    </section>
  );
}

function FindingRow({ finding, n }: { finding: DriftFinding; n: number }) {
  return (
    <li className="rule grid-12 gap-y-5 py-8">
      <div className="col-span-12 flex items-center gap-4 md:col-span-3 md:flex-col md:items-start md:gap-3">
        <span className="font-mono text-xs text-muted">{String(n).padStart(2, "0")}</span>
        <SeverityMark severity={finding.severity} />
        <span className="font-mono text-xs text-muted">{finding.category}</span>
      </div>
      <div className="col-span-12 grid gap-8 md:col-span-9 md:grid-cols-2">
        <div>
          <p className="label">On the page</p>
          <p className="quote mt-3">
            <span className="mark">{finding.pageExcerpt}</span>
          </p>
        </div>
        <div>
          <p className="label">In the positioning</p>
          <p className="quote mt-3">{finding.sourceExcerpt}</p>
        </div>
        <p className="border-l-2 border-blue pl-4 text-[15px] leading-relaxed text-ink-2 md:col-span-2">{finding.explanation}</p>
      </div>
    </li>
  );
}

function slug(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
