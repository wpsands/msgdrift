# CLAUDE.md — msgdrift

## What this is

A Next.js 16 web app (App Router, TypeScript, Tailwind v4) that detects semantic messaging drift between a website's live copy and a positioning document, deployed at msgdrift.com. The original Python CLI lives in `cli/` with its own CLAUDE.md and must keep working; the two share prompts and scoring by convention.

## Where things live

- `src/lib/engine/` is the product. `prompts.ts` and `schema.ts` define the analysis contract; `analyze.ts` orchestrates; `crawler.ts` and `discover.ts` fetch and rank pages; `scoring.ts` is the weighted roll-up; `url-safety.ts` is the SSRF guard. Keep orchestration out of prompts and prompts out of orchestration.
- `src/app/api/scan/route.ts` streams newline-delimited `ScanEvent` JSON. The client in `src/components/scan-form.tsx` consumes it. Change `ScanEvent` in `schema.ts` first, then both ends.
- `src/lib/storage/reports.ts` and `src/lib/ratelimit.ts` each have a production backend (Vercel Blob, Upstash) and a local fallback. Never require the production backend for `pnpm dev`.
- `src/data/example-report.json` renders the landing card and `/example`. Keep it a valid `DriftReport`.

## Rules

- Model access goes through Vercel AI Gateway with `provider/model` strings. Fetch the live list before changing `DEFAULT_MODEL`; never type a model ID from memory.
- AI SDK and Next.js APIs: read `node_modules/ai/docs/` and `node_modules/next/dist/docs/` before writing code that uses them. Both move faster than training data.
- Cache Components is off on purpose (`cacheComponents: false` in next.config). Report pages are `force-dynamic` so a missing id returns a real 404; with Cache Components the prerendered shell always answered 200. Do not turn it back on without solving that.
- OG images load the IBM Plex TTFs in `src/app/fonts/` from disk via `src/lib/og.tsx`. Node's fetch does not support `file:` URLs, so do not switch back to the `new URL(..., import.meta.url)` pattern.
- Crawler chrome-stripping matches whole class and id tokens (`looksLikeChrome`), never substrings: `nav` must not catch `text-navy-800` or `canvas`. Hero banners are copy, so `banner` is not a chrome token.
- A page with an `error` (fetch failed, no readable text, fewer than `LIMITS.minPageChars` characters, or model output cut off twice) is "not read": no findings, excluded from `computeOverallScore`, shown as "Not read" rather than 0. The Python CLI still counts such pages as 0 and strips by substring; that divergence is documented in `cli/CLAUDE.md`.
- Example reports in `src/data/example-*.json` are real scans saved verbatim, wired through `src/lib/example.ts`. Re-run them with the scan form rather than editing the JSON by hand.
- Voice: no em or en dashes in user-facing copy, no "not X, it's Y" constructions, no agency vocabulary. Claims carry numbers or examples.
- Design: a writer's tool. White page only (no dark mode), IBM Plex Sans for UI and headlines, Plex Serif for quoted copy, Plex Mono for small labels. Layout on the 12-column `grid-12` with hairline rules, never cards, shadows, gradients, rings, icons, or animation beyond the progress pulse. One blue (`--blue`) for anything interactive or editorial; yellow (`.mark`) only to highlight a phrase. Tokens and primitives live in `src/app/globals.css`.
- Status and severity are never color alone. Severity marks carry a glyph and the word; scores carry the band name.
- URLs from visitors go through `normalizeSiteUrl` and `assertPublicHost`. Do not add a fetch path that skips them. `plainFetch` follows redirects with `redirect: "manual"` and checks every hop; never switch it back to `redirect: "follow"`, which requests internal hops before they can be checked.
- Page scores come from `scoreFromFindings` (100 minus `SEVERITY_PENALTY` per finding), not from the model. The model is not asked for a score. Reports with `scoreMethod: "findings"` use this; older reports and the two examples carry model-chosen scores. The Python CLI still uses model scores.
- Scans have two modes (`ScanRequest.mode`). `positioning` (default) needs a document. `consistency` needs no document and at least two pages: `pickBaseline` takes the site root as the reference, it is fetched but not analyzed or scored, and the report carries `mode` and `baseline`. Consistency uses `CONSISTENCY_SYSTEM_PROMPT` and `buildConsistencyPrompt`, reports conflicts only, and `keepFindings` drops omissions and findings without a homepage quote. If the homepage cannot be read the scan stops with a `ScanInputError`, whose message is shown to the visitor as is. The scan form picks the mode: an empty document box means consistency.
- `FIRECRAWL_API_KEY` enables the rendered fallback in `fetchPage` for thin or blocked pages. Only the public page URL goes to Firecrawl, never the positioning document. Without the key, behavior is the plain fetch alone.
- Tests: `pnpm test` (vitest), `pnpm typecheck`, `pnpm lint`, `pnpm build` must all pass before a commit. Bug fixes add a test.
- pnpm installs require `minimumReleaseAge: 1440` (set in `pnpm-workspace.yaml`).

## Commands

```bash
pnpm dev          # local server on :3000, reports to .msgdrift-data/
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
