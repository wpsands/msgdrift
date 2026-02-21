"""Message Drift Analyzer — audits brand pages against stated positioning using Claude Agent SDK."""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import yaml
from firecrawl import FirecrawlApp

from claude_agent_sdk import query, ClaudeAgentOptions
from claude_agent_sdk.types import ResultMessage

# Patch SDK to skip unknown message types (e.g. rate_limit_event)
import claude_agent_sdk._internal.client as _client
import claude_agent_sdk._internal.message_parser as _mp

_original_parse = _client.parse_message


def _patched_parse(data):
    try:
        return _original_parse(data)
    except _mp.MessageParseError:
        return None


_client.parse_message = _patched_parse

from models import PageDriftAnalysis, DriftSummary


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def load_positioning(config_dir: Path, positioning_file: str) -> str:
    pos_path = config_dir / positioning_file
    return pos_path.read_text(encoding="utf-8")


def build_page_urls(brand: dict) -> list[dict]:
    """Return list of {url, type} dicts from config."""
    base = brand["url"].rstrip("/")
    return [
        {"url": f"{base}{p['path']}", "type": p["type"]}
        for p in brand.get("pages", [{"path": "/", "type": "homepage"}])
    ]


# ---------------------------------------------------------------------------
# Firecrawl page scraper
# ---------------------------------------------------------------------------

_firecrawl: FirecrawlApp | None = None


def get_firecrawl() -> FirecrawlApp:
    global _firecrawl
    if _firecrawl is None:
        api_key = os.environ.get("FIRECRAWL_API_KEY")
        if not api_key:
            print("Fatal: FIRECRAWL_API_KEY environment variable is not set.", file=sys.stderr)
            sys.exit(1)
        _firecrawl = FirecrawlApp(api_key=api_key)
    return _firecrawl


def scrape_page(url: str) -> str | None:
    """Scrape a URL via Firecrawl and return markdown content."""
    try:
        result = get_firecrawl().scrape(url, formats=["markdown"])
        if result and result.markdown:
            return result.markdown
        print(f"  [WARN] Firecrawl returned no markdown for {url}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  [WARN] Firecrawl error for {url}: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Phase 1 — Per-page drift analysis
# ---------------------------------------------------------------------------


async def analyze_page(
    url: str, page_type: str, positioning_text: str, page_content: str
) -> PageDriftAnalysis | None:
    """Analyze a single page against the brand positioning."""

    prompt = (
        "You are a brand messaging auditor. Your task is to analyze a web page's content "
        "and evaluate how well its messaging aligns with the brand's stated positioning.\n\n"
        "## Brand Positioning (baseline)\n\n"
        f"{positioning_text}\n\n"
        "## Page Content\n\n"
        f"**URL:** {url}\n"
        f"**Page type:** {page_type}\n\n"
        f"{page_content}\n\n"
        "## Instructions\n\n"
        "Compare every messaging element on the page against the positioning baseline above.\n"
        "Identify:\n"
        "- **On-message elements**: messaging that reinforces the stated positioning (with evidence)\n"
        "- **Off-message elements**: messaging that contradicts or conflicts with positioning\n"
        "- **Missing elements**: key positioning dimensions absent from the page\n"
        "- **Tone assessment**: how the page's tone compares to the stated tone & voice\n"
        "- **Drift issues**: specific problems where messaging has drifted from positioning\n\n"
        "Assign an overall alignment score from 0 (completely off-brand) to 100 (perfectly aligned).\n"
        "Write a brief summary of your findings.\n\n"
        "Return your analysis as structured JSON matching the requested schema."
    )

    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        model="haiku",
        output_format={
            "type": "json_schema",
            "schema": PageDriftAnalysis.model_json_schema(),
        },
    )

    result_data = None
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, ResultMessage) and message.structured_output:
            result_data = message.structured_output

    if result_data:
        analysis = PageDriftAnalysis(**result_data)
        print(f"  [OK] {url} — alignment score: {analysis.alignment_score}/100")
        return analysis

    print(f"  [FAIL] {url} — no structured output returned", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Phase 2 — Drift synthesis
# ---------------------------------------------------------------------------


async def synthesize_drift(
    page_analyses: list[PageDriftAnalysis], positioning_text: str
) -> DriftSummary | None:
    """Synthesize per-page analyses into an overall drift summary."""

    analyses_json = json.dumps(
        [a.model_dump() for a in page_analyses], indent=2
    )

    prompt = (
        "You are a brand messaging strategist. Below are per-page drift analyses comparing "
        "a brand's web pages against its stated positioning.\n\n"
        "## Brand Positioning (baseline)\n\n"
        f"{positioning_text}\n\n"
        "## Per-Page Analyses\n\n"
        f"{analyses_json}\n\n"
        "## Instructions\n\n"
        "Produce an overall drift summary that includes:\n"
        "- **Overall alignment score** (0-100): a weighted average considering page importance "
        "(homepage and platform pages matter more than about pages)\n"
        "- **Executive summary**: 2-3 paragraph narrative of the brand's messaging health\n"
        "- **Page scores**: each page's URL, type, score, and top issue\n"
        "- **Recurring patterns**: drift themes that appear across multiple pages\n"
        "- **Critical messaging gaps**: positioning dimensions consistently missing across pages\n"
        "- **Recommendations**: prioritized actions to close the drift, with effort estimates\n\n"
        "Return your synthesis as structured JSON matching the requested schema."
    )

    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        model="haiku",
        output_format={
            "type": "json_schema",
            "schema": DriftSummary.model_json_schema(),
        },
    )

    result_data = None
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, ResultMessage) and message.structured_output:
            result_data = message.structured_output

    if result_data:
        summary = DriftSummary(**result_data)
        print(f"  [OK] Overall alignment score: {summary.overall_alignment_score}/100")
        return summary

    print("  [FAIL] Drift synthesis returned no structured output", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Phase 3 — Report generation (pure function, no agents)
# ---------------------------------------------------------------------------


def generate_report(
    brand_name: str,
    positioning_text: str,
    page_analyses: list[PageDriftAnalysis],
    drift_summary: DriftSummary,
) -> str:
    """Convert structured analyses into a readable Markdown report."""
    lines: list[str] = []

    lines.append(f"# Message Drift Report: {brand_name}")
    lines.append(f"*Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n")

    # --- Executive Summary ---
    lines.append("## Executive Summary\n")
    lines.append(f"**Overall Alignment Score: {drift_summary.overall_alignment_score}/100**\n")
    lines.append(drift_summary.executive_summary + "\n")

    # --- Positioning Baseline ---
    lines.append("---\n## Positioning Baseline\n")
    lines.append(positioning_text + "\n")

    # --- Page-by-Page Scores ---
    lines.append("---\n## Page-by-Page Scores\n")
    lines.append("| Page | Type | Score | Top Issue |")
    lines.append("|------|------|-------|-----------|")
    for ps in drift_summary.page_scores:
        lines.append(f"| {ps.url} | {ps.type} | {ps.score}/100 | {ps.top_issue} |")
    lines.append("")

    # --- Detailed Page Analysis ---
    lines.append("---\n## Detailed Page Analysis\n")
    for analysis in page_analyses:
        lines.append(f"### {analysis.page_url} ({analysis.page_type})\n")
        lines.append(f"**Alignment Score:** {analysis.alignment_score}/100\n")
        lines.append(f"{analysis.summary}\n")

        if analysis.on_message_elements:
            lines.append("**On-Message Elements:**\n")
            for el in analysis.on_message_elements:
                lines.append(
                    f"- **{el.element}** ({el.positioning_dimension}, {el.strength}) — {el.evidence}"
                )
            lines.append("")

        if analysis.off_message_elements:
            lines.append("**Off-Message Elements:**\n")
            for el in analysis.off_message_elements:
                lines.append(
                    f"- **{el.element}** (severity: {el.severity}) — {el.description}. "
                    f"Conflict: {el.conflict}"
                )
            lines.append("")

        if analysis.missing_elements:
            lines.append("**Missing Elements:**\n")
            for el in analysis.missing_elements:
                lines.append(
                    f"- **{el.positioning_dimension}** ({el.importance}) — {el.suggestion}"
                )
            lines.append("")

        if analysis.drift_issues:
            lines.append("**Drift Issues:**\n")
            for issue in analysis.drift_issues:
                lines.append(
                    f"- **{issue.issue}** (severity: {issue.severity}, "
                    f"location: {issue.page_location}) — {issue.description}. "
                    f"Recommendation: {issue.recommendation}"
                )
            lines.append("")

        tone = analysis.tone_assessment
        lines.append(f"**Tone Assessment:** consistency {tone.consistency_score}/100")
        lines.append(f"- Formality: {tone.observed_formality}")
        lines.append(f"- Traits: {', '.join(tone.observed_traits)}")
        lines.append(f"- Appeal: {tone.observed_appeal}")
        if tone.deviations:
            lines.append(f"- Deviations: {'; '.join(tone.deviations)}")
        lines.append("")

    # --- Recurring Patterns ---
    lines.append("---\n## Recurring Patterns\n")
    if drift_summary.recurring_patterns:
        for pat in drift_summary.recurring_patterns:
            pages = ", ".join(pat.pages_affected)
            lines.append(
                f"### {pat.pattern} (severity: {pat.severity})\n"
            )
            lines.append(f"{pat.description}\n")
            lines.append(f"*Pages affected: {pages}*\n")
    else:
        lines.append("No recurring drift patterns detected.\n")

    # --- Critical Messaging Gaps ---
    lines.append("---\n## Critical Messaging Gaps\n")
    if drift_summary.critical_messaging_gaps:
        for gap in drift_summary.critical_messaging_gaps:
            pages = ", ".join(gap.pages_missing)
            lines.append(f"### {gap.gap} (importance: {gap.importance})\n")
            lines.append(f"{gap.description}\n")
            lines.append(f"*Missing from: {pages}*\n")
    else:
        lines.append("No critical messaging gaps detected.\n")

    # --- Recommendations ---
    lines.append("---\n## Recommendations\n")
    lines.append("| # | Recommendation | Pages Affected | Priority | Effort |")
    lines.append("|---|---------------|----------------|----------|--------|")
    for i, rec in enumerate(drift_summary.recommendations, 1):
        pages = ", ".join(rec.pages_affected)
        lines.append(
            f"| {i} | **{rec.title}** — {rec.description} | {pages} | {rec.priority} | {rec.effort} |"
        )
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


async def main():
    parser = argparse.ArgumentParser(description="Message Drift Analyzer")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).parent / "config.yaml"),
        help="Path to YAML config file (default: config.yaml)",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    brand = config["brand"]
    brand_name = brand["name"]
    config_dir = Path(args.config).parent

    positioning_text = load_positioning(config_dir, brand["positioning_file"])
    pages = build_page_urls(brand)

    if not pages:
        print("Error: config must include at least one page to audit.", file=sys.stderr)
        sys.exit(1)

    # --- Phase 1: Per-page drift analysis (sequential to avoid rate limits) ---
    print(f"\n[Phase 1] Analyzing {len(pages)} pages for {brand_name}...\n")

    page_analyses: list[PageDriftAnalysis] = []
    for page in pages:
        url, page_type = page["url"], page["type"]
        print(f"  Scraping {url}...")
        content = scrape_page(url)
        if not content:
            print(f"  [SKIP] Could not scrape {url}", file=sys.stderr)
            continue
        print(f"  [OK] Scraped {len(content)} chars — analyzing...")
        analysis = await analyze_page(url, page_type, positioning_text, content)
        if analysis:
            page_analyses.append(analysis)

    if not page_analyses:
        print("Fatal: could not analyze any pages.", file=sys.stderr)
        sys.exit(1)

    # --- Phase 2: Drift synthesis ---
    print(f"\n[Phase 2] Synthesizing drift across {len(page_analyses)} pages...\n")

    drift_summary = await synthesize_drift(page_analyses, positioning_text)
    if not drift_summary:
        print("Fatal: drift synthesis failed.", file=sys.stderr)
        sys.exit(1)

    # --- Phase 3: Generate report ---
    print("\n[Phase 3] Generating report...\n")

    report = generate_report(brand_name, positioning_text, page_analyses, drift_summary)

    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = brand_name.lower().replace(" ", "-")
    report_path = reports_dir / f"{slug}_drift_{timestamp}.md"
    report_path.write_text(report, encoding="utf-8")

    print(f"[OK] Report saved to {report_path}")


if __name__ == "__main__":
    asyncio.run(main())
