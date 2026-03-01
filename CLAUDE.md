# CLAUDE.md — msgdrift

## What this project is

msgdrift is a CLI agent that detects when a website's live copy has drifted from
its canonical messaging and positioning documents. It fetches web pages, extracts
their textual content, and uses Claude to perform structured semantic comparison
against source-of-truth documents — producing actionable drift reports.

This is not a spellchecker or a simple diff tool. Messaging drift is a semantic
problem: a page can use completely different words and still be on-message, or it
can use the exact same vocabulary in a way that undermines the positioning. The
agent must reason about intent, audience, and tone — not just surface text.

## Architecture decisions and why they were made

**src layout, not flat.**  The `src/msgdrift/` layout prevents accidental imports
from the working directory during development. This matters because the test suite
and the CLI both import from the package, and ambient imports cause subtle bugs
that only surface in CI or after packaging.

**Pydantic models as the spine.**  Every boundary in the system — config input,
crawl results, analysis output, report data — is a Pydantic model. This is not
ceremonial typing. It means malformed API responses and bad config fail loudly at
parse time instead of propagating silently into reports. When Claude returns a
drift finding, we validate its structure before it ever touches report generation.

**Prompts live in `prompts.py`, not in agent logic.**  Prompt engineering is an
iterative, testable concern. Mixing prompt templates into orchestration code makes
both harder to modify. Keeping them separate means you can unit test prompt
construction without invoking the LLM, and you can tune prompts without touching
control flow.

**httpx over requests.**  httpx supports async natively and has a cleaner API for
timeouts and retries. Since website fetching is I/O-bound and we may crawl dozens
of pages, async capability matters. Even if the initial implementation is sync,
the migration path is already clean.

**Click for the CLI.**  Click produces correct POSIX-style help output, handles
argument validation, and composes well for future subcommands. argparse is
adequate but requires more boilerplate for the same quality of UX.

**Rich for terminal output.**  A drift report with severity levels, page URLs,
and quoted passages needs structured formatting. Rich handles tables, colored
severity indicators, and markdown rendering in the terminal without custom ANSI
escape code management.

## Development

```bash
# Install with dev dependencies (use uv — it's fast and deterministic)
uv sync

# Run the agent
uv run msgdrift analyze --config msgdrift.toml

# Run tests
uv run pytest

# Run linting
uv run ruff check src/ tests/
uv run ruff format --check src/ tests/

# Type checking
uv run pyright src/
```

## Testing philosophy

Tests validate behavior, not implementation. The right question is "does
`extract_text` return clean prose from this HTML?" — not "does it call
BeautifulSoup with these arguments?"

**Fixtures over factories for static data.** HTML samples and positioning doc
snippets live as fixtures because they represent real-world inputs that don't
vary. Factories are for when you need controlled variation across tests.

**Mock the network, not the analysis.** HTTP calls are mocked to avoid flaky
tests and rate limits. But the prompt construction and model-output parsing paths
run against real data shapes because that's where the actual bugs live.

**No snapshot tests for LLM output.** Claude's responses are non-deterministic.
Test that the output parses correctly and contains required fields — never test
for exact string matches against model output.

## Code style

- Ruff for linting and formatting. No exceptions, no per-file overrides.
- Type annotations on all public function signatures. Internal helpers can use
  inference when the types are obvious.
- No bare `except`. Catch specific exceptions. If you don't know what exception
  to catch, that's a sign you don't understand the failure mode yet.
- Docstrings on modules and public functions only. Don't document what the
  signature already says. `def fetch_page(url: str) -> PageContent` does not need
  a docstring that says "Fetches a page given a URL and returns page content."
- f-strings over `.format()`. No `%` formatting.

## Domain concepts to understand

**Messaging document**: The canonical source of truth — typically a PDF or
markdown file that defines value propositions, key phrases, target audience
language, tone guidelines, and competitive differentiation points.

**Positioning document**: Defines where the product/company sits in the market
relative to alternatives. Overlaps with messaging but focuses on competitive
framing and category definition.

**Drift**: A semantic gap between what the source documents say the messaging
should be and what the website actually communicates. Drift has severity:

- **Critical**: The website contradicts the positioning (e.g., claims the product
  is "enterprise-grade" when positioning targets SMBs).
- **Major**: Key value propositions are missing or diluted on important pages.
- **Minor**: Tone inconsistencies, outdated phrasing, or secondary messaging
  that's gone stale.
- **Info**: Observations that aren't necessarily wrong but worth reviewing.

**Page importance**: Not all pages drift equally. The homepage and pricing page
drifting is a bigger problem than a year-old blog post. The agent weights
findings by page importance when scoring overall drift.

## Things to watch out for

- **Rate limiting**: When crawling, add sensible delays between requests. Don't
  hammer a site with 50 concurrent fetches. Default to 2 concurrent requests with
  a 1-second delay between batches.
- **Token budget**: Positioning documents can be long. The agent chunks content
  when needed rather than stuffing everything into a single prompt. Prefer
  precision (analyze fewer pages well) over coverage (analyze everything poorly).
- **HTML extraction quality**: Raw `soup.get_text()` produces garbage. The
  crawler strips nav, footer, script, style, and other non-content elements
  before extracting text. Test this against real-world HTML.
- **Config validation**: Fail early with clear errors. "File not found:
  positioning.md" is better than a traceback three function calls deep.
