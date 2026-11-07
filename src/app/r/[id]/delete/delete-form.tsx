"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteReport, forgetOwnerToken, readOwnerToken, tokenFromHash } from "@/lib/owner";

export function DeleteReportForm({ reportId }: { reportId: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setToken(tokenFromHash(window.location.hash) ?? readOwnerToken(reportId)), 0);
    return () => clearTimeout(timer);
  }, [reportId]);

  async function remove() {
    if (!token) return;
    setState("working");
    const result = await deleteReport(reportId, token);
    if (result.ok) {
      forgetOwnerToken(reportId);
      setState("done");
      return;
    }
    setError(result.error);
    setState("error");
  }

  if (token === undefined) return <p className="mt-8 text-sm text-muted">Checking the link</p>;

  if (token === null) {
    return (
      <p className="mt-8 text-[15px] text-ink-2">
        This link has no delete token, so it cannot delete anything. Open the report in the browser that ran the scan and use
        the delete control there.
      </p>
    );
  }

  if (state === "done") {
    return (
      <div className="mt-8">
        <p className="text-[15px] text-ink">The report is gone.</p>
        <Link href="/scan" className="btn mt-5">Run a new scan</Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
      <button type="button" onClick={remove} disabled={state === "working"} className="btn">
        {state === "working" ? "Deleting" : "Delete the report"}
      </button>
      <Link href={`/r/${reportId}`} className="link">Open the report instead</Link>
      {state === "error" && <p role="alert" className="w-full text-[15px] text-ink">{error}</p>}
    </div>
  );
}
