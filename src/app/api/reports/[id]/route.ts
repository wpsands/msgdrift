import { reportToMarkdown } from "@/lib/engine/markdown";
import { getReportStore, isValidOwnerToken, isValidReportId, publicReport, tokenMatches } from "@/lib/storage/reports";
import { siteUrl } from "@/lib/site";

type Context = { params: Promise<{ id: string }> };

/** GET /api/reports/:id?format=json|md */
export async function GET(request: Request, context: Context): Promise<Response> {
  const { id } = await context.params;
  if (!isValidReportId(id)) return new Response("Not found", { status: 404 });
  const stored = await getReportStore().load(id);
  if (!stored) return new Response("Not found", { status: 404 });
  const report = publicReport(stored);

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const filename = `msgdrift-${report.site}-${report.createdAt.slice(0, 10)}`;

  if (format === "md") {
    return new Response(reportToMarkdown(report, `${siteUrl()}/r/${report.id}`), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }
  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}.json"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

/**
 * DELETE /api/reports/:id with header `x-owner-token`.
 * Only the token handed to the person who ran the scan can delete the report.
 */
export async function DELETE(request: Request, context: Context): Promise<Response> {
  const { id } = await context.params;
  if (!isValidReportId(id)) return json({ error: "Not found." }, 404);
  const token = request.headers.get("x-owner-token") ?? "";
  if (!isValidOwnerToken(token)) return json({ error: "A delete token is required." }, 401);

  const store = getReportStore();
  const report = await store.load(id);
  if (!report) return json({ error: "Not found." }, 404);
  if (!tokenMatches(token, report.ownerTokenHash)) return json({ error: "That token does not match this report." }, 403);

  await store.delete(id);
  return json({ ok: true }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
