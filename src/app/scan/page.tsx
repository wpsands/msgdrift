import type { Metadata } from "next";
import Link from "next/link";
import { ScanForm } from "@/components/scan-form";
import { LIMITS } from "@/lib/engine/schema";

export const metadata: Metadata = {
  title: "Scan a site",
  description: "Check your pages against your positioning document or your homepage, and read a drift report in about two minutes.",
};

export default function ScanPage() {
  return (
    <div className="page py-12 sm:py-16">
      <header className="grid-12 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label">New scan</p>
          <h1 className="h-display mt-4 max-w-[14ch]">Scan a website for messaging drift.</h1>
        </div>
        <p className="col-span-12 text-[17px] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:pt-10">
          Three steps. Paste your positioning document, or leave it empty to check your pages against your homepage. Choose up
          to six pages and run the scan. Most finish in under two minutes and get a permanent link.
        </p>
      </header>
      <aside className="grid-12 mt-10 gap-y-3 border-l-2 border-blue pl-5">
        <p className="label col-span-12 md:col-span-3">What it cannot read</p>
        <p className="col-span-12 text-[15px] leading-relaxed text-ink-2 md:col-span-8 md:col-start-5">
          msgdrift reads each page as served and loads it again in a browser if it comes back nearly empty or blocked. PDFs, pages
          behind a login, and pages that need a click before the copy appears still come back as not read and are left out of the
          score. Text beyond {LIMITS.maxPageChars.toLocaleString()} characters on a page is not read. Pricing pages are the most common
          casualty. Details on the <Link href="/method" className="link">method page</Link>.
        </p>
      </aside>
      <ScanForm />
    </div>
  );
}
