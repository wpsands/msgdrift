# msgdrift.com — Product Requirements

Status: v1 build. Decisions taken 2026-11-06 with Page Sands.

## Goal

Turn the msgdrift CLI into a public web app at msgdrift.com that works as an
elite portfolio piece: a visitor pastes a positioning document, enters a site,
and gets a shareable semantic drift report in under two minutes with no login.

## Decisions

| Area | Decision |
|---|---|
| Access | Free, no login. Server-side model key behind per-IP and global rate limits. Every scan produces a permanent shareable report URL. |
| Stack | Next.js App Router + TypeScript. AI SDK via Vercel AI Gateway (`anthropic/claude-sonnet-5.5`). Node.js runtime on Fluid Compute. |
| Storage | Vercel Blob for report JSON (unguessable IDs). Upstash Redis for rate limits. Filesystem and in-memory fallbacks for local dev. |
| Brand | Own product identity with a "Built by Page Sands / SandsDX" credit. |
| Repo | github.com/wpsands/msgdrift. Web app at root, Python CLI preserved under `cli/`. |
| Domain | msgdrift.com (owned, Namecheap). Attach to the Vercel project and point DNS. |

## User flow

1. Landing page explains the problem, shows a real example report, and has one
   primary action: "Scan your site".
2. Scan form: paste or drop a positioning doc (markdown or text, max 20k chars),
   enter a site URL.
3. Page discovery: the app fetches the homepage, finds internal links, ranks
   likely messaging pages (home, pricing, product, solutions, about, customers),
   and proposes up to 6 with importance weights. The visitor can edit the list.
4. Scan runs with live streaming progress: fetching each page, analyzing each
   page, writing the executive summary.
5. Report page at `/r/[id]`: overall score, severity counts, executive summary,
   per-page cards with findings (page excerpt vs source excerpt, explanation,
   category, severity). Share link, copy markdown, download JSON.
6. Report pages have Open Graph images with the score so links preview well.

## Engine (ported from the Python CLI, behavior preserved)

- Crawler strips script, style, nav, footer, header, aside, noscript, iframe,
  svg, form, and elements whose class or id matches non-content patterns.
  Prefers `main`, `article`, or `role=main`. Page text capped at 15k chars.
- Per-page analysis uses the existing system and analysis prompts with
  structured output validated by a zod schema. Findings carry severity
  (critical, major, minor, info), category, page excerpt, source excerpt,
  explanation. Page gets a summary and 0-100 alignment score.
- Overall score is importance-weighted: high 3x, medium 2x, low 1x.
- Executive summary prompt unchanged.
- Pages that fail to fetch score 0 with a "could not analyze" summary.

## Abuse and cost controls

- Per-IP limit: 3 scans per hour, 10 per day.
- Global cap: 200 scans per day across all visitors.
- Max 6 pages per scan, 20k chars of source doc, 15k chars of page text.
- Only public http(s) URLs. Private and loopback address ranges rejected.
- AI Gateway budget set on the project key.

## Done criteria

- [ ] `pnpm build` and `pnpm test` pass with no type errors.
- [ ] Local scan of a real site produces a report that matches the CLI's
      structure and scoring.
- [ ] Production deploy on Vercel serves msgdrift.com over HTTPS.
- [ ] A visitor with no account can complete a scan and open the share link in
      a private window.
- [ ] Rate limits return a clear message instead of a 500.
- [ ] Report share links render an OG image with the score.
- [ ] Landing page shows an example report without running a scan.
- [ ] Lighthouse performance and accessibility at or above 90 on the landing
      page.
- [ ] README documents the architecture, the CLI, and how to run locally.

## Out of scope for v1

Accounts, scan history, scheduled re-scans, PDF export, team sharing, paid
plans. These are listed on the roadmap in the README.
