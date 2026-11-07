import { ImageResponse } from "next/og";
import { scoreBand } from "@/lib/engine/scoring";
import { loadOgFonts, OG_COLORS, OG_SIZE, ogFontList, OgWordmark } from "@/lib/og";
import { getReportStore, isValidReportId } from "@/lib/storage/reports";

export const alt = "msgdrift report score";
export const size = OG_SIZE;
export const contentType = "image/png";

const BAND_LABEL = { aligned: "Aligned", drifting: "Drifting", "off-message": "Off-message" } as const;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fonts, report] = await Promise.all([loadOgFonts(), isValidReportId(id) ? getReportStore().load(id) : Promise.resolve(null)]);

  const score = report ? Math.round(report.overallScore) : null;
  const total = report ? report.counts.critical + report.counts.major + report.counts.minor + report.counts.info : 0;
  const pct = report ? Math.max(0, Math.min(100, report.overallScore)) : 0;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <OgWordmark />
          <span style={{ fontSize: 22, color: OG_COLORS.muted, letterSpacing: 2, textTransform: "uppercase" }}>Drift report</span>
        </div>

        {report && score !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
                <div style={{ fontSize: 76, lineHeight: 1, letterSpacing: -2 }}>{report.site}</div>
                <div style={{ fontSize: 28, color: OG_COLORS.ink2, fontFamily: "IBM Plex Serif" }}>
                  {`${report.pages.length} page${report.pages.length === 1 ? "" : "s"}, ${total} finding${total === 1 ? "" : "s"}: ${report.counts.critical} critical, ${report.counts.major} major, ${report.counts.minor} minor`}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 150, lineHeight: 0.9, letterSpacing: -4 }}>{score}</span>
                  <span style={{ fontSize: 28, color: OG_COLORS.muted }}>/100</span>
                </div>
                <span style={{ fontSize: 30, color: OG_COLORS.blue, marginTop: 10 }}>{BAND_LABEL[scoreBand(report.overallScore)]}</span>
              </div>
            </div>
            <div style={{ display: "flex", position: "relative", height: 26, borderBottom: `2px solid ${OG_COLORS.ink}` }}>
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} style={{ position: "absolute", left: `${i * 10}%`, bottom: 0, width: 1, height: 14, background: OG_COLORS.muted }} />
              ))}
              <div style={{ position: "absolute", left: `${pct}%`, bottom: -2, width: 4, height: 28, background: OG_COLORS.blue, transform: "translateX(-2px)" }} />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>Find where your website stopped saying what you meant.</div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: OG_COLORS.muted }}>
          <span>Semantic messaging drift detection</span>
          <span>msgdrift.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: ogFontList(fonts) },
  );
}
