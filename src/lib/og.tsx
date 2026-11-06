import { readFile } from "node:fs/promises";
import path from "node:path";

/** Shared pieces for Open Graph images rendered with next/og. White page, black text, blue mark. */

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  paper: "#ffffff",
  ink: "#0b0b0b",
  ink2: "#3b3b3b",
  muted: "#707070",
  rule: "#e4e4e1",
  blue: "#1f3ddb",
  yellow: "#fff1a8",
} as const;

let fontsPromise: Promise<{ sans: ArrayBuffer; serif: ArrayBuffer }> | null = null;

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/**
 * Bundled IBM Plex files, read from disk with literal paths so output file
 * tracing includes them (also listed in next.config outputFileTracingIncludes).
 */
export function loadOgFonts() {
  if (!fontsPromise) {
    const dir = path.join(process.cwd(), "src", "app", "fonts");
    fontsPromise = Promise.all([readFile(path.join(dir, "IBMPlexSans-Medium.ttf")), readFile(path.join(dir, "IBMPlexSerif-Regular.ttf"))]).then(
      ([sans, serif]) => ({ sans: toArrayBuffer(sans), serif: toArrayBuffer(serif) }),
    );
  }
  return fontsPromise;
}

export function ogFontList(fonts: { sans: ArrayBuffer; serif: ArrayBuffer }) {
  return [
    { name: "IBM Plex Sans", data: fonts.sans, style: "normal" as const, weight: 500 as const },
    { name: "IBM Plex Serif", data: fonts.serif, style: "normal" as const, weight: 400 as const },
  ];
}

export function OgWordmark() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", fontSize: 34, fontFamily: "IBM Plex Sans", color: OG_COLORS.ink }}>
      <span>msg</span>
      {["d", "r", "i", "f", "t"].map((ch, i) => (
        <span key={i} style={{ color: OG_COLORS.blue, transform: `translateY(${i * 1.6}px)` }}>
          {ch}
        </span>
      ))}
    </div>
  );
}
