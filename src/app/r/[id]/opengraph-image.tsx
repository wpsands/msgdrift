import { ImageResponse } from "next/og";
import { scoreBand } from "@/lib/engine/scoring";
import { DriftMarkSvg, loadDisplayFont, OG_COLORS, OG_SIZE, ogFonts } from "@/lib/og";
import { getReportStore, isValidReportId } from "@/lib/storage/reports";

export const alt = "msgdrift report score";
export const size = OG_SIZE;
export const contentType = "image/png";

const BAND = {
  aligned: { label: "Aligned", color: OG_COLORS.aligned },
  drifting: { label: "Drifting", color: OG_COLORS.drifting },
  "off-message": { label: "Off-message", color: OG_COLORS.offMessage },
} as const;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [font, report] = await Promise.all([loadDisplayFont(), isValidReportId(id) ? getReportStore().load(id) : Promise.resolve(null)]);

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
          background: OG_COLORS.bg,
          color: OG_COLORS.ink,
          fontFamily: "Instrument Serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontFamily: "monospace", fontWeight: 700 }}>
          <DriftMarkSvg />
          msgdrift
        </div>

        {report && score !== null && band ? (
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 740 }}>
              <div style={{ fontSize: 26, color: OG_COLORS.muted, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>Messaging drift report</div>
              <div style={{ fontSize: 80, lineHeight: 1.05, letterSpacing: -1 }}>{report.site}</div>
              <div style={{ fontSize: 28, color: OG_COLORS.ink2, fontFamily: "sans-serif" }}>
                {report.pages.length} page{report.pages.length === 1 ? "" : "s"} · {total} finding{total === 1 ? "" : "s"} · {report.counts.critical} critical, {report.counts.major} major
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontSize: 170, lineHeight: 1, color: band.color }}>{score}</div>
                <div style={{ fontSize: 32, color: OG_COLORS.muted, fontFamily: "monospace" }}>/100</div>
              </div>
              <div style={{ fontSize: 30, color: band.color, fontFamily: "sans-serif", fontWeight: 600 }}>{band.label}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 72, lineHeight: 1.1, maxWidth: 1000 }}>Find where your website stopped saying what you meant.</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: OG_COLORS.muted, fontFamily: "sans-serif" }}>
          <span>Semantic messaging drift detection, built on Claude</span>
          <span>msgdrift.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts(font) },
  );
}
