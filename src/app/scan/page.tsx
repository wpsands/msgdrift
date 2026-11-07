import type { Metadata } from "next";
import { ScanForm } from "@/components/scan-form";

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
      <ScanForm />
    </div>
  );
}
