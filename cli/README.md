# msgdrift

Detect when your website messaging drifts from your positioning documents.

msgdrift is a CLI tool that uses Claude to perform **semantic analysis** of your website's live copy against your canonical messaging and positioning documents. It catches contradictions, omissions, tone shifts, and diluted value propositions — the kind of drift that word-level diffing can't see.

## The Problem

Marketing websites evolve through dozens of hands — product launches, design refreshes, A/B tests, blog posts, new hires writing copy. Over time, the live site drifts from the positioning your team carefully defined. Pages start contradicting each other. Key value props get diluted. The tone shifts without anyone noticing.

By the time someone spots it, the drift is everywhere.

## What msgdrift Does

1. **Reads your source-of-truth documents** — messaging guides, positioning docs, brand guidelines
2. **Fetches your website pages** — homepage, pricing, about, landing pages
3. **Analyzes semantic alignment** — using Claude to reason about meaning, not just match keywords
4. **Produces a drift report** — with severity levels, specific excerpts, and an overall alignment score

## Quick Start

```bash
# Install
uv add msgdrift

# Create a config file (see examples/msgdrift.example.toml)
cp examples/msgdrift.example.toml msgdrift.toml

# Add your positioning document
# (see examples/positioning.example.md for a template)

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your-key-here

# Run the analysis
msgdrift analyze
```

## Configuration

Create a `msgdrift.toml` file in your project root:

```toml
model = "claude-sonnet-4-20250514"
max_concurrent_requests = 2
request_delay_seconds = 1.0

[[source_documents]]
path = "positioning.md"

[[pages]]
url = "https://yoursite.com"
importance = "high"
label = "Homepage"

[[pages]]
url = "https://yoursite.com/pricing"
importance = "high"
label = "Pricing"

[[pages]]
url = "https://yoursite.com/about"
importance = "medium"
label = "About"
```

### Configuration Options

| Field | Description | Default |
|-------|-------------|---------|
| `model` | Anthropic model ID | `claude-sonnet-4-20250514` |
| `max_concurrent_requests` | Max parallel page fetches | `2` |
| `request_delay_seconds` | Delay between fetch batches | `1.0` |

### Page Importance

Pages are weighted by importance when computing the overall alignment score:

- **high** (weight 3x) — Homepage, pricing, primary landing pages
- **medium** (weight 2x) — About, features, documentation
- **low** (weight 1x) — Blog posts, changelog, secondary pages

## Drift Severity Levels

| Severity | Meaning |
|----------|---------|
| **Critical** | Direct contradiction of positioning or wrong audience targeting |
| **Major** | Key value propositions missing, diluted, or misframed |
| **Minor** | Tone inconsistencies, stale phrasing, secondary messaging gaps |
| **Info** | Not necessarily wrong, but worth a human review |

## CLI Usage

```bash
# Run analysis with default config (msgdrift.toml)
msgdrift analyze

# Use a specific config file
msgdrift analyze --config path/to/config.toml

# Export report as JSON
msgdrift analyze --output report.json

# Verbose logging
msgdrift analyze --verbose

# Validate config without running analysis
msgdrift validate
msgdrift validate path/to/config.toml
```

## Development

```bash
# Clone and install
git clone https://github.com/wpsands/msgdrift.git
cd msgdrift
uv sync

# Run tests
uv run pytest -v

# Lint and format
uv run ruff check src/ tests/
uv run ruff format --check src/ tests/

# Type checking
uv run pyright src/
```

## How It Works

msgdrift doesn't do keyword matching. It uses Claude to perform semantic analysis — understanding that "deploy in seconds" and "ship code instantly" mean the same thing, while "enterprise-grade solution" and "built for mid-market teams" are a positioning contradiction.

The analysis pipeline:

1. **Load** — Reads your positioning and messaging documents
2. **Fetch** — Downloads target web pages with polite rate limiting
3. **Extract** — Strips navigation, footers, and UI chrome to isolate page content
4. **Analyze** — Sends each page + source docs to Claude for semantic comparison
5. **Report** — Aggregates findings into a weighted drift report with an executive summary

## License

MIT
