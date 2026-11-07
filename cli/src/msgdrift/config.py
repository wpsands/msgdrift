"""Configuration loading and validation.

Reads a TOML config file and produces a validated AnalysisConfig.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

from msgdrift.models import (
    AnalysisConfig,
    PageConfig,
    PageImportance,
    SourceDocument,
)


def load_config(path: Path) -> AnalysisConfig:
    """Load and validate analysis configuration from a TOML file."""
    if not path.exists():
        msg = f"Config file not found: {path}"
        raise FileNotFoundError(msg)

    with open(path, "rb") as f:
        raw = tomllib.load(f)

    # Parse source documents
    source_docs = []
    for doc_entry in raw.get("source_documents", []):
        doc_path = Path(doc_entry["path"])
        if not doc_path.is_absolute():
            doc_path = path.parent / doc_path
        source_docs.append(SourceDocument(path=doc_path))

    # Parse pages
    pages = []
    for page_entry in raw.get("pages", []):
        importance = PageImportance(page_entry.get("importance", "medium"))
        pages.append(
            PageConfig(
                url=page_entry["url"],
                importance=importance,
                label=page_entry.get("label", ""),
            )
        )

    return AnalysisConfig(
        source_documents=source_docs,
        pages=pages,
        model=raw.get("model", "claude-sonnet-4-20250514"),
        max_concurrent_requests=raw.get("max_concurrent_requests", 2),
        request_delay_seconds=raw.get("request_delay_seconds", 1.0),
    )
