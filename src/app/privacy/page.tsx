import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What msgdrift does with the document you paste, the pages it reads, and the report it produces.",
};

const UPDATED = "November 6, 2026";

export default function PrivacyPage() {
  return (
    <article className="page py-12 sm:py-16">
      <header className="grid-12 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">Privacy</p>
          <h1 className="h-display mt-4 max-w-[14ch]">What happens to what you paste.</h1>
        </div>
        <p className="col-span-12 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:pt-10">
          Short version: your document is read once and not saved. The report keeps only the sentences it quotes. You can
          delete the report. Last updated {UPDATED}.
        </p>
      </header>

      <Section title="Your positioning document">
        <p>
          The text you paste or upload is sent to the model once, with the page text, to produce the analysis. It is held in
          memory for the length of the scan and is not written to storage. The report records the document&apos;s file name
          and its character count, and each finding quotes the sentence from your document that the page drifted from. Nothing
          else from the document is kept.
        </p>
        <p>
          While you are filling in the form, an unsent draft is kept in your own browser&apos;s local storage so a refresh does
          not lose it. It is removed when the scan completes. It never leaves your browser.
        </p>
      </Section>

      <Section title="The pages msgdrift reads">
        <p>
          Each page you list is fetched once with a plain HTTP request from our server, identified as{" "}
          <span className="font-mono text-[15px]">msgdrift/1.0</span>. Scripts are not run, nothing is logged in, and only public
          hosts are fetched. The page text is used for the scan and discarded. Findings quote the sentence from the page that
          drifted.
        </p>
      </Section>

      <Section title="The report">
        <p>
          The report is stored so its link keeps working. It contains the site name, the page URLs, the scores, the summary,
          and the findings with their quoted sentences. The link is a random identifier that is not listed anywhere and is
          marked not to be indexed. Anyone who has the link can read the report, so share it the way you would share a
          document.
        </p>
        <p>
          The browser that ran the scan receives a delete token. From that browser, or from the delete link it can copy, the
          report can be removed at any time. Deletion is immediate and permanent. Only a hash of the token is stored with the
          report, so we cannot recover a lost delete link, and we cannot delete a report on your behalf without it.
        </p>
      </Section>

      <Section title="The model">
        <p>
          Analysis runs on Anthropic&apos;s Claude models through Vercel AI Gateway. The gateway does not retain prompt or
          response content after a request completes; it keeps request metadata such as model, token counts, and duration for
          up to 30 days. Every request from msgdrift asks the gateway for zero data retention on the provider path, which
          routes only to endpoints that do not store prompts or responses. Vercel does not train on these requests.
        </p>
      </Section>

      <Section title="Rate limits and addresses">
        <p>
          Scans are limited per visitor so the shared model budget lasts. To count them, your IP address is combined with a
          secret and hashed, and the hash is kept for at most 24 hours. The address itself is not stored. Beyond the
          hosting platform&apos;s standard request logs, which we do not inspect, no other information about you is collected.
          There are no analytics scripts, no cookies, and no accounts.
        </p>
      </Section>

      <Section title="Running it yourself">
        <p>
          If you would rather nothing leave your machine except the model call, the{" "}
          <a href="https://github.com/wpsands/msgdrift/tree/main/cli" className="link" target="_blank" rel="noopener noreferrer">command line version</a> runs the same analysis with your own Anthropic key and writes the report to your disk.
          The web app&apos;s source is public at{" "}
          <a href="https://github.com/wpsands/msgdrift" className="link" target="_blank" rel="noopener noreferrer">github.com/wpsands/msgdrift</a>, so every claim on this page can be checked against the code.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          msgdrift is made by Page Sands. Write to{" "}
          <a href="mailto:page@sandsdx.com" className="link">page@sandsdx.com</a>. If this page changes, the date at the top changes
          with it.
        </p>
        <p className="mt-6">
          <Link href="/scan" className="link">Scan a site</Link>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rule mt-14 grid-12 gap-y-4 pt-6">
      <h2 className="h-sub col-span-12 lg:col-span-3">{title}</h2>
      <div className="col-span-12 space-y-4 text-[17px] leading-relaxed text-ink-2 lg:col-span-7 lg:col-start-5">{children}</div>
    </section>
  );
}
