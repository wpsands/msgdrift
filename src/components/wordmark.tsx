/**
 * The wordmark is typographic: "msg" sits on the baseline and each letter of
 * "drift" slips a little further below it.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  const drift = ["d", "r", "i", "f", "t"];
  return (
    <span className={`inline-flex items-baseline font-medium tracking-tight text-ink ${className}`} aria-label="msgdrift">
      <span aria-hidden="true">msg</span>
      <span aria-hidden="true" className="inline-flex items-baseline text-blue">
        {drift.map((ch, i) => (
          <span key={i} style={{ display: "inline-block", transform: `translateY(${i * 0.9}px)` }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
