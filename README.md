# msgdrift

**Find where your website stopped saying what you meant.**

msgdrift compares a website's live copy against the positioning document that was supposed to govern it, and reports where the copy contradicts, dilutes, or omits the message. It reads for meaning, not for matching words: a page can use none of your vocabulary and be on-message, or quote your tagline and undercut it in the next sentence.

Live at **[msgdrift.com](https://msgdrift.com)**. Free, no login, every report gets a permanent share link.

## What a report contains

- An overall alignment score (0 to 100), importance-weighted across pages: high 3x, medium 2x, low 1x.
- An executive summary that names the worst drift patterns and the one fix to make first.
- Per page: a score, a 2 to 3 sentence summary, and findings. Each finding pairs the page excerpt with the source excerpt it drifts from, a category (contradiction, omission, tone, dilution, audience-mismatch, claim-drift, framing, stale-messaging), a severity, and a plain explanation of the business impact.
- Markdown and JSON export. Report pages carry an Open Graph image with the score, so links preview well in Slack and LinkedIn.

See a full example at [msgdrift.com/example](https://msgdrift.com/example).

| Severity | Meaning |
|---|---|
| Critical | Direct contradiction of positioning, or copy aimed at a buyer you say you do not serve |
| Major | Key value proposition missing, diluted, or misframed |
| Minor | Tone inconsistency, stale phrasing, secondary messaging gap |
| Info | Not necessarily wrong, worth a human look |

## How it works

1. **Source document.** You paste a positioning doc, messaging guide, or strategy memo (200 to 20,000 characters). It is used for the scan and stored only inside the resulting report.
2. **Page discovery.** You enter a domain. The crawler fetches the homepage, collects internal links, and ranks likely messaging pages (pricing, product, solutions, about, customers) with a weight for each. You edit the list, up to 6 pages.
3. **Crawl.** Each page is fetched once with a plain HTTP request. Scripts, styles, navigation, footers, cookie banners, and similar chrome are stripped; the copy a reader sees is kept, capped at 15,000 characters per page. Private, loopback, and link-local addresses are refused, including after redirects.
4. **Analysis.** Each page is sent to Claude with the source document and a prompt that defines drift versus acceptable adaptation. The model returns structured output that is validated against a schema before anything renders.
5. **Summary and report.** A second prompt writes the executive summary. The report is stored under an unguessable ID and streamed back to the browser as it happens.

## Repository layout

```
src/
  app/                 Next.js App Router: landing, /scan, /r/[id], /example, API routes, OG images
  components/          Report view, score ring, scan form, severity badges
  lib/engine/          Prompts, schema, crawler, discovery, scoring, scan orchestration, markdown export
  lib/storage/         Report persistence (Vercel Blob, local filesystem fallback)
  lib/ratelimit.ts     Per-IP and global scan limits (Upstash Redis, in-memory fallback)
  data/                Sample positioning doc and the example report
cli/                   The original Python CLI (uv, Click, Pydantic). Same prompts, same scoring.
docs/PRD.md            Product requirements and done criteria for the web app
```

## Running locally

Requirements: Node 22 or later, pnpm.

```bash
pnpm install
cp .env.example .env.local   # then set AI_GATEWAY_API_KEY
pnpm dev
```

Without a Blob store or Redis configured, reports are written to `.msgdrift-data/` and rate limits are kept in memory, so the full flow works on a laptop.

```bash
pnpm test        # vitest unit tests (crawler, scoring, URL safety, markdown, discovery)
pnpm typecheck
pnpm lint
pnpm build
```

### Environment variables

| Variable | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for local development. On Vercel, OIDC is used automatically. |
| `SCAN_MODEL` | Model ID in `provider/model` form. Default `anthropic/claude-sonnet-5.5`. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for report storage. Optional locally. |
| `BLOB_ACCESS` | `public` (default) or `private`, matching how the store was created. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Durable rate limits. Optional locally. |
| `SCAN_LIMIT_IP_HOURLY`, `SCAN_LIMIT_IP_DAILY`, `SCAN_LIMIT_GLOBAL_DAILY` | Defaults 3, 10, 200. |
| `RATE_LIMIT_SALT` | Secret mixed into the visitor hash used for rate-limit keys. Addresses are never stored. |
| `SCAN_ZDR` | Zero data retention on the gateway provider path. Default on; `0` disables. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for share links and metadata. |

## The CLI

The original tool lives in [`cli/`](./cli) and still works for unlimited local runs with your own Anthropic key:

```bash
cd cli
uv sync
cp examples/msgdrift.example.toml msgdrift.toml
export ANTHROPIC_API_KEY=...
uv run msgdrift analyze
```

## Design notes

- **Semantic, not lexical.** The prompt tells the model what counts as drift and what is normal adaptation. Findings must quote both sides so a reader can disagree with the model.
- **Structured output as the spine.** Every model response is validated with zod before it touches the report. A malformed response degrades to a scored page with an explanation, never a crash.
- **Anonymous by default, bounded by design.** No accounts. Scans are limited per visitor (a salted hash, never the address) and globally, page count and text are capped, and only public hosts are fetched.
- **The document is not stored.** It is read once for the scan. The report keeps only the sentences it quotes. The browser that ran the scan gets a delete token; only its hash is stored, and `DELETE /api/reports/:id` with that token removes the report. Model calls request zero data retention on the gateway provider path. Full text at [`/privacy`](https://msgdrift.com/privacy).
- **One engine, two surfaces.** The TypeScript engine mirrors the Python CLI's prompts and scoring so reports are comparable.

## Roadmap

Scheduled re-scans to track drift over time, saved history behind an account, PDF export, and a GitHub Action that fails a docs build when positioning and site diverge. Open an issue if one of these would change how you work.

## Author

Built by [Page Sands](https://pagesands.com), founder of [SandsDX](https://sandsdx.com), a fractional GTM practice for B2B SaaS. MIT licensed.
