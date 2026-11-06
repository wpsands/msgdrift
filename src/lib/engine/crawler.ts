import * as cheerio from "cheerio";
import { LIMITS, type PageContent } from "./schema";
import { assertPublicHost, normalizeSiteUrl, UnsafeUrlError } from "./url-safety";

/**
 * Fetches pages and extracts their meaningful copy. Ported from cli/src/msgdrift/crawler.py:
 * strip chrome (nav, footer, scripts, cookie banners), prefer <main>, join text by line.
 */

const STRIP_ELEMENTS = ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "svg", "form", "template"];

const NON_CONTENT_PATTERNS = [
  "nav",
  "navbar",
  "navigation",
  "footer",
  "sidebar",
  "menu",
  "cookie",
  "banner",
  "popup",
  "modal",
  "advertisement",
  "ad-",
  "social-share",
];

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, div, section, article, blockquote, td, th, tr, dt, dd, figcaption, summary, label, pre";

export const USER_AGENT = "msgdrift/1.0 (+https://msgdrift.com; messaging drift analysis)";

const FETCH_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface ExtractedPage {
  title: string;
  text: string;
  links: string[];
}

export function extractPage(html: string, baseUrl?: string): ExtractedPage {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();

  // Collect internal links before stripping nav and footer, since that is where they live.
  const links: string[] = [];
  if (baseUrl) {
    const base = new URL(baseUrl);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const resolved = new URL(href, base);
        if (resolved.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) return;
        if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
        resolved.hash = "";
        resolved.search = "";
        links.push(resolved.toString());
      } catch {
        // ignore malformed hrefs
      }
    });
  }

  $(STRIP_ELEMENTS.join(",")).remove();

  $("*").each((_, el) => {
    if (el.type !== "tag") return;
    const cls = ($(el).attr("class") ?? "").toLowerCase();
    const id = ($(el).attr("id") ?? "").toLowerCase();
    if (!cls && !id) return;
    const combined = `${cls} ${id}`;
    if (NON_CONTENT_PATTERNS.some((p) => combined.includes(p))) {
      $(el).remove();
    }
  });

  let target = $("main").first();
  if (!target.length) target = $("article").first();
  if (!target.length) target = $("[role=main]").first();
  if (!target.length) target = $("body");
  if (!target.length) target = $("html");

  // Mark block boundaries with newlines, pad inline controls with spaces, then read text.
  target.find(BLOCK_SELECTOR).each((_, el) => {
    $(el).prepend("\n");
    $(el).append("\n");
  });
  target.find("a, button, span, img").each((_, el) => {
    $(el).prepend(" ");
    $(el).append(" ");
  });
  target.find("br").replaceWith("\n");

  const blocks = target
    .text()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    const key = b.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(b);
  }

  return { title, text: deduped.join("\n"), links: Array.from(new Set(links)) };
}

export interface FetchResult extends PageContent {
  links: string[];
}

export async function fetchPage(rawUrl: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? LIMITS.fetchTimeoutMs;
  let url: URL;
  try {
    url = normalizeSiteUrl(rawUrl);
    await assertPublicHost(url);
  } catch (err) {
    const message = err instanceof UnsafeUrlError ? err.message : "Invalid URL";
    return { url: rawUrl, finalUrl: rawUrl, title: "", text: "", fetchStatus: 0, error: message, links: [] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    const finalUrl = response.url || url.toString();
    if (!response.ok) {
      return { url: url.toString(), finalUrl, title: "", text: "", fetchStatus: response.status, error: `HTTP ${response.status}`, links: [] };
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
      return { url: url.toString(), finalUrl, title: "", text: "", fetchStatus: response.status, error: `Not an HTML page (${contentType.split(";")[0]})`, links: [] };
    }
    // Final redirect target must also be public.
    try {
      await assertPublicHost(new URL(finalUrl));
    } catch (err) {
      const message = err instanceof UnsafeUrlError ? err.message : "Redirected to a disallowed host";
      return { url: url.toString(), finalUrl, title: "", text: "", fetchStatus: 0, error: message, links: [] };
    }
    const html = await readLimited(response, 2_000_000);
    const extracted = extractPage(html, finalUrl);
    return {
      url: url.toString(),
      finalUrl,
      title: extracted.title,
      text: extracted.text,
      fetchStatus: response.status,
      error: extracted.text.trim() ? null : "Page had no readable text (it may render entirely in JavaScript)",
      links: extracted.links,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    const message = aborted ? `Timed out after ${Math.round(timeoutMs / 1000)}s` : err instanceof Error ? err.message : "Request failed";
    return { url: url.toString(), finalUrl: url.toString(), title: "", text: "", fetchStatus: 0, error: message, links: [] };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      chunks.push(value);
      if (received >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/** Fetch several pages with a concurrency limit and polite spacing. */
export async function fetchPages(
  urls: string[],
  options: { concurrency?: number; onStart?: (url: string) => void; onDone?: (result: FetchResult) => void; signal?: AbortSignal } = {},
): Promise<FetchResult[]> {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const results: FetchResult[] = new Array(urls.length);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const index = next++;
      const url = urls[index];
      options.onStart?.(url);
      const result = await fetchPage(url, { signal: options.signal });
      results[index] = result;
      options.onDone?.(result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}
