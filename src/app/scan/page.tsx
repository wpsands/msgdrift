import type { Metadata } from "next";
import Link from "next/link";
import { ScanForm } from "@/components/scan-form";
import { LIMITS } from "@/lib/engine/schema";

export const metadata: Metadata = {
  title: "Scan a site",
  description: "Paste your positioning document, choose the pages that matter, and read a drift report in about ninety seconds.",
};

export default function ScanPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="grid-12 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">New scan</p>
          <h1 className="h-display mt-4 max-w-[14ch]">Check a site against what you meant to say.</h1>
        </div>
        <p className="col-span-12 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:pt-10">
          Three steps. Paste the document that defines your positioning, choose up to six pages, run the scan. Most finish in
          under two minutes and get a permanent link.
        </p>
      </header>
      <aside className="grid-12 mt-10 gap-y-3 border-l-2 border-blue pl-5">
        <p className="label col-span-12 md:col-span-3">What it cannot read</p>
        <p className="col-span-12 text-[15px] leading-relaxed text-ink-2 md:col-span-8 md:col-start-5">
          msgdrift fetches each page once and reads the HTML as served. Pages that draw their copy in JavaScript, PDFs, pages behind a
          login, and pages with fewer than {LIMITS.minPageChars} characters of readable text come back as not read and are left out of
          the score. Text beyond {LIMITS.maxPageChars.toLocaleString()} characters on a page is not read. Pricing pages are the most common
          casualty. Details on the <Link href="/method" className="link">method page</Link>.
        </p>
      </aside>
      <ScanForm />
    </div>
  );
}
