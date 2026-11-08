import type { Metadata } from "next";
import Link from "next/link";
import { SeverityMark, severityMeta } from "@/components/severity-badge";
import { CATEGORIES, LIMITS, SEVERITIES, type Category } from "@/lib/engine/schema";
import { SYSTEM_PROMPT } from "@/lib/engine/prompts";
import { DEFAULT_MODEL } from "@/lib/engine/analyze";

export const metadata: Metadata = {
  title: "Method",
  description: "How msgdrift reads a page, what it compares it against, how findings are scored, and where it is known to be wrong.",
};

const CATEGORY_NOTES: Record<Category, string> = {
  contradiction: "The page says something the positioning rules out. Different buyer, opposite claim, a promise the document withdrew.",
  omission: "A core message belongs on this page and is not there. Flagged only where the page type calls for it.",
  tone: "The register breaks the guide. Casual where the position is clinical, or breathless where it is plain.",
  dilution: "The message is present but weakened. Hedged, buried under feature lists, or made generic enough to fit any competitor.",
  "audience-mismatch": "The copy speaks to a buyer the positioning does not name, or leaves out the one it does.",
  "claim-drift": "A number, superlative, or proof point that the positioning does not support or states differently.",
  framing: "The facts match but the frame does not. A platform described as a tool, an outcome described as a feature.",
  "stale-messaging": "Language from a previous position that the document has moved past. Often the old category name or tagline.",
};

export default function MethodPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="grid-12 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">Method</p>
          <h1 className="h-display mt-4 max-w-[14ch]">How a page gets read, judged, and scored.</h1>
        </div>
        <p className="col-span-12 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:pt-10">
          msgdrift is a model reading two texts and reporting where they disagree. This page shows the exact instructions it works
          from, how its answers are checked before they render, and the ways it is known to be wrong, so you can read a report
          with the right amount of trust.
        </p>
      </header>

      <Section label="01" title="What it reads">
        <p>
          One plain HTTP fetch per page, with a user agent that names this tool. No scripts run and nothing is clicked. Navigation,
          footers, cookie notices, menus, and forms are stripped by matching whole class and id tokens, so a class like
          <span className="font-mono"> text-navy-800</span> is not mistaken for navigation. The main content region is preferred when
          the page marks one.
        </p>
        <p>
          Up to {LIMITS.maxPages} pages per scan, the first {LIMITS.maxPageChars.toLocaleString()} characters of each. A page with
          fewer than {LIMITS.minPageChars} characters of readable text is reported as not read rather than judged, because at that
          size the model would be grading a cookie notice.
        </p>
        <p>
          The positioning document is the text you paste, up to {LIMITS.maxSourceChars.toLocaleString()} characters. It is sent to
          the model once per page and is not stored. The report keeps only the sentences a finding quotes.
        </p>
      </Section>

      <Section label="02" title="What it is told">
        <p>
          This is the system prompt, unedited. The per-page prompt adds the document, the page text, the page&apos;s URL and
          importance, and asks for at most eight findings, most important first, with the instruction that ordinary adaptation for
          context is not drift.
        </p>
        <pre className="mt-6 whitespace-pre-wrap border-l-2 border-rule pl-5 font-mono text-[13px] leading-relaxed text-ink-2">{SYSTEM_PROMPT}</pre>
      </Section>

      <Section label="03" title="Eight kinds of drift">
        <dl>
          {CATEGORIES.map((c) => (
            <div key={c} className="grid gap-3 border-b border-rule py-5 sm:grid-cols-[11rem_1fr]">
              <dt className="font-mono text-sm text-ink">{c}</dt>
              <dd className="text-[15px] leading-relaxed text-ink-2">{CATEGORY_NOTES[c]}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section label="04" title="Four severities">
        <dl>
          {SEVERITIES.map((s) => (
            <div key={s} className="grid gap-3 border-b border-rule py-5 sm:grid-cols-[11rem_1fr]">
              <dt><SeverityMark severity={s} /></dt>
              <dd className="text-[15px] leading-relaxed text-ink-2">{severityMeta(s).description}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section label="05" title="How the score is built">
        <p>
          Each page gets a 0 to 100 alignment score from the model, where 0 is completely off-message and 100 is fully aligned. The
          overall score is the importance-weighted mean of the pages that were read: high 3x, medium 2x, low 1x. A page that could
          not be read is left out rather than counted as zero, since unknown is not the same as off-message.
        </p>
        <p>
          Bands are fixed. 80 and above is aligned, 60 to 79 is drifting, below 60 is off-message. Read the overall score as a
          ranking of pages against each other and across time, not as a grade with a pass mark.
        </p>
      </Section>

      <Section label="06" title="Checks before anything renders">
        <ul className="list-disc space-y-3 pl-5">
          <li>The model&apos;s answer must match a fixed schema: findings with severity, category, both quotes, and an explanation; a summary; a score. Anything else is rejected.</li>
          <li>If the answer is cut off by the output limit, the page is analyzed again with more room. If it is cut off twice, the page is marked not read.</li>
          <li>Categories outside the eight are mapped to the nearest one. Scores outside 0 to 100 are clamped.</li>
          <li>Every page URL is normalized and checked against private and internal address ranges before it is fetched, and again after redirects.</li>
        </ul>
      </Section>

      <Section label="07" title="Where it is wrong">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong className="font-medium text-ink">Pages that render in JavaScript.</strong> Many marketing sites ship an empty shell and
            draw the copy client-side. Those pages come back as not read. Pricing pages are the most common case.
          </li>
          <li>
            <strong className="font-medium text-ink">Intentional segment pages.</strong> A page written for a second audience on purpose
            will be flagged as audience mismatch. The finding is correct about the text and wrong about the intent. Lower the
            page&apos;s importance or leave it out.
          </li>
          <li>
            <strong className="font-medium text-ink">Run to run variance.</strong> The model is sampled at low temperature, not zero. In
            two runs on the same six HubSpot pages on the same day, individual page scores moved by as much as 12 points while the
            findings stayed substantially the same. Compare findings, not decimals.
          </li>
          <li>
            <strong className="font-medium text-ink">Thin or boilerplate pages.</strong> A customers index or a short about page gives
            the model little to judge. Expect a high score with few findings, which says more about the page than the message.
          </li>
          <li>
            <strong className="font-medium text-ink">Public positioning is not internal positioning.</strong> The example reports use
            documents assembled from press releases and keynotes. They measure drift from what a company said in public, which is
            a weaker standard than its own messaging guide.
          </li>
        </ul>
      </Section>

      <Section label="08" title="Model and code">
        <p>
          Reads with <span className="font-mono">{DEFAULT_MODEL}</span> through Vercel AI Gateway with zero data retention requested
          on every call. Scan requests are rate limited per visitor and per day against a fixed budget. The web app and the
          command line version are open source under MIT at{" "}
          <a href="https://github.com/wpsands/msgdrift" className="link" target="_blank" rel="noopener noreferrer">github.com/wpsands/msgdrift</a>.
          Privacy details are on the <Link href="/privacy" className="link">privacy page</Link>.
        </p>
      </Section>

      <section className="rule mt-20 grid-12 items-center gap-y-6 pt-10">
        <h2 className="h-section col-span-12 lg:col-span-8">Read the method against a real report.</h2>
        <div className="col-span-12 flex gap-6 lg:col-span-3 lg:col-start-10 lg:justify-end">
          <Link href="/example" className="btn">Example reports</Link>
          <Link href="/scan" className="link self-center">Scan a site</Link>
        </div>
      </section>
    </div>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rule-strong grid-12 mt-16 gap-y-6 pt-6">
      <div className="col-span-12 md:col-span-3">
        <p className="font-mono text-xs text-muted">{label}</p>
        <h2 className="h-sub mt-2">{title}</h2>
      </div>
      <div className="col-span-12 space-y-5 text-[17px] leading-relaxed text-ink-2 md:col-span-8 md:col-start-5">{children}</div>
    </section>
  );
}
