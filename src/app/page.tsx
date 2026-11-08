import Link from "next/link";
import { ScoreInline } from "@/components/score-ring";
import { SeverityMark, severityMeta } from "@/components/severity-badge";
import { EXAMPLES } from "@/lib/example";
import { SEVERITIES } from "@/lib/engine/schema";

export default function Home() {
  const featured = EXAMPLES[0];
  const example = featured.report;
  const all = example.pages.flatMap((p) => p.findings.map((f) => ({ ...f, page: p.label })));
  const lead = all.find((f) => f.severity === "critical") ?? all.find((f) => f.severity === "major") ?? all[0];
  const pages = [...example.pages].sort((a, b) => (a.error ? 101 : a.alignmentScore) - (b.error ? 101 : b.alignmentScore));

  return (
    <>
      {/* Hero */}
      <section className="guides">
        <div className="page grid-12 gap-y-12 pb-20 pt-16 sm:pt-24 lg:pb-28">
          <div className="col-span-12 lg:col-span-8">
            <p className="label on-paper w-fit">Positioning check for live websites</p>
            <h1 className="h-display on-paper mt-6 max-w-[14ch]">
              Find the pages still selling <span className="mark">the old story.</span>
            </h1>
          </div>
          <div className="on-paper col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-14">
            <p className="text-[17px] leading-relaxed text-ink-2">
              Paste the document that defines your positioning. msgdrift reads your live pages and shows you, sentence by sentence,
              where the copy contradicts it, dilutes it, or leaves it out. You get a report you can send to whoever owns the page.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/scan" className="btn">Scan a site</Link>
              <Link href="/example" className="link text-[15px]">Read an example report</Link>
            </div>
            <p className="mt-5 text-sm text-muted">Free. No login. Every report gets a permanent link.</p>
          </div>
        </div>
      </section>

      {/* Markup demo */}
      <section className="border-t border-ink">
        <div className="page grid-12 gap-y-10 py-16 lg:py-20">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">What a finding looks like</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              Every finding quotes both sides. The page&apos;s sentence, the sentence in the positioning it drifts from, and a note on
              why it matters. You can disagree with it, line by line.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-8 lg:col-start-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <SeverityMark severity={lead.severity} />
              <span className="font-mono text-xs text-muted">{lead.category}</span>
              <span className="font-mono text-xs text-muted">{example.site} / {lead.page.toLowerCase()}</span>
            </div>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div>
                <p className="label">On the page</p>
                <p className="quote mt-3 text-xl"><span className="mark">{lead.pageExcerpt}</span></p>
              </div>
              <div>
                <p className="label">In the positioning</p>
                <p className="quote mt-3 text-xl">{lead.sourceExcerpt}</p>
              </div>
            </div>
            <p className="mt-8 border-l-2 border-blue pl-4 text-[15px] leading-relaxed text-ink-2">{lead.explanation}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-rule">
        <div className="page py-16 lg:py-20">
          <div className="grid-12 gap-y-6">
            <h2 className="h-section col-span-12 lg:col-span-6">How a scan works</h2>
            <p className="col-span-12 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:pt-2">Three steps. A six-page scan finishes in about two minutes.</p>
          </div>
          <ol className="grid-12 mt-14 gap-y-12">
            <Step n="01" title="Paste your positioning document" body="Your positioning document, messaging guide, or the strategy memo everyone agreed on. Markdown or plain text, up to 20,000 characters. It is used for the scan and kept only inside the report." />
            <Step n="02" title="Choose the pages" body="Enter your domain. msgdrift reads the homepage, proposes the pages that carry positioning, such as pricing, product, and about, and lets you weight each one. Up to six per scan." />
            <Step n="03" title="Read the report" body="Findings arrive as the pages are read. Each one quotes the page and the positioning side by side, with a severity and a plain note on the business impact. Share the link, or download it as markdown." />
          </ol>
        </div>
      </section>

      {/* Example report table */}
      <section className="border-t border-rule">
        <div className="page grid-12 gap-y-10 py-16 lg:py-20">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">Example report: {featured.company}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{featured.blurb}</p>
            <p className="mt-5 flex flex-col gap-2 text-[15px]">
              <Link href={`/example/${featured.slug}`} className="link">Open the full report</Link>
              <Link href="/example" className="link">All example reports</Link>
            </p>
          </div>
          <div className="col-span-12 lg:col-span-8 lg:col-start-5">
            <div className="flex items-baseline justify-between border-b border-ink pb-3">
              <span className="text-xl font-medium">{example.site}</span>
              <ScoreInline score={example.overallScore} />
            </div>
            <ol>
              {pages.map((p, i) => (
                <li key={p.url} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 border-b border-rule py-4 sm:grid-cols-[2rem_1fr_8rem_8rem]">
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium">{p.label}</span>
                  <span className="hidden text-sm text-muted sm:inline">{p.error ? "not read" : `${p.findings.length} finding${p.findings.length === 1 ? "" : "s"}`}</span>
                  <span className="text-right">{p.error ? <span className="text-sm text-muted">Not read</span> : <ScoreInline score={p.alignmentScore} />}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Severities */}
      <section className="border-t border-rule">
        <div className="page grid-12 gap-y-10 py-16 lg:py-20">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">Severity levels</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              The model is told what counts as drift and what counts as ordinary adaptation. Pages adapt the message for context.
              Drift is when the adaptation changes the meaning, weakens the position, or targets the wrong buyer.
            </p>
          </div>
          <dl className="col-span-12 lg:col-span-8 lg:col-start-5">
            {SEVERITIES.map((s) => (
              <div key={s} className="grid gap-3 border-b border-rule py-5 sm:grid-cols-[9rem_1fr]">
                <dt><SeverityMark severity={s} /></dt>
                <dd className="text-[15px] leading-relaxed text-ink-2">{severityMeta(s).description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Colophon */}
      <section className="border-t border-rule">
        <div className="page grid-12 gap-y-10 py-16 lg:py-20">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">Why I built it</p>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-5">
            <p className="quote text-xl leading-relaxed">
              I run a fractional GTM practice. The first thing I check on a new client is whether the live site still matches the
              positioning the leadership team agreed on. It rarely does. This is the tool I built to do that check in minutes, and
              it is open source so you can run it on your own.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
              If you want someone to run this check with you and fix what it finds, that is the work{" "}
              <a href="https://sandsdx.com" className="link" target="_blank" rel="noopener noreferrer">SandsDX</a> does.
            </p>
            <p className="mt-5 text-[15px] text-muted">Page Sands, SandsDX</p>
          </div>
          <dl className="col-span-12 lg:col-span-3 lg:col-start-10 text-[15px]">
            <dt className="label">Model</dt>
            <dd className="mt-2 text-ink-2">
              Claude Sonnet, structured output checked against a schema before it renders.{" "}
              <Link href="/method" className="link">Full method</Link>.
            </dd>
            <dt className="label mt-5">Page fetching</dt>
            <dd className="mt-2 text-ink-2">One plain fetch per page. Navigation and chrome stripped. No scripts run.</dd>
            <dt className="label mt-5">Scoring</dt>
            <dd className="mt-2 text-ink-2">Per page, 0 to 100. Weighted by importance: high 3x, medium 2x, low 1x.</dd>
            <dt className="label mt-5">Source code</dt>
            <dd className="mt-2"><a href="https://github.com/wpsands/msgdrift" className="link" target="_blank" rel="noopener noreferrer">github.com/wpsands/msgdrift</a></dd>
          </dl>
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-ink">
        <div className="page grid-12 items-center gap-y-6 py-16">
          <h2 className="h-section col-span-12 lg:col-span-8">Scan your own site. A six-page report takes about two minutes.</h2>
          <div className="col-span-12 lg:col-span-3 lg:col-start-10 lg:text-right">
            <Link href="/scan" className="btn">Scan a site</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="col-span-12 border-t border-rule pt-5 md:col-span-4">
      <span className="font-mono text-xs text-muted">{n}</span>
      <h3 className="h-sub mt-4">{title}</h3>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{body}</p>
    </li>
  );
}
