import { z } from "zod";
import { discoverPages } from "@/lib/engine/discover";
import { UnsafeUrlError } from "@/lib/engine/url-safety";
import { getLimiter, SCAN_LIMITS, visitorKey } from "@/lib/ratelimit";

export const maxDuration = 60;

const bodySchema = z.object({ site: z.string().min(3).max(500) });

/** POST /api/discover  { site } -> DiscoveryResult */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Enter a website URL." }, 400);

  const limit = await getLimiter().check(`discover:v:hour:${visitorKey(request)}`, SCAN_LIMITS.discoverHourly, 3600, "discover");
  if (!limit.ok) return json({ error: "Too many lookups. Try again in a little while." }, 429);

  try {
    const result = await discoverPages(parsed.data.site);
    return json(result, 200);
  } catch (err) {
    if (err instanceof UnsafeUrlError) return json({ error: err.message }, 400);
    console.error("[discover] failed", err);
    return json({ error: "Could not read that site. Check the URL and try again." }, 502);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
