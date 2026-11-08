"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberOwnerToken } from "@/lib/owner";
import { elapsedSeconds, roughChars, startTimer, track } from "@/lib/analytics";
import { scoreBand } from "@/lib/engine/scoring";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLE_POSITIONING, SAMPLE_POSITIONING_LABEL } from "@/data/sample-positioning";
import type { DiscoveryResult, SuggestedPage } from "@/lib/engine/discover";
import { IMPORTANCES, LIMITS, type PageImportance, type ScanEvent } from "@/lib/engine/schema";

interface PageRow extends SuggestedPage {
  key: string;
  selected: boolean;
}

interface PageProgress {
  url: string;
  fetch?: { status: number; chars: number; title: string; error: string | null };
  analyzing?: boolean;
  analysis?: { score: number; findings: number };
}

type Phase = "input" | "pages" | "running" | "done";

const DRAFT_KEY = "msgdrift:draft";

export function ScanForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [doc, setDoc] = useState("");
  const [docLabel, setDocLabel] = useState("positioning.md");
  const [site, setSite] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [rows, setRows] = useState<PageRow[]>([]);
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, PageProgress>>({});
  const [stage, setStage] = useState<string>("");
  const [reportId, setReportId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Mirrors for the analytics calls inside the stream loop, which closes over stale state.
  const startedAtRef = useRef(0);
  const progressRef = useRef<Record<string, PageProgress>>({});
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Storage is an external system; restore after hydration in a callback so the
    // server and first client render match.
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw) as { doc?: string; docLabel?: string; site?: string };
        if (d.doc) setDoc(d.doc);
        if (d.docLabel) setDocLabel(d.docLabel);
        if (d.site) setSite(d.site);
      } catch {
        // storage unavailable
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ doc, docLabel, site }));
    } catch {
      // storage unavailable
    }
  }, [doc, docLabel, site]);

  const docChars = doc.length;
  const docOk = docChars >= LIMITS.minSourceChars && docChars <= LIMITS.maxSourceChars;
  const selected = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const locked = phase === "running" || phase === "done";

  const onFile = useCallback(async (file: File) => {
    if (file.size > 400_000) {
      setError("That file is too large. Paste the relevant sections instead (20,000 characters max).");
      return;
    }
    const text = await file.text();
    setDoc(text.slice(0, LIMITS.maxSourceChars));
    setDocLabel(file.name);
    setError(null);
  }, []);

  async function discover() {
    setError(null);
    setDiscovering(true);
    setDiscovery(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site }),
      });
      const data = (await res.json()) as DiscoveryResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not read that site.");
      setDiscovery(data);
      setRows(data.suggestions.map((s, i) => ({ ...s, key: `${i}-${s.url}`, selected: true })));
      setPhase("pages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that site.");
    } finally {
      setDiscovering(false);
    }
  }

  function addManual() {
    const value = manualUrl.trim();
    if (!value) return;
    if (rows.length >= LIMITS.maxPages) {
      setError(`You can scan up to ${LIMITS.maxPages} pages per run.`);
      return;
    }
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    if (rows.some((r) => r.url.replace(/\/$/, "") === url.replace(/\/$/, ""))) {
      setManualUrl("");
      return;
    }
    let label = "Page";
    try {
      const path = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
      label = path ? path.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "Homepage";
    } catch {
      // keep default label
    }
    setRows((r) => [...r, { key: `${Date.now()}-${url}`, url, label, importance: "medium", reason: "Added by you", selected: true }]);
    setManualUrl("");
    setError(null);
  }

  async function run() {
    setError(null);
    if (!docOk) {
      setError(`Your positioning document needs between ${LIMITS.minSourceChars} and ${LIMITS.maxSourceChars} characters.`);
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one page.");
      return;
    }
    if (selected.length > LIMITS.maxPages) {
      setError(`Select at most ${LIMITS.maxPages} pages.`);
      return;
    }
    setPhase("running");
    setStage("Starting");
    track("scan_started", { pages: selected.length, doc_chars: roughChars(doc.length), used_sample: doc === SAMPLE_POSITIONING });
    startedAtRef.current = startTimer();
    const initial: Record<string, PageProgress> = {};
    for (const r of selected) initial[r.url] = { url: r.url };
    setProgress(initial);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDocument: doc,
          sourceLabel: docLabel,
          pages: selected.map((r) => ({ url: r.url, importance: r.importance, label: r.label })),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
        let message = data.error ?? `Scan failed (${res.status}).`;
        if (res.status === 429 && data.retryAfterSeconds) {
          const mins = Math.ceil(data.retryAfterSeconds / 60);
          message += ` Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`;
        }
        track("scan_failed", { reason: res.status === 429 ? "rate_limited" : "request_failed", status: res.status });
        throw new Error(message);
      }
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) handleEvent(JSON.parse(line) as ScanEvent);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        track("scan_failed", { reason: "cancelled" });
        setPhase("pages");
        return;
      }
      setError(err instanceof Error ? err.message : "Scan failed.");
      setPhase("pages");
    }
  }

  function handleEvent(event: ScanEvent) {
    switch (event.type) {
      case "start":
        setStage(`Reading ${event.pages} page${event.pages === 1 ? "" : "s"}`);
        break;
      case "fetch:done":
        setProgress((p) => ({ ...p, [event.url]: { ...p[event.url], url: event.url, fetch: { status: event.status, chars: event.chars, title: event.title, error: event.error } } }));
        break;
      case "analyze:start":
        setStage("Comparing pages with your positioning");
        setProgress((p) => ({ ...p, [event.url]: { ...p[event.url], url: event.url, analyzing: true } }));
        break;
      case "analyze:done":
        setProgress((p) => ({ ...p, [event.url]: { ...p[event.url], url: event.url, analyzing: false, analysis: { score: event.score, findings: event.findings } } }));
        break;
      case "summary:start":
        setStage("Writing the summary");
        break;
      case "done":
        setStage("Report ready");
        setReportId(event.reportId);
        setPhase("done");
        rememberOwnerToken(event.reportId, event.deleteToken);
        track("scan_completed", {
          pages: Object.keys(progressRef.current).length,
          pages_not_read: Object.values(progressRef.current).filter((p) => p.fetch?.error).length,
          overall_score: Math.round(event.overallScore),
          band: scoreBand(event.overallScore),
          duration_s: elapsedSeconds(startedAtRef.current),
        });
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        router.push(`/r/${event.reportId}`);
        break;
      case "error":
        track("scan_failed", { reason: "stream_error" });
        setError(event.message);
        setPhase("pages");
        break;
      default:
        break;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="mt-16">
      {/* Step 1 */}
      <section className="rule-strong grid-12 gap-y-6 pt-6 pb-14">
        <StepLabel n="01" title="Your positioning document" done={docOk} />
        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          <p className="text-[15px] leading-relaxed text-ink-2">
            A messaging guide, positioning document, brand voice, or strategy memo. Markdown or plain text, up to{" "}
            {LIMITS.maxSourceChars.toLocaleString()} characters.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Your document is read once and not saved. The report keeps only the sentences it quotes, and you can delete the
            report afterward. <Link href="/privacy" className="link">How this works</Link>.
          </p>
          <div
            className="mt-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void onFile(f);
            }}
          >
            <label htmlFor="doc" className="sr-only">Positioning document</label>
            <textarea
              id="doc"
              value={doc}
              onChange={(e) => setDoc(e.target.value.slice(0, LIMITS.maxSourceChars))}
              disabled={locked}
              rows={12}
              placeholder={"Positioning\n\nWe are the ... for ... who need ...\n\nCore value propositions\n1. ...\n2. ...\n\nWho we do not serve\n...\n\nTone\n..."}
              className="field field-area"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
            <input ref={fileRef} type="file" accept=".md,.txt,.markdown,text/plain,text/markdown" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.currentTarget.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={locked} className="link disabled:opacity-40">Upload a .md or .txt file</button>
            <button type="button" onClick={() => { setDoc(SAMPLE_POSITIONING); setDocLabel(SAMPLE_POSITIONING_LABEL); setError(null); track("sample_loaded"); }} disabled={locked} className="link disabled:opacity-40">
              Use the sample document
            </button>
            <span className={`ml-auto font-mono text-xs ${docChars > LIMITS.maxSourceChars * 0.95 ? "text-blue" : "text-muted"}`}>
              {docChars.toLocaleString()} / {LIMITS.maxSourceChars.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="rule-strong grid-12 gap-y-6 pt-6 pb-14">
        <StepLabel n="02" title="Pages to read" done={phase !== "input" && selected.length > 0} />
        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          <p className="text-[15px] leading-relaxed text-ink-2">
            Enter the site. msgdrift reads the homepage, finds the pages most likely to carry positioning, and proposes up to{" "}
            {LIMITS.maxPages}. Edit the list before you run.
          </p>
          <form
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void discover();
            }}
          >
            <div className="flex-1">
              <label htmlFor="site" className="label">Website</label>
              <input
                id="site"
                type="text"
                inputMode="url"
                autoComplete="url"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                disabled={locked}
                placeholder="yourcompany.com"
                className="field mt-1 font-mono text-[15px]"
              />
            </div>
            <button type="submit" disabled={discovering || !site.trim() || locked} className="btn btn-ghost">
              {discovering ? "Reading the site" : rows.length ? "Find pages again" : "Find pages"}
            </button>
          </form>

          {discovery?.homepageError && (
            <p className="mt-4 border-l-2 border-blue pl-4 text-sm text-ink-2">
              The homepage could not be read ({discovery.homepageError}). You can still add page URLs by hand below.
            </p>
          )}

          {rows.length > 0 && (
            <ul className="mt-8 border-t border-ink">
              {rows.map((row) => {
                const prog = progress[row.url];
                return (
                  <li key={row.key} className="grid grid-cols-[1.25rem_1fr] items-start gap-x-4 gap-y-2 border-b border-rule py-3 sm:grid-cols-[1.25rem_1fr_auto]">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={locked}
                      onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, selected: e.target.checked } : r)))}
                      aria-label={`Include ${row.label}`}
                      className="mt-1.5 h-4 w-4 accent-[var(--blue)]"
                    />
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={row.label}
                        disabled={locked}
                        onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, label: e.target.value.slice(0, 120) } : r)))}
                        aria-label="Page label"
                        className="w-full bg-transparent text-[15px] font-medium focus:outline-none focus:text-blue"
                      />
                      <p className="truncate font-mono text-xs text-muted">{row.url}</p>
                    </div>
                    <div className="col-start-2 flex items-center gap-4 sm:col-start-3">
                      {locked ? (
                        <ProgressCell prog={prog} selected={row.selected} />
                      ) : (
                        <>
                          <select
                            value={row.importance}
                            onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, importance: e.target.value as PageImportance } : r)))}
                            aria-label="Importance"
                            className="border-b border-rule-strong bg-transparent py-1 font-mono text-xs text-ink-2 focus:border-blue focus:outline-none"
                          >
                            {IMPORTANCES.map((imp) => (
                              <option key={imp} value={imp}>{imp} importance</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))} className="font-mono text-xs text-muted hover:text-blue">
                            remove
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!locked && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="manual" className="sr-only">Add a page URL</label>
                <input
                  id="manual"
                  type="text"
                  inputMode="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addManual();
                    }
                  }}
                  placeholder="Add a page by URL"
                  className="field font-mono text-sm"
                />
              </div>
              <button type="button" onClick={addManual} disabled={!manualUrl.trim()} className="btn btn-ghost btn-sm">Add</button>
            </div>
          )}
          {rows.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              {selected.length} page{selected.length === 1 ? "" : "s"} selected (max {LIMITS.maxPages}). Importance weights the overall score: high 3x, medium 2x, low 1x.
            </p>
          )}
        </div>
      </section>

      {/* Step 3 */}
      <section className="rule-strong grid-12 gap-y-6 pt-6 pb-10">
        <StepLabel n="03" title="Run the scan" done={phase === "done"} />
        <div className="col-span-12 lg:col-span-8 lg:col-start-5">
          {error && (
            <p role="alert" className="mb-6 border-l-2 border-ink pl-4 text-[15px] text-ink">{error}</p>
          )}
          {locked ? (
            <div className="flex items-center gap-4 text-[15px]" aria-live="polite">
              <span className={phase === "done" ? "text-blue" : "progress-pulse text-blue"} aria-hidden="true">{phase === "done" ? "■" : "■"}</span>
              <span>{stage}</span>
              {phase === "running" && (
                <button type="button" onClick={cancel} className="ml-auto text-sm text-muted hover:text-blue">Cancel</button>
              )}
              {phase === "done" && reportId && (
                <a href={`/r/${reportId}`} className="link ml-auto text-sm">Open report</a>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" onClick={run} disabled={!docOk || selected.length === 0} className="btn">
                Run drift scan
              </button>
              <p className="text-sm text-muted">
                {!docOk
                  ? `Add your positioning document first (${LIMITS.minSourceChars} characters minimum).`
                  : selected.length === 0
                    ? "Choose the pages to read."
                    : `${selected.length} page${selected.length === 1 ? "" : "s"}, about ${Math.max(1, Math.ceil(selected.length / 3) * 30 + 20)} seconds.`}
              </p>
            </div>
          )}
          <p className="mt-8 text-sm text-muted">
            Free scans are limited to 3 per hour per visitor so the shared model budget lasts. For unlimited runs, use the{" "}
            <a href="https://github.com/wpsands/msgdrift/tree/main/cli" className="link" target="_blank" rel="noopener noreferrer">command line version</a> with your own key.
          </p>
        </div>
      </section>
    </div>
  );
}

function StepLabel({ n, title, done }: { n: string; title: string; done: boolean }) {
  return (
    <div className="col-span-12 lg:col-span-3">
      <p className="font-mono text-xs text-muted">{n}{done && <span className="ml-2 text-blue">done</span>}</p>
      <h2 className="h-sub mt-2">{title}</h2>
    </div>
  );
}

function ProgressCell({ prog, selected }: { prog?: PageProgress; selected: boolean }) {
  if (!selected) return <span className="font-mono text-xs text-muted">skipped</span>;
  if (!prog?.fetch) return <span className="progress-pulse font-mono text-xs text-muted">reading</span>;
  if (prog.fetch.error) {
    return <span className="font-mono text-xs text-ink" title={prog.fetch.error}>{prog.fetch.error.length > 28 ? `${prog.fetch.error.slice(0, 28)}…` : prog.fetch.error}</span>;
  }
  if (prog.analysis) {
    return (
      <span className="font-mono text-xs text-ink">
        {prog.analysis.score}/100 · {prog.analysis.findings} finding{prog.analysis.findings === 1 ? "" : "s"}
      </span>
    );
  }
  if (prog.analyzing) return <span className="progress-pulse font-mono text-xs text-blue">comparing</span>;
  return <span className="font-mono text-xs text-muted">{(prog.fetch.chars / 1000).toFixed(1)}k chars · queued</span>;
}
