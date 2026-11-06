import { ImageResponse } from "next/og";
import { DriftMarkSvg, loadDisplayFont, OG_COLORS, OG_SIZE, ogFonts } from "@/lib/og";

export const alt = "msgdrift: semantic messaging drift detection";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const font = await loadDisplayFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: OG_COLORS.bg,
          color: OG_COLORS.ink,
          fontFamily: "Instrument Serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontFamily: "monospace", fontWeight: 700 }}>
          <DriftMarkSvg />
          msgdrift
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 80, lineHeight: 1.05, maxWidth: 1040, letterSpacing: -1 }}>Find where your website stopped saying what you meant.</div>
          <div style={{ fontSize: 30, color: OG_COLORS.ink2, fontFamily: "sans-serif", maxWidth: 1000 }}>
            Paste your positioning doc. Get a line-by-line drift report on your live pages. Free, no login.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: OG_COLORS.muted, fontFamily: "sans-serif" }}>
          <span>Semantic messaging drift detection, built on Claude</span>
          <span>msgdrift.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts(font) },
  );
}
