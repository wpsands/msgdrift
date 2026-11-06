import { reportToMarkdown } from "@/lib/engine/markdown";
import { EXAMPLE_REPORT } from "@/lib/example";
import { siteUrl } from "@/lib/site";

export async function GET(request: Request): Promise<Response> {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format === "md") {
    return new Response(reportToMarkdown(EXAMPLE_REPORT, `${siteUrl()}/example`), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="msgdrift-example.md"' },
    });
  }
  return new Response(JSON.stringify(EXAMPLE_REPORT, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="msgdrift-example.json"' },
  });
}
