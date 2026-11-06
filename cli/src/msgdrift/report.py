"""Report rendering for drift analysis results.

Outputs drift reports to the terminal using Rich, or exports to JSON.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

if TYPE_CHECKING:
    from pathlib import Path

    from msgdrift.models import DriftReport, PageAnalysis

SEVERITY_STYLES = {
    "critical": "bold red",
    "major": "bold yellow",
    "minor": "cyan",
    "info": "dim",
}


def _score_color(score: float) -> str:
    if score >= 80:
        return "green"
    if score >= 60:
        return "yellow"
    return "red"


def render_terminal(report: DriftReport, console: Console | None = None) -> None:
    """Render a drift report to the terminal using Rich."""
    console = console or Console()

    # Header
    score_style = _score_color(report.overall_score)
    header = Text()
    header.append("Overall Alignment: ", style="bold")
    header.append(f"{report.overall_score:.0f}/100", style=f"bold {score_style}")
    header.append("  |  ")
    header.append(f"{report.critical_count} critical", style="bold red")
    header.append("  ")
    header.append(f"{report.major_count} major", style="bold yellow")
    header.append("  ")
    header.append(f"{report.minor_count} minor", style="cyan")
    header.append("  ")
    header.append(f"{report.info_count} info", style="dim")

    console.print(Panel(header, title="msgdrift report", border_style="blue"))
    console.print()

    # Executive summary
    if report.executive_summary:
        console.print(
            Panel(report.executive_summary, title="Executive Summary", border_style="dim")
        )
        console.print()

    # Per-page results
    for page in report.pages:
        _render_page(page, console)


def _render_page(page: PageAnalysis, console: Console) -> None:
    """Render a single page's analysis."""
    label = page.label or page.url
    score_style = _score_color(page.alignment_score)

    console.print(
        f"[bold]{label}[/bold]  "
        f"[{score_style}]{page.alignment_score:.0f}/100[/{score_style}]  "
        f"[dim]({page.importance.value} importance)[/dim]"
    )
    console.print(f"  [dim]{page.url}[/dim]")

    if page.summary:
        console.print(f"  {page.summary}")

    if page.findings:
        table = Table(show_header=True, header_style="bold", padding=(0, 1), expand=True)
        table.add_column("Severity", width=10)
        table.add_column("Category", width=16)
        table.add_column("Issue", ratio=1)

        for finding in page.findings:
            severity_text = Text(finding.severity.value.upper())
            severity_text.stylize(SEVERITY_STYLES.get(finding.severity.value, ""))
            table.add_row(
                severity_text,
                finding.category,
                finding.explanation,
            )

        console.print(table)
    else:
        console.print("  [green]No drift findings.[/green]")

    console.print()


def export_json(report: DriftReport, path: Path) -> None:
    """Export the full drift report as JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report.model_dump(mode="json"), indent=2, default=str),
        encoding="utf-8",
    )


def export_markdown(report: DriftReport, path: Path) -> None:
    """Export the full drift report as Markdown."""
    path.parent.mkdir(parents=True, exist_ok=True)

    lines: list[str] = []
    lines.append("# msgdrift Report")
    lines.append("")
    score = report.overall_score
    lines.append(
        f"**Overall Alignment: {score:.0f}/100** — "
        f"{report.critical_count} critical | {report.major_count} major | "
        f"{report.minor_count} minor | {report.info_count} info"
    )
    lines.append("")

    if report.executive_summary:
        lines.append("## Executive Summary")
        lines.append("")
        lines.append(report.executive_summary)
        lines.append("")

    for page in report.pages:
        label = page.label or page.url
        lines.append(f"## {label} — {page.alignment_score:.0f}/100 ({page.importance.value})")
        lines.append("")
        lines.append(f"**URL:** {page.url}")
        lines.append("")
        if page.summary:
            lines.append(page.summary)
            lines.append("")

        if page.findings:
            lines.append("| Severity | Category | Issue |")
            lines.append("|----------|----------|-------|")
            for f in page.findings:
                explanation = f.explanation.replace("\n", " ")
                lines.append(f"| {f.severity.value.upper()} | {f.category} | {explanation} |")
            lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
