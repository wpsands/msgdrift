import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="page flex h-16 items-center justify-between">
        <Link href="/" className="text-[19px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6 text-[15px]">
          <Link href="/#how" className="hidden text-ink-2 hover:text-blue sm:inline">How it works</Link>
          <Link href="/example" className="hidden text-ink-2 hover:text-blue sm:inline">Example</Link>
          <a href="https://github.com/wpsands/msgdrift" target="_blank" rel="noopener noreferrer" className="hidden text-ink-2 hover:text-blue sm:inline">
            Source
          </a>
          <Link href="/scan" className="btn btn-sm">
            Scan a site
          </Link>
        </nav>
      </div>
    </header>
  );
}
