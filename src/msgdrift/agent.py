"""Core drift analysis agent.

Orchestrates the analysis pipeline: loads source documents, fetches pages,
sends analysis requests to Claude, and assembles the drift report.
"""

from __future__ import annotations

import asyncio
import json
import logging

from dotenv import load_dotenv
from typing import TYPE_CHECKING

import anthropic

from msgdrift.crawler import fetch_pages
from msgdrift.models import (
    DriftFinding,
    DriftReport,
    PageAnalysis,
    PageContent,
)
from msgdrift.prompts import (
    SYSTEM_PROMPT,
    build_analysis_prompt,
    build_executive_summary_prompt,
)

if TYPE_CHECKING:
    from msgdrift.models import AnalysisConfig, PageConfig

logger = logging.getLogger(__name__)


def _combine_source_content(config: AnalysisConfig) -> str:
    """Load and concatenate all source documents."""
    sections = []
    for doc in config.source_documents:
        doc.load()
        sections.append(f"### {doc.path.name}\n\n{doc.content}")
    return "\n\n---\n\n".join(sections)


def _parse_analysis_response(raw: str, page_url: str) -> tuple[list[DriftFinding], str, float]:
    """Parse Claude's JSON response into validated models.

    Returns (findings, summary, alignment_score). Handles malformed responses
    gracefully by returning empty results rather than crashing.
    """
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            first_newline = cleaned.index("\n")
            last_fence = cleaned.rfind("```")
            cleaned = cleaned[first_newline + 1 : last_fence].strip()

        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Failed to parse analysis response for %s: %s", page_url, exc)
        return [], "Analysis response could not be parsed.", 50.0

    findings = []
    for item in data.get("findings", []):
        try:
            item["page_url"] = page_url
            findings.append(DriftFinding.model_validate(item))
        except Exception as exc:
            logger.warning("Skipping malformed finding for %s: %s", page_url, exc)

    summary = data.get("summary", "")
    score = data.get("alignment_score", 50.0)
    score = max(0, min(100, float(score)))

    return findings, summary, score


async def analyze_page(
    client: anthropic.AsyncAnthropic,
    source_content: str,
    page: PageConfig,
    page_content: PageContent,
    model: str,
) -> PageAnalysis:
    """Run drift analysis on a single page."""
    if page_content.error or not page_content.text.strip():
        return PageAnalysis(
            url=str(page.url),
            label=page.label or page_content.title,
            importance=page.importance,
            findings=[],
            summary=f"Could not analyze: {page_content.error or 'empty page content'}",
            alignment_score=0,
        )

    prompt = build_analysis_prompt(
        source_content=source_content,
        page_url=str(page.url),
        page_importance=page.importance.value,
        page_content=page_content.text[:15000],  # Truncate to manage token budget
    )

    try:
        response = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text  # type: ignore[union-attr]
    except anthropic.APIError as exc:
        logger.error("API error analyzing %s: %s", page.url, exc)
        return PageAnalysis(
            url=str(page.url),
            label=page.label or page_content.title,
            importance=page.importance,
            findings=[],
            summary=f"Analysis failed: {exc}",
            alignment_score=0,
        )

    findings, summary, score = _parse_analysis_response(raw_text, str(page.url))

    return PageAnalysis(
        url=str(page.url),
        label=page.label or page_content.title,
        importance=page.importance,
        findings=findings,
        summary=summary,
        alignment_score=score,
    )


async def generate_executive_summary(
    client: anthropic.AsyncAnthropic,
    pages: list[PageAnalysis],
    model: str,
) -> str:
    """Generate an executive summary across all page analyses."""
    page_results = []
    for p in pages:
        finding_lines = []
        for f in p.findings:
            finding_lines.append(f"  - [{f.severity.value}] {f.category}: {f.explanation}")
        findings_text = "\n".join(finding_lines) if finding_lines else "  No drift findings."
        page_results.append(
            f"### {p.label or p.url} (importance: {p.importance.value}, "
            f"score: {p.alignment_score})\n{p.summary}\n{findings_text}"
        )

    prompt = build_executive_summary_prompt("\n\n".join(page_results))

    try:
        response = await client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text  # type: ignore[union-attr]
    except anthropic.APIError as exc:
        logger.error("Failed to generate executive summary: %s", exc)
        return "Executive summary generation failed."


async def run_analysis(config: AnalysisConfig) -> DriftReport:
    """Run the full drift analysis pipeline.

    1. Load source documents
    2. Fetch all target pages
    3. Analyze each page against the source documents
    4. Generate executive summary
    5. Assemble and return the drift report
    """
    load_dotenv(override=True)
    source_content = _combine_source_content(config)
    logger.info("Loaded %d source document(s)", len(config.source_documents))

    page_contents = await fetch_pages(
        config.pages,
        max_concurrent=config.max_concurrent_requests,
        delay_seconds=config.request_delay_seconds,
    )
    logger.info("Fetched %d page(s)", len(page_contents))

    client = anthropic.AsyncAnthropic()

    # Analyze pages — sequential to respect rate limits and token budgets
    page_analyses = []
    for page_cfg, page_content in zip(config.pages, page_contents, strict=True):
        analysis = await analyze_page(client, source_content, page_cfg, page_content, config.model)
        page_analyses.append(analysis)
        logger.info(
            "Analyzed %s — score: %.0f, findings: %d",
            page_cfg.url,
            analysis.alignment_score,
            len(analysis.findings),
        )

    executive_summary = await generate_executive_summary(client, page_analyses, config.model)

    report = DriftReport(
        pages=page_analyses,
        overall_score=0,
        executive_summary=executive_summary,
    )
    report.compute_counts()
    report.compute_overall_score()

    return report


def run_analysis_sync(config: AnalysisConfig) -> DriftReport:
    """Synchronous wrapper for run_analysis."""
    return asyncio.run(run_analysis(config))
