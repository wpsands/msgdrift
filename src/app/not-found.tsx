import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">404</p>
      <h1 className="font-display mt-2 text-4xl text-ink">That page drifted off.</h1>
      <p className="mt-4 text-ink-2">
        Reports live at their share link only. If someone sent you one and it is gone, ask them to run the scan again.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-line-strong">Home</Link>
        <Link href="/scan" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-accent hover:text-accent-ink">Scan your site</Link>
      </div>
    </div>
  );
}
