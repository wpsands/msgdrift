import type { Severity } from "@/lib/engine/schema";

const META: Record<Severity, { label: string; description: string }> = {
  critical: { label: "Critical", description: "A direct contradiction of the positioning, or copy aimed at a buyer you say you do not serve." },
  major: { label: "Major", description: "A core value proposition missing from a page where it belongs, or present but diluted or misframed." },
  minor: { label: "Minor", description: "Tone that breaks the guide, stale phrasing from a previous position, or a secondary message that slipped." },
  info: { label: "Info", description: "Not wrong on its face, but worth a human look. Often unused proof points or vague claims where you have specifics." },
};

export function severityMeta(severity: Severity) {
  return META[severity];
}

/** A proofreader's mark: a small glyph plus the word. Never the glyph alone. */
export function SeverityMark({ severity }: { severity: Severity }) {
  return (
    <span className={`sev sev-${severity} text-ink`}>
      <span className="sev-glyph" aria-hidden="true" />
      {META[severity].label}
    </span>
  );
}

export function SeverityCount({ severity, count }: { severity: Severity; count: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-2xl font-medium tabular-nums text-ink">{count}</span>
      <SeverityMark severity={severity} />
    </div>
  );
}
