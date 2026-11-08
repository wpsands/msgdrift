import { reportToMarkdown } from "@/lib/engine/markdown";
import { EXAMPLES, findExample } from "@/lib/example";
import { siteUrl } from "@/lib/site";

/** GET /api/example?slug=hubspot&format=md|json. Defaults to the featured example as JSON. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const format = params.get("format") ?? "json";
  const example = findExample(params.get("slug") ?? EXAMPLES[0].slug);
  if (!example) {
    return new Response(JSON.stringify({ error: "No such example." }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const shareUrl = `${siteUrl()}/example/${example.slug}`;
  if (format === "md") {
    return new Response(reportToMarkdown(example.report, shareUrl), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="msgdrift-${example.slug}.md"` },
    });
  }
  return new Response(JSON.stringify(example.report, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="msgdrift-${example.slug}.json"` },
  });
}
