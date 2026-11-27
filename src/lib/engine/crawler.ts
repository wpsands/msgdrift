import * as cheerio from "cheerio";
import { LIMITS, type PageContent } from "./schema";
import { assertPublicHost, normalizeSiteUrl, UnsafeUrlError } from "./url-safety";

/**
 * Fetches pages and extracts their meaningful copy. Ported from cli/src/msgdrift/crawler.py:
 * strip chrome (nav, footer, scripts, cookie banners), prefer <main>, join text by line.
 */

const STRIP_ELEMENTS = ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "svg", "form", "template"];

/**
 * Class and id tokens that mark page chrome rather than copy. Matched as whole
 * tokens, never substrings: "nav" must not catch "navy" or "canvas", and
 * "banner" is left alone because hero banners are the copy we want.
 */
const NON_CONTENT_TOKENS = new Set([
  "nav",
  "navbar",
  "navigation",
  "breadcrumb",
  "breadcrumbs",
  "footer",
  "sidebar",
  "menu",
  "megamenu",
  "cookie",
  "cookies",
  "consent",
  "popup",
  "modal",
  "advertisement",
  "ad",
  "ads",
  "skip",
]);

/** Splits "site-nav lg:text-navy-800 mainMenu" into lowercase tokens: site, nav, lg, text, navy, 800, main, menu. */
export function classTokens(value: string): string[] {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function looksLikeChrome(cls: string, id: string): boolean {
  return classTokens(`${cls} ${id}`).some((t) => NON_CONTENT_TOKENS.has(t));
}

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
    // Never strip the content root or anything that contains it.
    if (el.tagName === "main" || el.tagName === "body" || el.tagName === "html" || $(el).find("main").length) return;
    const cls = $(el).attr("class") ?? "";
    const id = $(el).attr("id") ?? "";
    if (!cls && !id) return;
    if (looksLikeChrome(cls, id)) $(el).remove();
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

export const MAX_REDIRECTS = 5;

/** Statuses that usually mean a bot wall rather than a missing page. Worth a rendered retry. */
const BLOCKED_STATUSES = new Set([401, 403, 429, 503]);

export async function fetchPage(rawUrl: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<FetchResult> {
  let url: URL;
  try {
    url = normalizeSiteUrl(rawUrl);
    await assertPublicHost(url);
  } catch (err) {
    const message = err instanceof UnsafeUrlError ? err.message : "Invalid URL";
    return { url: rawUrl, finalUrl: rawUrl, title: "", text: "", fetchStatus: 0, error: message, links: [] };
  }

  const plain = await plainFetch(url, options);
  if (!needsRender(plain) || !renderConfigured()) return plain;

  const rendered = await renderPage(new URL(plain.finalUrl || url.toString()), options);
  // Keep whichever result has more readable copy, so a failed render never hides a usable plain fetch.
  if (rendered.text.trim().length > plain.text.trim().length) return rendered;
  return plain;
}

/**
 * A plain fetch result is worth a rendered retry when it came back blocked, timed
 * out, or with too little copy to judge. Refused URLs and non-HTML responses are final.
 */
export function needsRender(result: FetchResult): boolean {
  const error = result.error ?? "";
  if (/timed out/i.test(error)) return true;
  if (result.fetchStatus === 0) return false;
  if (/^Not an HTML page/.test(error)) return false;
  if (BLOCKED_STATUSES.has(result.fetchStatus)) return true;
  if (result.fetchStatus >= 200 && result.fetchStatus < 300) return result.text.trim().length < LIMITS.minPageChars;
  return false;
}

/**
 * Fetch with redirects followed by hand, so every hop is checked against private
 * and internal ranges before it is requested. With automatic redirects, an
 * internal hop would be requested before the final address could be checked.
 */
async function plainFetch(url: URL, options: { timeoutMs?: number; signal?: AbortSignal }): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? LIMITS.fetchTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const fail = (finalUrl: string, fetchStatus: number, error: string): FetchResult => ({
    url: url.toString(),
    finalUrl,
    title: "",
    text: "",
    fetchStatus,
    error,
    links: [],
  });

  try {
    let current = url;
    let response: Response;
    for (let hop = 0; ; hop++) {
      response = await fetch(current, { headers: FETCH_HEADERS, redirect: "manual", signal: controller.signal });
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      await response.body?.cancel().catch(() => {});
      if (hop >= MAX_REDIRECTS) return fail(current.toString(), 0, `Too many redirects (more than ${MAX_REDIRECTS})`);
      let next: URL;
      try {
        next = normalizeSiteUrl(new URL(location, current).toString());
        await assertPublicHost(next);
      } catch (err) {
        const message = err instanceof UnsafeUrlError ? `Redirect refused: ${err.message}` : "Redirected to a disallowed address";
        return fail(current.toString(), 0, message);
      }
      current = next;
    }

    const finalUrl = current.toString();
    if (!response.ok) return fail(finalUrl, response.status, `HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
      return fail(finalUrl, response.status, `Not an HTML page (${contentType.split(";")[0]})`);
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
    return fail(url.toString(), 0, message);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export function renderConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

/**
 * Rendered fetch through Firecrawl for pages whose copy is drawn by JavaScript or
 * sits behind a bot wall. The browser runs on Firecrawl's side, so it never
 * touches our network, and the URL has already passed the public-host checks.
 * Only the public page URL is sent; the positioning document never goes to Firecrawl.
 */
export async function renderPage(url: URL, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<FetchResult> {
  const timeoutMs = (options.timeoutMs ?? LIMITS.fetchTimeoutMs) + 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const base = { url: url.toString(), finalUrl: url.toString(), title: "", text: "", links: [] as string[] };

  try {
    const response = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.toString(), formats: ["markdown", "links"], onlyMainContent: true, timeout: LIMITS.fetchTimeoutMs }),
      signal: controller.signal,
    });
    if (!response.ok) return { ...base, fetchStatus: 0, error: `Rendered fetch failed (HTTP ${response.status})` };
    const body = (await response.json()) as {
      data?: { markdown?: string; links?: string[]; metadata?: { title?: string; sourceURL?: string; url?: string; statusCode?: number } };
    };
    const data = body.data ?? {};
    const status = data.metadata?.statusCode ?? 200;
    const finalUrl = data.metadata?.url ?? data.metadata?.sourceURL ?? url.toString();
    if (status >= 400) return { ...base, finalUrl, fetchStatus: status, error: `HTTP ${status}` };
    const text = markdownToText(data.markdown ?? "");
    const host = url.hostname.replace(/^www\./, "");
    const links = (data.links ?? []).flatMap((l) => {
      try {
        const u = new URL(l);
        if (u.protocol !== "http:" && u.protocol !== "https:") return [];
        if (u.hostname.replace(/^www\./, "") !== host) return [];
        u.hash = "";
        u.search = "";
        return [u.toString()];
      } catch {
        return [];
      }
    });
    return {
      url: url.toString(),
      finalUrl,
      title: data.metadata?.title ?? "",
      text,
      fetchStatus: status,
      error: text.trim() ? null : "Page had no readable text, even after rendering",
      links: Array.from(new Set(links)),
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ...base, fetchStatus: 0, error: aborted ? "Rendered fetch timed out" : "Rendered fetch failed" };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/** Flatten Firecrawl markdown to the same one-block-per-line text the HTML extractor produces. */
export function markdownToText(markdown: string): string {
  const lines = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/, "")
        .replace(/\*\*|__|`/g, "")
        .replace(/\|/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line && !/^[-=:*_\s]+$/.test(line));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.join("\n");
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
