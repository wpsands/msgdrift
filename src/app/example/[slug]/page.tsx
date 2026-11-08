import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { EXAMPLES, findExample } from "@/lib/example";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ex = findExample(slug);
  if (!ex) return { title: "Example report" };
  return {
    title: `${ex.company} example report`,
    description: `${ex.report.site} read against its own public positioning. ${ex.report.pages.length} pages, overall ${Math.round(ex.report.overallScore)} of 100.`,
  };
}

export default async function ExampleReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ex = findExample(slug);
  if (!ex) notFound();

  return (
    <>
      <aside className="page pt-12 sm:pt-16">
        <div className="grid-12 gap-y-6 border-l-2 border-blue pl-5 lg:-ml-5">
          <div className="col-span-12 lg:col-span-7">
            <p className="label">About this example</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{ex.source.summary}</p>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="label">Sources for the positioning document</p>
            <ul className="mt-3 space-y-1 text-[15px]">
              {ex.source.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="link" target="_blank" rel="noopener noreferrer">{l.label}</a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Other example: {EXAMPLES.filter((e) => e.slug !== ex.slug).map((e) => (
                <Link key={e.slug} href={`/example/${e.slug}`} className="link">{e.company}</Link>
              ))}
            </p>
          </div>
        </div>
      </aside>
      <ReportView
        report={ex.report}
        shareUrl={`${siteUrl()}/example/${ex.slug}`}
        example
        exampleNote="Example. Public company, public positioning, real scan."
        downloadBase={`/api/example?slug=${ex.slug}`}
      />
    </>
  );
}
