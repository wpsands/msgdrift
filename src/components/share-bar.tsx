"use client";

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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
      <button type="button" onClick={copy} className="btn btn-sm">
        {copied ? "Link copied" : "Copy share link"}
      </button>
      <a href={`${base}?format=md`} className="link">Download markdown</a>
      <a href={`${base}?format=json`} className="link">JSON</a>
      <Link href="/scan" className="link">Scan your own site</Link>
    </div>
  );
}
