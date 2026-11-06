"use client";

import { Check, Download, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ShareBar({ reportId, shareUrl, example }: { reportId: string; shareUrl: string; example: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", shareUrl);
    }
  }

  const base = example ? "/api/example" : `/api/reports/${reportId}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-accent-ink"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy share link"}
      </button>
      <a href={`${base}?format=md`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
        <FileText className="h-4 w-4" aria-hidden="true" />
        Markdown
      </a>
      <a href={`${base}?format=json`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
        <Download className="h-4 w-4" aria-hidden="true" />
        JSON
      </a>
      <Link href="/scan" className="ml-auto text-sm text-muted hover:text-ink">
        Run your own scan
      </Link>
    </div>
  );
}
