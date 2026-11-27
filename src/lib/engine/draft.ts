import { generateText } from "ai";
import { DEFAULT_MODEL, gatewayOptions } from "./analyze";
import { fetchPage, type FetchResult } from "./crawler";
import { rankCandidates } from "./discover";
import { buildDraftPositioningPrompt, type DraftPage } from "./prompts";
import { LIMITS } from "./schema";
import { normalizeSiteUrl } from "./url-safety";

/**
 * Draft a positioning document from a site's homepage and its most authoritative
 * pages, for visitors who arrive without one. The visitor edits the draft before
 * scanning; the scan itself is unchanged.
 */

/** Characters of each page sent to the model. The homepage carries the most weight. */
const DRAFT_PAGE_CHARS = 8_000;
/** Extra pages read besides the homepage. */
const DRAFT_EXTRA_PAGES = 2;
/** Labels from discovery worth reading for positioning, in order of preference. */
const DRAFT_LABELS = ["About", "Why us", "Product", "Solutions", "Services", "Features"];

export class DraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftError";
  }
}

export interface DraftResult {
  site: string;
  label: string;
  document: string;
  pagesRead: string[];
}

/** Pick the extra pages to read from the homepage's ranked links. Pure, for tests. */
export function pickDraftPages(links: string[], origin: URL): string[] {
  const ranked = rankCandidates(links, origin);
  const picked: string[] = [];
  for (const label of DRAFT_LABELS) {
    const match = ranked.find((c) => c.label === label && !picked.includes(c.url));
    if (match) picked.push(match.url);
    if (picked.length >= DRAFT_EXTRA_PAGES) break;
  }
  return picked;
}

export async function draftPositioning(rawSite: string, options: { model?: string; signal?: AbortSignal } = {}): Promise<DraftResult> {
  const site = normalizeSiteUrl(rawSite);
  const home = await fetchPage(site.toString(), { signal: options.signal });
  if (home.error || home.text.trim().length < LIMITS.minPageChars) {
    throw new DraftError(`The homepage could not be read well enough to draft from (${home.error ?? "too little text"}).`);
  }
  const origin = new URL(home.finalUrl || site.toString());
  const extras = await Promise.all(pickDraftPages(home.links, origin).map((url) => fetchPage(url, { signal: options.signal })));
  const readable = [home, ...extras].filter((p: FetchResult) => !p.error && p.text.trim().length >= LIMITS.minPageChars);

  const pages: DraftPage[] = readable.map((p) => ({ url: p.finalUrl || p.url, title: p.title, text: p.text.slice(0, DRAFT_PAGE_CHARS) }));
  const host = origin.hostname.replace(/^www\./, "");

  const { text } = await generateText({
    model: options.model ?? process.env.SCAN_MODEL ?? DEFAULT_MODEL,
    prompt: buildDraftPositioningPrompt(host, pages),
    temperature: 0.2,
    maxOutputTokens: 2048,
    abortSignal: options.signal,
    providerOptions: gatewayOptions(),
  });
  const document = text.trim().slice(0, LIMITS.maxSourceChars);
  if (document.length < LIMITS.minSourceChars) throw new DraftError("The draft came back too short to use. Try again.");

  return { site: host, label: `draft-from-${host}.txt`, document, pagesRead: pages.map((p) => p.url) };
}
