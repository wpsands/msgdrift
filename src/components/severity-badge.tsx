import { AlertOctagon, AlertTriangle, Info, MessageSquareWarning } from "lucide-react";
import type { Severity } from "@/lib/engine/schema";

const META: Record<Severity, { label: string; color: string; soft: string; Icon: typeof Info; description: string }> = {
  critical: { label: "Critical", color: "var(--bad)", soft: "var(--bad-soft)", Icon: AlertOctagon, description: "Direct contradiction of positioning or wrong audience" },
  major: { label: "Major", color: "var(--warn)", soft: "var(--warn-soft)", Icon: AlertTriangle, description: "Key value proposition missing, diluted, or misframed" },
  minor: { label: "Minor", color: "var(--note)", soft: "var(--note-soft)", Icon: MessageSquareWarning, description: "Tone inconsistency, stale phrasing, secondary gap" },
  info: { label: "Info", color: "var(--muted)", soft: "var(--surface-2)", Icon: Info, description: "Worth a human look, not necessarily wrong" },
};

export function severityMeta(severity: Severity) {
  return META[severity];
}

export function SeverityBadge({ severity, size = "sm" }: { severity: Severity; size?: "sm" | "md" }) {
  const { label, color, soft, Icon } = META[severity];
  const pad = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad}`}
      style={{ background: soft, color }}
    >
      <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
      {label}
    </span>
  );
}

export function SeverityCount({ severity, count }: { severity: Severity; count: number }) {
  const { label, color, Icon } = META[severity];
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
      <span className="font-mono text-lg tabular-nums text-ink">{count}</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}
