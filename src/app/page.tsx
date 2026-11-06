import { ArrowRight, FileSearch, GitBranch, Share2 } from "lucide-react";
import Link from "next/link";
import { ScoreRing } from "@/components/score-ring";
import { SeverityBadge } from "@/components/severity-badge";
import { EXAMPLE_REPORT } from "@/lib/example";
import { SEVERITIES, type SeverityCounts } from "@/lib/engine/schema";

export default function Home() {
  const example = EXAMPLE_REPORT;
  const topFindings = example.pages
    .flatMap((p) => p.findings.map((f) => ({ ...f, page: p.label })))
    .filter((f) => f.severity === "critical" || f.severity === "major")
    .slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <DriftBackdrop />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Semantic messaging drift detection</p>
            <h1 className="font-display mt-4 text-5xl leading-[1.02] text-ink sm:text-6xl lg:text-7xl">
              Find where your website stopped saying what you <em className="text-accent">meant</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Paste your positioning document. msgdrift reads your live pages and shows you, excerpt by excerpt, where the copy
              contradicts it, dilutes it, or leaves it out. Claude does the reading. You get a report you can send to whoever owns
              the page.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/scan" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-accent-ink">
                Scan your site <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/example" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm text-ink hover:border-line-strong">
                Read an example report
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">Free. No login. Reports get a permanent share link.</p>
          </div>

          <ExampleCard
            score={example.overallScore}
            site={example.site}
            counts={example.counts}
            findings={topFindings}
          />
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">The problem</p>
            <h2 className="font-display mt-3 text-3xl text-ink sm:text-4xl">Positioning changes in a doc. Websites change one page at a time.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 lg:col-span-2">
            <Fact title="Dozens of hands" body="Product launches, a redesign, three A/B tests, a new hire writing the pricing page. Each edit is reasonable. Together they move the message." />
            <Fact title="Word diffs miss it" body="A page can use none of your vocabulary and be on-message. It can quote your tagline and undercut it in the next sentence. Only reading catches that." />
            <Fact title="Nobody reads the whole site" body="By the time a prospect or a board member notices the pricing page sells to a different buyer than the homepage, it has been live for months." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">How it works</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl text-ink sm:text-4xl">Three inputs, one report, about ninety seconds.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            <Step n={1} Icon={FileSearch} title="Paste what you meant" body="Your positioning doc, messaging guide, or strategy memo. Markdown or plain text, up to 20,000 characters. It stays inside the report and nowhere else." />
            <Step n={2} Icon={GitBranch} title="Pick the pages" body="Enter your domain. msgdrift reads the homepage, proposes the pages that carry positioning (pricing, product, about), and lets you weight each one." />
            <Step n={3} Icon={Share2} title="Read the drift" body="Each finding pairs the page excerpt with the source excerpt it drifts from, with a severity and a plain explanation of the business impact. Share the link or export markdown." />
          </ol>
        </div>
      </section>

      {/* Severity */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">What it flags</p>
            <h2 className="font-display mt-3 text-3xl text-ink sm:text-4xl">Four severities, each with a definition you can argue with.</h2>
            <p className="mt-4 text-ink-2">
              The model is told what counts as drift and what counts as normal adaptation. Marketing pages adapt the message for
              context. Drift is when the adaptation changes the meaning, weakens the position, or targets the wrong buyer.
            </p>
          </div>
          <ul className="grid gap-3">
            {SEVERITIES.map((s) => (
              <li key={s} className="card flex items-start gap-4 p-4">
                <SeverityBadge severity={s} size="md" />
                <p className="text-sm text-ink-2">{SEVERITY_COPY[s]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Built by */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Why this exists</p>
            <h2 className="font-display mt-3 text-3xl text-ink sm:text-4xl">Built by a GTM operator who kept finding the same gap.</h2>
            <p className="mt-4 text-ink-2">
              I run <a href="https://sandsdx.com" className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">SandsDX</a>, a fractional GTM practice for B2B SaaS. In diagnostic work, the first thing I check is whether the
              live site still matches the positioning the leadership team agreed on. It rarely does. msgdrift is the tool I built
              to do that check in minutes instead of an afternoon, and it is open source so you can run it yourself.
            </p>
            <p className="mt-4 text-sm text-muted">Page Sands, Charleston SC.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-medium text-ink">Under the hood</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-2">
              <li><span className="font-mono text-xs text-muted">model</span><br />Claude Sonnet via Vercel AI Gateway, with structured output validated against a schema before anything renders.</li>
              <li><span className="font-mono text-xs text-muted">crawler</span><br />Fetches each page once, strips navigation and chrome, keeps the copy a reader sees. No JavaScript execution, no login walls.</li>
              <li><span className="font-mono text-xs text-muted">scoring</span><br />Per-page alignment 0 to 100, rolled up with importance weights (high 3x, medium 2x, low 1x). Same math as the CLI.</li>
              <li><span className="font-mono text-xs text-muted">code</span><br /><a href="https://github.com/wpsands/msgdrift" className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">github.com/wpsands/msgdrift</a>, MIT. Next.js web app plus the original Python CLI.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-ink text-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h2 className="font-display text-3xl sm:text-4xl">Check one site. It takes less time than reading this page did.</h2>
          <Link href="/scan" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-ink hover:opacity-90">
            Scan your site <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}

const SEVERITY_COPY = {
  critical: "A direct contradiction of the positioning, or copy aimed at a buyer you say you do not serve.",
  major: "A core value proposition that is missing from a page where it belongs, or present but diluted or misframed.",
  minor: "Tone that breaks the guide, stale phrasing from a previous position, or a secondary message that slipped.",
  info: "Not wrong on its face, but worth a human look. Often unused proof points or vague claims where you have specifics.",
} as const;

function Fact({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

function Step({ n, Icon, title, body }: { n: number; Icon: typeof FileSearch; title: string; body: string }) {
  return (
    <li className="card p-6">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
        <span className="font-mono text-xs text-muted">0{n}</span>
      </div>
      <h3 className="mt-4 text-lg font-medium text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
    </li>
  );
}

function ExampleCard({
  score,
  site,
  counts,
  findings,
}: {
  score: number;
  site: string;
  counts: SeverityCounts;
  findings: { severity: "critical" | "major" | "minor" | "info"; category: string; pageExcerpt: string; page: string }[];
}) {
  return (
    <Link href="/example" className="card group block p-6 transition-shadow hover:shadow-lg" aria-label="Open the example report">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Example report</p>
          <p className="font-display mt-1 text-2xl text-ink">{site}</p>
          <p className="mt-1 text-xs text-muted">Fictional company. Real analysis.</p>
        </div>
        <ScoreRing score={score} size={96} label="overall" />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span>{counts.critical} critical</span>
        <span>{counts.major} major</span>
        <span>{counts.minor} minor</span>
        <span>{counts.info} info</span>
      </div>
      <ul className="mt-5 space-y-3">
        {findings.map((f, i) => (
          <li key={i} className="border-t border-line pt-3">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={f.severity} />
              <span className="font-mono text-xs text-muted">{f.category} · {f.page}</span>
            </div>
            <p className="excerpt mt-2 text-sm">{f.pageExcerpt}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 inline-flex items-center gap-1 text-sm text-accent group-hover:underline">
        Read the full report <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </p>
    </Link>
  );
}

function DriftBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-0 hidden h-full w-full text-ink/[0.08] md:block"
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      fill="none"
    >
      <path d="M-20 420 C 300 420, 500 420, 1220 420" stroke="currentColor" strokeWidth="1.5" />
      <path className="drift-line" d="M-20 420 C 300 420, 600 300, 1220 120" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.5" />
    </svg>
  );
}
