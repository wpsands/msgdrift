import type { Metadata } from "next";
import { ScanForm } from "@/components/scan-form";

export const metadata: Metadata = {
  title: "Scan your site",
  description: "Paste your positioning document, pick the pages that matter, and get a semantic drift report in about a minute.",
};

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">New scan</p>
        <h1 className="font-display mt-2 text-4xl text-ink sm:text-5xl">Check your site against what you meant to say.</h1>
        <p className="mt-4 text-ink-2">
          Three steps: paste the document that defines your positioning, pick up to six pages, run the scan. Most scans finish in
          under two minutes. The report gets a permanent link you can share.
        </p>
      </header>
      <ScanForm />
    </div>
  );
}
