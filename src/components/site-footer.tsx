import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-sm">
            Semantic messaging drift detection, built on Claude. Open source under MIT. Reports contain only the pages you
            scanned and the document you pasted. Nothing is stored beyond the report itself.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:text-right">
          <Link href="/scan" className="hover:text-ink">Scan your site</Link>
          <Link href="/example" className="hover:text-ink">Example report</Link>
          <a href="https://github.com/wpsands/msgdrift" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
          <a href="https://github.com/wpsands/msgdrift/tree/main/cli" target="_blank" rel="noopener noreferrer" className="hover:text-ink">Python CLI</a>
          <a href="https://sandsdx.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink">Built by Page Sands, SandsDX</a>
          <a href="https://pagesands.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink">pagesands.com</a>
        </div>
      </div>
    </footer>
  );
}
