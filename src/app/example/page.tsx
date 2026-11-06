import type { Metadata } from "next";
import { ReportView } from "@/components/report-view";
import { EXAMPLE_REPORT } from "@/lib/example";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Example report",
  description: "A full msgdrift report on a fictional company, showing how semantic drift findings read page by page.",
};

export default function ExamplePage() {
  return <ReportView report={EXAMPLE_REPORT} shareUrl={`${siteUrl()}/example`} example />;
}
