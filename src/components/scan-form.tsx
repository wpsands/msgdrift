"use client";

import { Check, CircleDashed, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore an unsent draft, per viewer only.
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
      setRows(
        data.suggestions.map((s, i) => ({ ...s, key: `${i}-${s.url}`, selected: true })),
      );
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
        setStage(`Fetching ${event.pages} page${event.pages === 1 ? "" : "s"}`);
        break;
      case "fetch:done":
        setProgress((p) => ({ ...p, [event.url]: { ...p[event.url], url: event.url, fetch: { status: event.status, chars: event.chars, title: event.title, error: event.error } } }));
        break;
      case "analyze:start":
        setStage("Analyzing pages against your positioning");
        setProgress((p) => ({ ...p, [event.url]: { ...p[event.url], url: event.url, analyzing: true } }));
        break;
      case "analyze:done":
        setProgress((p) => ({ ...p, [event.url]: { ...p[event.url], url: event.url, analyzing: false, analysis: { score: event.score, findings: event.findings } } }));
        break;
      case "summary:start":
        setStage("Writing the executive summary");
        break;
      case "done":
        setStage("Report ready");
        setReportId(event.reportId);
        setPhase("done");
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        router.push(`/r/${event.reportId}`);
        break;
      case "error":
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
    <div className="mt-10 space-y-8">
      {/* Step 1: positioning document */}
      <section className="card p-5 sm:p-6">
        <StepHeader n={1} title="Your positioning document" done={docOk} />
        <p className="mt-1 text-sm text-muted">
          Messaging guide, positioning doc, brand voice, a strategy memo. Markdown or plain text, up to {LIMITS.maxSourceChars.toLocaleString()} characters. It is
          used for this scan and stored only inside the report.
        </p>
        <div
          className="mt-4"
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
            disabled={phase === "running"}
            rows={10}
            placeholder={"# Positioning\n\nWe are the ... for ... who need ...\n\nCore value props:\n1. ...\n2. ...\n\nWho we do not serve: ...\n\nTone: ..."}
            className="w-full resize-y rounded-lg border border-line bg-bg px-3.5 py-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-muted/70 focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input ref={fileRef} type="file" accept=".md,.txt,.markdown,text/plain,text/markdown" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.currentTarget.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={phase === "running"} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-ink-2 hover:border-line-strong hover:text-ink">
            <Upload className="h-4 w-4" aria-hidden="true" /> Upload .md or .txt
          </button>
          <button type="button" onClick={() => { setDoc(SAMPLE_POSITIONING); setDocLabel(SAMPLE_POSITIONING_LABEL); setError(null); }} disabled={phase === "running"} className="rounded-full border border-line px-3 py-1.5 text-ink-2 hover:border-line-strong hover:text-ink">
            Use the sample document
          </button>
          <span className={`ml-auto font-mono text-xs ${docChars > LIMITS.maxSourceChars * 0.95 ? "text-warn" : "text-muted"}`}>
            {docChars.toLocaleString()} / {LIMITS.maxSourceChars.toLocaleString()}
          </span>
        </div>
      </section>

      {/* Step 2: site and pages */}
      <section className="card p-5 sm:p-6">
        <StepHeader n={2} title="Pages to check" done={phase !== "input" && selected.length > 0} />
        <p className="mt-1 text-sm text-muted">
          Enter the site. msgdrift reads the homepage, finds the pages most likely to carry positioning, and proposes up to {LIMITS.maxPages}. Edit the list before you run.
        </p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void discover();
          }}
        >
          <label htmlFor="site" className="sr-only">Website URL</label>
          <input
            id="site"
            type="text"
            inputMode="url"
            autoComplete="url"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            disabled={phase === "running"}
            placeholder="yourcompany.com"
            className="flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-muted/70 focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={discovering || !site.trim() || phase === "running"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-bg hover:bg-accent hover:text-accent-ink disabled:opacity-50"
          >
            {discovering ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            {discovering ? "Reading site" : rows.length ? "Find pages again" : "Find pages"}
          </button>
        </form>

        {discovery?.homepageError && (
          <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-ink-2">
            The homepage could not be read ({discovery.homepageError}). You can still add page URLs by hand below.
          </p>
        )}

        {rows.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {rows.map((row) => {
              const prog = progress[row.url];
              return (
                <li key={row.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={phase === "running"}
                    onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, selected: e.target.checked } : r)))}
                    aria-label={`Include ${row.label}`}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={row.label}
                      disabled={phase === "running"}
                      onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, label: e.target.value.slice(0, 120) } : r)))}
                      aria-label="Page label"
                      className="w-full bg-transparent text-sm font-medium text-ink focus:outline-none"
                    />
                    <p className="truncate font-mono text-xs text-muted">{row.url}</p>
                  </div>
                  {phase === "running" || phase === "done" ? (
                    <ProgressCell prog={prog} selected={row.selected} />
                  ) : (
                    <>
                      <select
                        value={row.importance}
                        onChange={(e) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, importance: e.target.value as PageImportance } : r)))}
                        aria-label="Importance"
                        className="rounded-md border border-line bg-bg px-2 py-1 font-mono text-xs text-ink-2"
                      >
                        {IMPORTANCES.map((imp) => (
                          <option key={imp} value={imp}>{imp}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))} aria-label={`Remove ${row.label}`} className="rounded-md p-1 text-muted hover:text-bad">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {phase !== "running" && phase !== "done" && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
              placeholder="Add a page: yourcompany.com/solutions/enterprise"
              className="flex-1 rounded-lg border border-line bg-bg px-3.5 py-2 font-mono text-xs text-ink placeholder:text-muted/70 focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button type="button" onClick={addManual} disabled={!manualUrl.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-50">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add
            </button>
          </div>
        )}
        {rows.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {selected.length} page{selected.length === 1 ? "" : "s"} selected (max {LIMITS.maxPages}). Importance weights the overall score: high 3x, medium 2x, low 1x.
          </p>
        )}
      </section>

      {/* Step 3: run */}
      <section className="card p-5 sm:p-6">
        <StepHeader n={3} title="Run the scan" done={phase === "done"} />
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-md bg-bad-soft px-3 py-2 text-sm text-ink">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
            {error}
          </p>
        )}
        {phase === "running" || phase === "done" ? (
          <div className="mt-4 flex items-center gap-3 text-sm text-ink-2" aria-live="polite">
            {phase === "done" ? <Check className="h-4 w-4 text-good" aria-hidden="true" /> : <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />}
            <span>{stage}</span>
            {phase === "running" && (
              <button type="button" onClick={cancel} className="ml-auto text-xs text-muted hover:text-ink">Cancel</button>
            )}
            {phase === "done" && reportId && (
              <a href={`/r/${reportId}`} className="ml-auto text-xs text-accent hover:underline">Open report</a>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={!docOk || selected.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Run drift scan
            </button>
            <p className="text-xs text-muted">
              {!docOk ? `Add your positioning document first (${LIMITS.minSourceChars} characters minimum).` : selected.length === 0 ? "Pick the pages to check." : `${selected.length} page${selected.length === 1 ? "" : "s"}, about ${Math.max(1, Math.ceil(selected.length / 3) * 30 + 20)} seconds.`}
            </p>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Free scans are limited to 3 per hour per visitor so the shared model budget lasts. For unlimited runs, use the{" "}
          <a href="https://github.com/wpsands/msgdrift/tree/main/cli" className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">open-source CLI</a> with your own key.
        </p>
      </section>
    </div>
  );
}

function StepHeader({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-medium text-ink">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${done ? "bg-good text-white" : "border border-line text-muted"}`} aria-hidden="true">
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      {title}
    </h2>
  );
}

function ProgressCell({ prog, selected }: { prog?: PageProgress; selected: boolean }) {
  if (!selected) return <span className="font-mono text-xs text-muted">skipped</span>;
  if (!prog?.fetch) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
        <CircleDashed className="progress-pulse h-3.5 w-3.5" aria-hidden="true" /> fetching
      </span>
    );
  }
  if (prog.fetch.error) {
    return <span className="font-mono text-xs text-bad" title={prog.fetch.error}>{prog.fetch.error.length > 28 ? `${prog.fetch.error.slice(0, 28)}…` : prog.fetch.error}</span>;
  }
  if (prog.analysis) {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-xs text-ink">
        <Check className="h-3.5 w-3.5 text-good" aria-hidden="true" />
        {prog.analysis.score}/100 · {prog.analysis.findings} finding{prog.analysis.findings === 1 ? "" : "s"}
      </span>
    );
  }
  if (prog.analyzing) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-accent">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> analyzing
      </span>
    );
  }
  return <span className="font-mono text-xs text-muted">{(prog.fetch.chars / 1000).toFixed(1)}k chars · queued</span>;
}
