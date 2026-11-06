import { fetchPage } from "./crawler";
import { LIMITS, type PageImportance } from "./schema";
import { normalizeSiteUrl } from "./url-safety";

/**
 * Page discovery: given a site URL, fetch the homepage, read its internal links,
 * and propose the pages most likely to carry positioning. The visitor edits the
 * proposal before scanning.
 */

export interface SuggestedPage {
  url: string;
  label: string;
  importance: PageImportance;
  reason: string;
}

export interface DiscoveryResult {
  site: string;
  siteTitle: string;
  homepageError: string | null;
  suggestions: SuggestedPage[];
  candidates: number;
}

interface Rule {
  pattern: RegExp;
  label: string;
  importance: PageImportance;
  weight: number;
}

const RULES: Rule[] = [
  { pattern: /^\/(pricing|plans)\/?$/i, label: "Pricing", importance: "high", weight: 100 },
  { pattern: /^\/(product|products|platform)\/?$/i, label: "Product", importance: "high", weight: 95 },
  { pattern: /^\/(solutions?)\/?$/i, label: "Solutions", importance: "high", weight: 90 },
  { pattern: /^\/(services?)\/?$/i, label: "Services", importance: "high", weight: 88 },
  { pattern: /^\/(features?|capabilities)\/?$/i, label: "Features", importance: "medium", weight: 85 },
  { pattern: /^\/(why|why-[a-z0-9-]+)\/?$/i, label: "Why us", importance: "high", weight: 84 },
  { pattern: /^\/(about|about-us|company)\/?$/i, label: "About", importance: "medium", weight: 80 },
  { pattern: /^\/(customers|case-studies|stories|success-stories)\/?$/i, label: "Customers", importance: "medium", weight: 75 },
  { pattern: /^\/(use-cases?)\/?$/i, label: "Use cases", importance: "medium", weight: 72 },
  { pattern: /^\/(enterprise)\/?$/i, label: "Enterprise", importance: "medium", weight: 70 },
  { pattern: /^\/(product|products|platform|solutions?|services?)\/[a-z0-9-]+\/?$/i, label: "", importance: "medium", weight: 60 },
  { pattern: /^\/(compare|vs|alternatives?)(\/|$)/i, label: "Comparison", importance: "medium", weight: 58 },
  { pattern: /^\/(integrations?)\/?$/i, label: "Integrations", importance: "low", weight: 55 },
  { pattern: /^\/(security|trust)\/?$/i, label: "Security", importance: "low", weight: 50 },
  { pattern: /^\/(contact|demo|get-started|signup|sign-up|login|book)/i, label: "", importance: "low", weight: -100 },
  { pattern: /^\/(blog|news|press|careers|jobs|legal|privacy|terms|docs|documentation|help|support|changelog|events|webinars|resources)(\/|$)/i, label: "", importance: "low", weight: -100 },
];

export async function discoverPages(rawSite: string): Promise<DiscoveryResult> {
  const site = normalizeSiteUrl(rawSite);
  const home = await fetchPage(site.toString());
  const siteOrigin = new URL(home.finalUrl || site.toString());

  const suggestions: SuggestedPage[] = [
    { url: home.finalUrl || site.toString(), label: "Homepage", importance: "high", reason: "Primary landing page" },
  ];

  if (home.error && !home.links.length) {
    return { site: siteOrigin.origin, siteTitle: home.title, homepageError: home.error, suggestions, candidates: 0 };
  }

  const ranked = rankCandidates(home.links, siteOrigin);
  for (const c of ranked.slice(0, LIMITS.maxPages - 1)) suggestions.push(c);

  return { site: siteOrigin.origin, siteTitle: home.title, homepageError: home.error, suggestions, candidates: ranked.length };
}

/** Rank internal links by how likely they are to carry positioning. Pure, for tests. */
export function rankCandidates(links: string[], siteOrigin: URL): SuggestedPage[] {
  type Scored = { score: number; label: string; importance: PageImportance; reason: string };
  const scored = new Map<string, Scored>();
  const host = siteOrigin.hostname.replace(/^www\./, "");

  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      continue;
    }
    if (url.hostname.replace(/^www\./, "") !== host) continue;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") continue;
    if (/\.(pdf|png|jpe?g|gif|svg|zip|mp4|webp|ico|xml|json|css|js)$/i.test(path)) continue;
    const depth = path.split("/").filter(Boolean).length;

    let best: Scored | null = null;
    for (const rule of RULES) {
      if (!rule.pattern.test(path)) continue;
      const label = rule.label || humanize(path);
      const candidate: Scored = { score: rule.weight, label, importance: rule.importance, reason: `Matched ${label.toLowerCase()} pattern` };
      if (!best || candidate.score > best.score) best = candidate;
    }
    if (!best) {
      if (depth > 1) continue;
      best = { score: 20 - depth * 5, label: humanize(path), importance: "low", reason: "Top-level page linked from homepage" };
    }
    if (best.score < 0) continue;

    const key = `${siteOrigin.protocol}//${host}${path}`;
    const existing = scored.get(key);
    if (!existing || existing.score < best.score) scored.set(key, best);
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([url, meta]) => ({ url, label: meta.label, importance: meta.importance, reason: meta.reason }));
}

export function humanize(path: string): string {
  const last = path.split("/").filter(Boolean).pop() ?? "";
  const words = last.replace(/[-_]+/g, " ").trim();
  if (!words) return "Page";
  return words.charAt(0).toUpperCase() + words.slice(1);
}
