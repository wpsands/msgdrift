import { ImageResponse } from "next/og";

export const alt = "msgdrift: semantic messaging drift detection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          background: "#0f0e0b",
          color: "#f3efe6",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontFamily: "monospace", fontWeight: 700 }}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <path d="M4 22 C 12 22, 16 22, 28 22" stroke="#f3efe6" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
            <path d="M4 22 C 12 22, 18 10, 28 8" stroke="#f3efe6" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="8" r="2.5" fill="#f0714f" />
          </svg>
          msgdrift
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, lineHeight: 1.08, maxWidth: 1000 }}>Find where your website stopped saying what you meant.</div>
          <div style={{ fontSize: 30, color: "#c9c2b4", fontFamily: "sans-serif", maxWidth: 1000 }}>
            Paste your positioning doc. Get a line-by-line drift report on your live pages. Free, no login.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#978f81", fontFamily: "sans-serif" }}>
          <span>Semantic messaging drift detection, built on Claude</span>
          <span>msgdrift.com</span>
        </div>
      </div>
    ),
    size,
  );
}
