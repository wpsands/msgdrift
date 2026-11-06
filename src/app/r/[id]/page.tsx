import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportView } from "@/components/report-view";
import { bandLabel } from "@/components/score-ring";
import { getReportStore, isValidReportId } from "@/lib/storage/reports";
import { siteUrl } from "@/lib/site";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if (!isValidReportId(id)) return { title: "Report not found" };
  const report = await getReportStore().load(id);
  if (!report) return { title: "Report not found", robots: { index: false } };
  const score = Math.round(report.overallScore);
  const title = `${report.site}: ${score}/100, ${bandLabel(report.overallScore)}`;
  const description = report.executiveSummary.slice(0, 200);
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: `${title} · msgdrift`, description, url: `${siteUrl()}/r/${id}`, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} · msgdrift`, description },
  };
}

export default function ReportPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportLoader params={params} />
    </Suspense>
  );
}

async function ReportLoader({ params }: { params: Params }) {
  const { id } = await params;
  if (!isValidReportId(id)) notFound();
  const report = await getReportStore().load(id);
  if (!report) notFound();
  return <ReportView report={report} shareUrl={`${siteUrl()}/r/${id}`} />;
}

function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-14 sm:px-6" aria-busy="true" aria-live="polite">
      <div className="grid gap-8 md:grid-cols-[auto_1fr]">
        <div className="h-[168px] w-[168px] rounded-full border-[10px] border-line" />
        <div className="space-y-4">
          <div className="h-3 w-24 rounded bg-surface-2" />
          <div className="h-10 w-64 rounded bg-surface-2" />
          <div className="h-3 w-80 rounded bg-surface-2" />
          <div className="h-8 w-full rounded bg-surface-2" />
        </div>
      </div>
      <div className="card mt-10 h-32" />
      <p className="sr-only">Loading report</p>
    </div>
  );
}
