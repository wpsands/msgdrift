import { readFile } from "node:fs/promises";
import path from "node:path";

/** Shared pieces for Open Graph images rendered with next/og. */

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  bg: "#0f0e0b",
  ink: "#f3efe6",
  ink2: "#c9c2b4",
  muted: "#978f81",
  accent: "#f0714f",
  aligned: "#4fc58a",
  drifting: "#e0a640",
  offMessage: "#ef7563",
} as const;

let fontPromise: Promise<ArrayBuffer> | null = null;

/**
 * Instrument Serif Regular, bundled so share cards match the site's display face.
 * Read from disk with a literal path so output file tracing includes it; the
 * directory is also listed in next.config outputFileTracingIncludes.
 */
export function loadDisplayFont(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = readFile(path.join(process.cwd(), "src", "app", "fonts", "InstrumentSerif-Regular.ttf")).then(
      (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    );
  }
  return fontPromise;
}

export function ogFonts(data: ArrayBuffer) {
  return [{ name: "Instrument Serif", data, style: "normal" as const, weight: 400 as const }];
}

export function DriftMarkSvg() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
      <path d="M4 22 C 12 22, 16 22, 28 22" stroke={OG_COLORS.ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <path d="M4 22 C 12 22, 18 10, 28 8" stroke={OG_COLORS.ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="8" r="2.5" fill={OG_COLORS.accent} />
    </svg>
  );
}
