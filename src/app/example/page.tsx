import type { Metadata } from "next";
import Link from "next/link";
import { ScoreInline } from "@/components/score-ring";
import { SeverityCount } from "@/components/severity-badge";
import { SEVERITIES } from "@/lib/engine/schema";
import { EXAMPLES } from "@/lib/example";

export const metadata: Metadata = {
  title: "Example reports",
  description: "Two public companies scanned against their own public positioning. Real pages, real findings, source documents shown.",
};

export default function ExampleIndexPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="grid-12 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">Example reports</p>
          <h1 className="h-display mt-4 max-w-[14ch]">Two real reports: HubSpot and Databricks.</h1>
        </div>
        <div className="col-span-12 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:pt-10">
          <p>
            Both companies repositioned in public and published the new position. The source document for each scan is assembled
            from those statements, with the sources listed on the report. Nothing here was edited after the scan.
          </p>
          <p className="mt-4">
            A public statement is a weaker standard than an internal messaging guide. These reports show what the tool notices.
            They are not a verdict on either company. The <Link href="/method" className="link">method page</Link> covers where it
            is known to be wrong.
          </p>
        </div>
      </header>

      <ol className="mt-16">
        {EXAMPLES.map((ex, i) => {
          const total = SEVERITIES.reduce((n, s) => n + ex.report.counts[s], 0);
          const read = ex.report.pages.filter((p) => !p.error);
          const lowest = [...read].sort((a, b) => a.alignmentScore - b.alignmentScore)[0];
          return (
            <li key={ex.slug} className="rule-strong grid-12 gap-y-6 py-10">
              <div className="col-span-12 md:col-span-3">
                <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="h-section mt-2">{ex.company}</h2>
                <p className="mt-2 font-mono text-xs text-muted">{ex.report.site}</p>
              </div>
              <div className="col-span-12 md:col-span-5 md:col-start-5">
                <p className="text-[17px] leading-relaxed text-ink-2">{ex.blurb}</p>
                <p className="mt-4 text-sm text-muted">
                  {read.length} of {ex.report.pages.length} pages read. {total} findings.
                  {lowest ? ` Lowest page: ${lowest.label}, ${Math.round(lowest.alignmentScore)}.` : ""}
                </p>
                <Link href={`/example/${ex.slug}`} className="btn btn-sm mt-6">Open the report</Link>
              </div>
              <div className="col-span-12 md:col-span-3 md:col-start-10">
                <p className="label">Overall</p>
                <p className="mt-2 text-3xl"><ScoreInline score={ex.report.overallScore} /></p>
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
                  {SEVERITIES.map((s) => (
                    <SeverityCount key={s} severity={s} count={ex.report.counts[s]} />
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
