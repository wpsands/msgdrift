import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { bandLabel } from "@/components/score-ring";
import { getReportStore, isValidReportId } from "@/lib/storage/reports";
import { siteUrl } from "@/lib/site";

type Params = Promise<{ id: string }>;

/** Fully dynamic: the report is the whole page, and a missing id must be a real 404. */
export const dynamic = "force-dynamic";

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

export default async function ReportPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!isValidReportId(id)) notFound();
  const report = await getReportStore().load(id);
  if (!report) notFound();
  return <ReportView report={report} shareUrl={`${siteUrl()}/r/${id}`} />;
}
