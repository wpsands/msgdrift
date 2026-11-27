import { z } from "zod";
import { draftPositioning, DraftError } from "@/lib/engine/draft";
import { UnsafeUrlError } from "@/lib/engine/url-safety";
import { checkDraftAllowed, visitorKey } from "@/lib/ratelimit";

export const maxDuration = 120;

const bodySchema = z.object({ site: z.string().min(3).max(500) });

/** POST /api/draft  { site } -> { site, label, document, pagesRead } */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Enter a website URL." }, 400);

  const allowed = await checkDraftAllowed(visitorKey(request));
  if (allowed.blocked) {
    return json({ error: allowed.message }, 429, { "Retry-After": String(allowed.retryAfterSeconds) });
  }

  try {
    const result = await draftPositioning(parsed.data.site, { signal: request.signal });
    return json(result, 200);
  } catch (err) {
    if (err instanceof UnsafeUrlError || err instanceof DraftError) return json({ error: err.message }, 400);
    console.error("[draft] failed", err instanceof Error ? err.message : err);
    return json({ error: "Could not draft a document from that site. Paste your own, or try again." }, 502);
  }
}

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
