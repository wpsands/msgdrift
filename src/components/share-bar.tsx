"use client";

import Link from "next/link";
import { useState } from "react";

function withFormat(base: string, format: string): string {
  return `${base}${base.includes("?") ? "&" : "?"}format=${format}`;
}

export function ShareBar({ reportId, shareUrl, downloadBase }: { reportId: string; shareUrl: string; downloadBase?: string }) {
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

  const base = downloadBase ?? `/api/reports/${reportId}`;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
      <button type="button" onClick={copy} className="btn btn-sm">
        {copied ? "Link copied" : "Copy share link"}
      </button>
      <a href={withFormat(base, "md")} className="link">Download markdown</a>
      <a href={withFormat(base, "json")} className="link">JSON</a>
      <Link href="/scan" className="link">Scan your own site</Link>
    </div>
  );
}
