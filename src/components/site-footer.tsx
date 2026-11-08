import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink">
      <div className="page grid-12 gap-y-10 py-14 text-[15px]">
        <div className="col-span-12 md:col-span-5">
          <Wordmark className="text-[19px]" />
          <p className="mt-4 max-w-sm leading-relaxed text-ink-2">
            A tool for checking a website against the document that was supposed to govern it. Open source, MIT. Your document
            is read once and not saved; reports keep only the sentences they quote.{" "}
            <Link href="/privacy" className="link">Privacy</Link>.
          </p>
        </div>
        <dl className="col-span-6 md:col-span-3 md:col-start-7">
          <dt className="label">Pages</dt>
          <dd className="mt-3 flex flex-col gap-2">
            <Link href="/scan" className="hover:text-blue">Scan a site</Link>
            <Link href="/example" className="hover:text-blue">Example reports</Link>
            <Link href="/method" className="hover:text-blue">Method</Link>
            <a href="https://github.com/wpsands/msgdrift" target="_blank" rel="noopener noreferrer" className="hover:text-blue">Source on GitHub</a>
            <a href="https://github.com/wpsands/msgdrift/tree/main/cli" target="_blank" rel="noopener noreferrer" className="hover:text-blue">Command line version</a>
          </dd>
        </dl>
        <dl className="col-span-6 md:col-span-3">
          <dt className="label">Made by</dt>
          <dd className="mt-3 flex flex-col gap-2">
            <a href="https://pagesands.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue">Page Sands</a>
            <a href="https://sandsdx.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue">SandsDX</a>
            <span className="text-muted">Charleston, South Carolina</span>
          </dd>
        </dl>
      </div>
    </footer>
  );
}
