import { ImageResponse } from "next/og";
import { scoreBand } from "@/lib/engine/scoring";
import { getReportStore, isValidReportId } from "@/lib/storage/reports";

export const alt = "msgdrift report score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAND = {
  aligned: { label: "Aligned", color: "#2fae76" },
  drifting: { label: "Drifting", color: "#e0a640" },
  "off-message": { label: "Off-message", color: "#ef7563" },
} as const;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = isValidReportId(id) ? await getReportStore().load(id) : null;

  const score = report ? Math.round(report.overallScore) : null;
  const band = report ? BAND[scoreBand(report.overallScore)] : null;
  const total = report ? report.counts.critical + report.counts.major + report.counts.minor + report.counts.info : 0;

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

        {report && score !== null && band ? (
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
              <div style={{ fontSize: 26, color: "#978f81", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>Messaging drift report</div>
              <div style={{ fontSize: 76, lineHeight: 1.05 }}>{report.site}</div>
              <div style={{ fontSize: 28, color: "#c9c2b4", fontFamily: "sans-serif" }}>
                {report.pages.length} page{report.pages.length === 1 ? "" : "s"} · {total} finding{total === 1 ? "" : "s"} · {report.counts.critical} critical, {report.counts.major} major
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontSize: 160, lineHeight: 1, color: band.color }}>{score}</div>
                <div style={{ fontSize: 32, color: "#978f81", fontFamily: "monospace" }}>/100</div>
              </div>
              <div style={{ fontSize: 30, color: band.color, fontFamily: "sans-serif", fontWeight: 600 }}>{band.label}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 64, lineHeight: 1.1, maxWidth: 1000 }}>Find where your website stopped saying what you meant.</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#978f81", fontFamily: "sans-serif" }}>
          <span>Semantic messaging drift detection, built on Claude</span>
          <span>msgdrift.com</span>
        </div>
      </div>
    ),
    size,
  );
}
