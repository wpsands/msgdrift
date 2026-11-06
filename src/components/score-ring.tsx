import { scoreBand, type ScoreBand } from "@/lib/engine/scoring";

const BAND_LABEL: Record<ScoreBand, string> = {
  aligned: "Aligned",
  drifting: "Drifting",
  "off-message": "Off-message",
};

const BAND_COLOR: Record<ScoreBand, string> = {
  aligned: "var(--good)",
  drifting: "var(--warn)",
  "off-message": "var(--bad)",
};

export function bandLabel(score: number): string {
  return BAND_LABEL[scoreBand(score)];
}

export function bandColor(score: number): string {
  return BAND_COLOR[scoreBand(score)];
}

/**
 * Hero number with a thin arc. The arc is a second encoding of the same number;
 * the text label names the band so the state never relies on color alone.
 */
export function ScoreRing({ score, size = 168, label = "Alignment" }: { score: number; size?: number; label?: string }) {
  const rounded = Math.round(score);
  const band = scoreBand(score);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <figure className="inline-flex flex-col items-center gap-2" aria-label={`${label} score ${rounded} out of 100, ${BAND_LABEL[band]}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={BAND_COLOR[band]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display leading-none text-ink" style={{ fontSize: size * 0.36 }}>
            {rounded}
          </span>
          <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">/ 100</span>
        </div>
      </div>
      <figcaption className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BAND_COLOR[band] }} aria-hidden="true" />
        <span className="font-medium text-ink">{BAND_LABEL[band]}</span>
        <span className="text-muted">· {label}</span>
      </figcaption>
    </figure>
  );
}
