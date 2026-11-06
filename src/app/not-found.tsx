import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page grid-12 py-24">
      <div className="col-span-12 md:col-span-7">
        <p className="label">404</p>
        <h1 className="h-section mt-4">Nothing on this page.</h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-2">
          Reports live at their share link only. If someone sent you one and it is gone, ask them to run the scan again.
        </p>
        <div className="mt-8 flex gap-6">
          <Link href="/scan" className="btn">Scan a site</Link>
          <Link href="/" className="link self-center">Home</Link>
        </div>
      </div>
    </div>
  );
}
