import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="msgdrift home" className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#how-it-works" className="hidden rounded-md px-3 py-1.5 text-sm text-ink-2 hover:text-ink sm:inline">
            How it works
          </Link>
          <Link href="/example" className="hidden rounded-md px-3 py-1.5 text-sm text-ink-2 hover:text-ink sm:inline">
            Example report
          </Link>
          <a
            href="https://github.com/wpsands/msgdrift"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-1.5 text-sm text-ink-2 hover:text-ink"
          >
            GitHub
          </a>
          <Link
            href="/scan"
            className="ml-1 rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-accent-ink"
          >
            Scan your site
          </Link>
        </nav>
      </div>
    </header>
  );
}
