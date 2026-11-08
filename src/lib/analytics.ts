import posthog from "posthog-js";
import type { ScoreBand } from "@/lib/engine/scoring";

/**
 * Product analytics, kept deliberately narrow. Events carry counts, bands,
 * and durations. They never carry the positioning document, the URLs or
 * domain being scanned, report text, or a report id. See /privacy.
 */
export type AnalyticsEvent =
  | { name: "scan_started"; props: { pages: number; doc_chars: number; used_sample: boolean } }
  | { name: "scan_completed"; props: { pages: number; pages_not_read: number; overall_score: number; band: ScoreBand; duration_s: number } }
  | { name: "scan_failed"; props: { reason: "rate_limited" | "request_failed" | "stream_error" | "cancelled"; status?: number } }
  | { name: "sample_loaded"; props?: undefined }
  | { name: "report_link_copied"; props: { example: boolean } }
  | { name: "report_downloaded"; props: { format: "md" | "json"; example: boolean } }
  | { name: "report_deleted"; props?: undefined };

export function track<E extends AnalyticsEvent>(name: E["name"], props?: E["props"]): void {
  try {
    if (typeof window === "undefined" || !posthog.__loaded) return;
    posthog.capture(name, props ?? undefined);
  } catch {
    // Analytics must never affect the product.
  }
}

/** Wall-clock start for a duration measurement. Lives here so components stay pure under the React compiler lint. */
export function startTimer(): number {
  return Date.now();
}

export function elapsedSeconds(startedAt: number): number {
  return Math.round((Date.now() - startedAt) / 1000);
}

/** Round a character count to the nearest thousand so the event says "about how long", not "exactly which document". */
export function roughChars(n: number): number {
  return Math.round(n / 1000) * 1000;
}
