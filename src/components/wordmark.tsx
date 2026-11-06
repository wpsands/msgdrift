/** The msgdrift mark: two lines that leave the same point and part ways. */
export function DriftMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <path d="M4 22 C 12 22, 16 22, 28 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <path d="M4 22 C 12 22, 18 10, 28 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="8" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <DriftMark className="h-6 w-6 text-ink" />
      <span className="font-mono text-[15px] font-semibold tracking-tight text-ink">msgdrift</span>
    </span>
  );
}
