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
- Cache Components is on. Any component that reads request-time or stored data must sit inside a `<Suspense>` boundary, or the route must export `instant = false` to render as a blocking route (the report page does this so missing reports return a real 404).
- OG images load `src/app/fonts/InstrumentSerif-Regular.ttf` from disk via `src/lib/og.tsx`. Node's fetch does not support `file:` URLs, so do not switch back to the `new URL(..., import.meta.url)` pattern.
- Voice: no em or en dashes in user-facing copy, no "not X, it's Y" constructions, no agency vocabulary. Claims carry numbers or examples.
- Status and severity are never color alone. Every badge carries a label and icon.
- URLs from visitors go through `normalizeSiteUrl` and `assertPublicHost`. Do not add a fetch path that skips them.
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
