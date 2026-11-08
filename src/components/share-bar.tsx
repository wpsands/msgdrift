"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";

function withFormat(base: string, format: string): string {
  return `${base}${base.includes("?") ? "&" : "?"}format=${format}`;
}

export function ShareBar({ reportId, shareUrl, downloadBase }: { reportId: string; shareUrl: string; downloadBase?: string }) {
  const [copied, setCopied] = useState(false);

  const example = Boolean(downloadBase?.startsWith("/api/example"));

  async function copy() {
    track("report_link_copied", { example });
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
      <a href={withFormat(base, "md")} className="link" onClick={() => track("report_downloaded", { format: "md", example })}>Download markdown</a>
      <a href={withFormat(base, "json")} className="link" onClick={() => track("report_downloaded", { format: "json", example })}>JSON</a>
      <Link href="/scan" className="link">Scan your own site</Link>
    </div>
  );
}
