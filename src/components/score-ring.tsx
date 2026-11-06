import { scoreBand, type ScoreBand } from "@/lib/engine/scoring";

const BAND_LABEL: Record<ScoreBand, string> = {
  aligned: "Aligned",
  drifting: "Drifting",
  "off-message": "Off-message",
};

export function bandLabel(score: number): string {
  return BAND_LABEL[scoreBand(score)];
}

/**
 * The score as a number on a ruler. The marker position repeats the number;
 * the band is written out so the reading never depends on color.
 */
export function ScoreRuler({ score, label = "Alignment", compact = false }: { score: number; label?: string; compact?: boolean }) {
  const rounded = Math.round(score);
  const pct = Math.max(0, Math.min(100, score));
  return (
    <figure aria-label={`${label} ${rounded} out of 100, ${bandLabel(score)}`}>
      <div className="flex items-baseline gap-3">
        <span className={`font-medium tracking-tight text-ink ${compact ? "text-4xl" : "text-[5.5rem] leading-none"}`}>{rounded}</span>
        <span className="font-mono text-sm text-muted">/ 100</span>
        <span className={`ml-auto font-medium ${compact ? "text-sm" : "text-base"}`}>{bandLabel(score)}</span>
      </div>
      <div className={`ruler ${compact ? "mt-2 !h-5" : "mt-4"}`} role="img" aria-hidden="true">
        <span className="ruler-mark" style={{ left: `${pct}%` }} />
      </div>
      {!compact && (
        <figcaption className="relative mt-2 h-5 font-mono text-xs text-muted">
          <span className="absolute left-0">0 off-message</span>
          <span className="absolute -translate-x-1/2" style={{ left: "60%" }}>60 drifting</span>
          <span className="absolute -translate-x-1/2" style={{ left: "80%" }}>80 aligned</span>
          <span className="absolute right-0">100</span>
        </figcaption>
      )}
    </figure>
  );
}

/** A number with the band beside it, for lists. */
export function ScoreInline({ score }: { score: number }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-medium tabular-nums text-ink">{Math.round(score)}</span>
      <span className="text-sm text-muted">{bandLabel(score)}</span>
    </span>
  );
}
