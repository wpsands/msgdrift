import type { Metadata } from "next";
import { DeleteReportForm } from "./delete-form";

export const metadata: Metadata = { title: "Delete report", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function DeleteReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="page grid-12 py-16 sm:py-24">
      <div className="col-span-12 md:col-span-7">
        <p className="label">Delete report</p>
        <h1 className="h-section mt-4">Delete this report permanently.</h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-2">
          This link carries the delete token for report <span className="font-mono">{id}</span>. Deleting removes the stored
          report and breaks its share link. There is no undo.
        </p>
        <DeleteReportForm reportId={id} />
      </div>
    </div>
  );
}
