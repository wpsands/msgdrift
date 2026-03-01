"""Command-line interface for msgdrift."""

from __future__ import annotations

import logging
from pathlib import Path

import click
from rich.console import Console

from msgdrift import __version__
from msgdrift.agent import run_analysis_sync
from msgdrift.config import load_config
from msgdrift.report import export_json, export_markdown, render_terminal

console = Console()


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(levelname)s %(name)s: %(message)s",
    )
    # Quiet down noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.WARNING)


@click.group()
@click.version_option(version=__version__, prog_name="msgdrift")
def main() -> None:
    """msgdrift — Detect when website messaging drifts from your positioning documents."""


@main.command()
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True, path_type=Path),
    default="msgdrift.toml",
    help="Path to the configuration file.",
    show_default=True,
)
@click.option(
    "--output",
    "-o",
    type=click.Path(path_type=Path),
    default=None,
    help="Export report to this path (.json or .md).",
)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging.")
def analyze(config: Path, output: Path | None, verbose: bool) -> None:
    """Run drift analysis against configured pages."""
    _setup_logging(verbose)

    console.print(f"[bold blue]msgdrift[/bold blue] v{__version__}")
    console.print()

    try:
        analysis_config = load_config(config)
    except (FileNotFoundError, ValueError) as exc:
        console.print(f"[red]Configuration error:[/red] {exc}")
        raise SystemExit(1) from exc

    console.print(
        f"Analyzing [bold]{len(analysis_config.pages)}[/bold] page(s) against "
        f"[bold]{len(analysis_config.source_documents)}[/bold] source document(s)..."
    )
    console.print()

    report = run_analysis_sync(analysis_config)

    render_terminal(report, console)

    if output:
        if output.suffix == ".md":
            export_markdown(report, output)
        else:
            export_json(report, output)
        console.print(f"[dim]Report exported to {output}[/dim]")


@main.command()
@click.argument("config_path", type=click.Path(path_type=Path), default="msgdrift.toml")
def validate(config_path: Path) -> None:
    """Validate a configuration file without running analysis."""
    try:
        cfg = load_config(config_path)
        console.print("[green]Configuration is valid.[/green]")
        console.print(f"  Source documents: {len(cfg.source_documents)}")
        console.print(f"  Pages to analyze: {len(cfg.pages)}")
        console.print(f"  Model: {cfg.model}")
    except (FileNotFoundError, ValueError) as exc:
        console.print(f"[red]Invalid configuration:[/red] {exc}")
        raise SystemExit(1) from exc
