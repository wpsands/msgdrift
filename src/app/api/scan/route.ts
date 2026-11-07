import { runScan } from "@/lib/engine/analyze";
import { scanRequestSchema, type ScanEvent } from "@/lib/engine/schema";
import { normalizeSiteUrl, UnsafeUrlError } from "@/lib/engine/url-safety";
import { checkScanAllowed, visitorKey } from "@/lib/ratelimit";
import { getReportStore, hashToken, newOwnerToken, newReportId } from "@/lib/storage/reports";

export const maxDuration = 300;

/**
 * POST /api/scan
 * Body: ScanRequest. Streams newline-delimited JSON ScanEvents and ends with
 * { type: "done", reportId, deleteToken } once the report is persisted. The
 * delete token is sent once, here, and only its hash is stored.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return json({ error: first?.message ?? "Invalid request.", issues: parsed.error.issues }, 400);
  }

  // Normalize and reject unsafe URLs before any work or rate-limit charge.
  try {
    parsed.data.pages = parsed.data.pages.map((p) => ({ ...p, url: normalizeSiteUrl(p.url).toString() }));
  } catch (err) {
    return json({ error: err instanceof UnsafeUrlError ? err.message : "Invalid page URL." }, 400);
  }
  const unique = new Set(parsed.data.pages.map((p) => p.url));
  if (unique.size !== parsed.data.pages.length) {
    return json({ error: "Each page URL must be unique." }, 400);
  }

  const allowed = await checkScanAllowed(visitorKey(request));
  if (allowed.blocked) {
    return json({ error: allowed.message, retryAfterSeconds: allowed.retryAfterSeconds }, 429, {
      "Retry-After": String(allowed.retryAfterSeconds),
    });
  }

  const id = newReportId();
  const deleteToken = newOwnerToken();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ScanEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // client went away
        }
      };
      try {
        const report = await runScan(parsed.data, { id, emit, signal: request.signal });
        report.ownerTokenHash = hashToken(deleteToken);
        await getReportStore().save(report);
        emit({ type: "done", reportId: id, overallScore: report.overallScore, deleteToken });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Scan failed.";
        console.error("[scan] failed", { id, message });
        emit({ type: "error", message: friendlyError(message) });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Report-Id": id,
    },
  });
}

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function friendlyError(message: string): string {
  if (/credit|budget|insufficient/i.test(message)) return "The scanner's model budget is exhausted for now. Please try again later.";
  if (/unauthorized|401|api key/i.test(message)) return "The scanner is not configured with model access. The site owner has been notified.";
  if (/aborted/i.test(message)) return "The scan was cancelled.";
  return "Something went wrong while scanning. Please try again.";
}
