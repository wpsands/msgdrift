import { reportToMarkdown } from "@/lib/engine/markdown";
import { getReportStore, isValidReportId } from "@/lib/storage/reports";
import { siteUrl } from "@/lib/site";

/** GET /api/reports/:id?format=json|md */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  if (!isValidReportId(id)) return new Response("Not found", { status: 404 });
  const report = await getReportStore().load(id);
  if (!report) return new Response("Not found", { status: 404 });

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const filename = `msgdrift-${report.site}-${report.createdAt.slice(0, 10)}`;

  if (format === "md") {
    return new Response(reportToMarkdown(report, `${siteUrl()}/r/${report.id}`), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}.json"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
