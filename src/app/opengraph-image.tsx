import { ImageResponse } from "next/og";
import { loadOgFonts, OG_COLORS, OG_SIZE, ogFontList, OgWordmark } from "@/lib/og";

export const alt = "msgdrift: find where your website stopped saying what you meant";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontFamily: "IBM Plex Sans",
        }}
      >
        <OgWordmark />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 84, lineHeight: 1, letterSpacing: -2, maxWidth: 1060 }}>
            <span>Find where your website stopped saying&nbsp;</span>
            <span style={{ background: OG_COLORS.yellow, padding: "0 6px" }}>what you meant.</span>
          </div>
          <div style={{ fontSize: 30, color: OG_COLORS.ink2, fontFamily: "IBM Plex Serif", maxWidth: 980, lineHeight: 1.35 }}>
            Paste your positioning document. Read a line-by-line drift report on your live pages.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: OG_COLORS.muted, borderTop: `1px solid ${OG_COLORS.ink}`, paddingTop: 20 }}>
          <span>Free, no login. Open source.</span>
          <span>msgdrift.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: ogFontList(fonts) },
  );
}
