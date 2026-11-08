"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteLink, deleteReport, forgetOwnerToken, readOwnerToken } from "@/lib/owner";
import { track } from "@/lib/analytics";

/**
 * Shown only in the browser that ran the scan, which holds the delete token.
 * Two-step confirm inline; no browser dialogs.
 */
export function OwnerActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "confirm" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Storage is an external system; read it after hydration in a callback.
    const timer = setTimeout(() => setToken(readOwnerToken(reportId)), 0);
    return () => clearTimeout(timer);
  }, [reportId]);

  if (!token) return null;

  async function copyLink() {
    const link = deleteLink(window.location.origin, reportId, token!);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this delete link", link);
    }
  }

  async function remove() {
    setStep("working");
    const result = await deleteReport(reportId, token!);
    if (result.ok) {
      track("report_deleted");
      forgetOwnerToken(reportId);
      router.replace("/scan?deleted=1");
      return;
    }
    setError(result.error);
    setStep("error");
  }

  return (
    <aside className="rule mt-10 pt-5 text-[15px]" aria-label="Report owner controls">
      <p className="text-ink-2">
        You ran this scan. Only this browser can delete the report, or anyone you give the delete link to.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {step === "idle" && (
          <button type="button" onClick={() => setStep("confirm")} className="link">Delete this report</button>
        )}
        {step === "confirm" && (
          <>
            <span className="text-ink">Delete permanently? The share link will stop working.</span>
            <button type="button" onClick={remove} className="btn btn-sm">Yes, delete</button>
            <button type="button" onClick={() => setStep("idle")} className="link">Keep it</button>
          </>
        )}
        {step === "working" && <span className="progress-pulse text-muted">Deleting</span>}
        {step === "error" && (
          <>
            <span className="text-ink">{error}</span>
            <button type="button" onClick={() => setStep("idle")} className="link">Try again</button>
          </>
        )}
        <button type="button" onClick={copyLink} className="text-muted hover:text-blue">{copied ? "Delete link copied" : "Copy delete link"}</button>
      </div>
    </aside>
  );
}
