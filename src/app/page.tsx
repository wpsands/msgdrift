import Link from "next/link";
import { ScoreInline } from "@/components/score-ring";
import { SeverityMark, severityMeta } from "@/components/severity-badge";
import { EXAMPLE_REPORT } from "@/lib/example";
import { SEVERITIES } from "@/lib/engine/schema";

export default function Home() {
  const example = EXAMPLE_REPORT;
  const all = example.pages.flatMap((p) => p.findings.map((f) => ({ ...f, page: p.label })));
  const lead = all.find((f) => f.severity === "critical") ?? all[0];
  const pages = [...example.pages].sort((a, b) => a.alignmentScore - b.alignmentScore);

  return (
    <>
      {/* Hero */}
      <section className="guides">
        <div className="page grid-12 gap-y-12 pb-20 pt-16 sm:pt-24 lg:pb-28">
          <div className="col-span-12 lg:col-span-8">
            <p className="label">Semantic messaging drift detection</p>
            <h1 className="h-display mt-6 max-w-[14ch]">
              Find where your website stopped saying <span className="mark">what you meant.</span>
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-14">
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
            <h2 className="h-section col-span-12 lg:col-span-6">Three steps. About ninety seconds.</h2>
          </div>
          <ol className="grid-12 mt-14 gap-y-12">
            <Step n="01" title="Paste what you meant" body="Your positioning document, messaging guide, or the strategy memo everyone agreed on. Markdown or plain text, up to 20,000 characters. It is used for the scan and kept only inside the report." />
            <Step n="02" title="Choose the pages" body="Enter your domain. msgdrift reads the homepage, proposes the pages that carry positioning, such as pricing, product, and about, and lets you weight each one. Up to six per scan." />
            <Step n="03" title="Read the drift" body="Findings arrive as the pages are read. Each one quotes the page and the positioning side by side, with a severity and a plain note on the business impact. Share the link, or download it as markdown." />
          </ol>
        </div>
      </section>

      {/* Example report table */}
      <section className="border-t border-rule">
        <div className="page grid-12 gap-y-10 py-16 lg:py-20">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">Example report</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              A fictional company, scanned for real. The pricing page sells to a buyer the positioning rules out, which is the
              single largest source of drift on the site.
            </p>
            <Link href="/example" className="link mt-5 inline-block text-[15px]">Open the full report</Link>
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
                  <span className="hidden text-sm text-muted sm:inline">{p.findings.length} finding{p.findings.length === 1 ? "" : "s"}</span>
                  <span className="text-right"><ScoreInline score={p.alignmentScore} /></span>
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
            <p className="label">Severity</p>
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
            <p className="label">Why it exists</p>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-5">
            <p className="quote text-xl leading-relaxed">
              I run a fractional GTM practice. The first thing I check on a new client is whether the live site still matches the
              positioning the leadership team agreed on. It rarely does. This is the tool I built to do that check in minutes, and
              it is open source so you can run it on your own.
            </p>
            <p className="mt-5 text-[15px] text-muted">
              Page Sands, <a href="https://sandsdx.com" className="link" target="_blank" rel="noopener noreferrer">SandsDX</a>
            </p>
          </div>
          <dl className="col-span-12 lg:col-span-3 lg:col-start-10 text-[15px]">
            <dt className="label">Reading</dt>
            <dd className="mt-2 text-ink-2">Claude Sonnet, structured output checked against a schema before it renders.</dd>
            <dt className="label mt-5">Crawling</dt>
            <dd className="mt-2 text-ink-2">One plain fetch per page. Navigation and chrome stripped. No scripts run.</dd>
            <dt className="label mt-5">Scoring</dt>
            <dd className="mt-2 text-ink-2">Per page, 0 to 100. Weighted by importance: high 3x, medium 2x, low 1x.</dd>
            <dt className="label mt-5">Code</dt>
            <dd className="mt-2"><a href="https://github.com/wpsands/msgdrift" className="link" target="_blank" rel="noopener noreferrer">github.com/wpsands/msgdrift</a></dd>
          </dl>
        </div>
      </section>

      {/* Close */}
      <section className="border-t border-ink">
        <div className="page grid-12 items-center gap-y-6 py-16">
          <h2 className="h-section col-span-12 lg:col-span-8">Check one site. It takes less time than this page did.</h2>
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
