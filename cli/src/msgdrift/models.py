"""Data models for configuration, crawl results, and drift analysis."""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path  # noqa: TC003 — used at runtime by Pydantic model fields

from pydantic import BaseModel, Field, HttpUrl, field_validator


class Severity(StrEnum):
    """Drift severity levels, ordered from most to least impactful."""

    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    INFO = "info"


class PageImportance(StrEnum):
    """How important a page is to overall messaging consistency."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SourceDocument(BaseModel):
    """A messaging or positioning source-of-truth document."""

    path: Path
    content: str = ""

    @field_validator("path")
    @classmethod
    def path_must_exist(cls, v: Path) -> Path:
        if not v.exists():
            msg = f"Source document not found: {v}"
            raise ValueError(msg)
        return v

    def load(self) -> SourceDocument:
        """Read file content from disk."""
        self.content = self.path.read_text(encoding="utf-8")
        return self


class PageConfig(BaseModel):
    """Configuration for a single page to analyze."""

    url: HttpUrl
    importance: PageImportance = PageImportance.MEDIUM
    label: str = ""


class AnalysisConfig(BaseModel):
    """Top-level configuration for a drift analysis run."""

    source_documents: list[SourceDocument] = Field(min_length=1)
    pages: list[PageConfig] = Field(min_length=1)
    model: str = "claude-sonnet-4-20250514"
    max_concurrent_requests: int = Field(default=2, ge=1, le=10)
    request_delay_seconds: float = Field(default=1.0, ge=0)

    @field_validator("source_documents")
    @classmethod
    def at_least_one_document(cls, v: list[SourceDocument]) -> list[SourceDocument]:
        if not v:
            msg = "At least one source document is required"
            raise ValueError(msg)
        return v


class PageContent(BaseModel):
    """Extracted text content from a web page."""

    url: str
    title: str = ""
    text: str
    fetch_status: int = 200
    error: str | None = None


class DriftFinding(BaseModel):
    """A single instance of messaging drift found on a page."""

    severity: Severity
    category: str = Field(
        description="Type of drift: contradiction, omission, tone, dilution, etc."
    )
    page_url: str
    page_excerpt: str = Field(description="The relevant text from the website")
    source_excerpt: str = Field(description="The relevant text from the positioning document")
    explanation: str = Field(description="Why this is considered drift and what the impact is")


class PageAnalysis(BaseModel):
    """Drift analysis results for a single page."""

    url: str
    label: str = ""
    importance: PageImportance
    findings: list[DriftFinding] = []
    summary: str = ""
    alignment_score: float = Field(
        ge=0, le=100, description="0 = completely off-message, 100 = perfectly aligned"
    )


class DriftReport(BaseModel):
    """Complete drift analysis report across all analyzed pages."""

    pages: list[PageAnalysis]
    overall_score: float = Field(ge=0, le=100)
    executive_summary: str = ""
    critical_count: int = 0
    major_count: int = 0
    minor_count: int = 0
    info_count: int = 0

    def compute_counts(self) -> DriftReport:
        """Recompute finding severity counts from page analyses."""
        self.critical_count = 0
        self.major_count = 0
        self.minor_count = 0
        self.info_count = 0
        for page in self.pages:
            for f in page.findings:
                match f.severity:
                    case Severity.CRITICAL:
                        self.critical_count += 1
                    case Severity.MAJOR:
                        self.major_count += 1
                    case Severity.MINOR:
                        self.minor_count += 1
                    case Severity.INFO:
                        self.info_count += 1
        return self

    def compute_overall_score(self) -> DriftReport:
        """Compute weighted overall score from page scores and importance."""
        if not self.pages:
            self.overall_score = 0
            return self

        weights = {PageImportance.HIGH: 3.0, PageImportance.MEDIUM: 2.0, PageImportance.LOW: 1.0}
        total_weight = sum(weights[p.importance] for p in self.pages)
        weighted_sum = sum(p.alignment_score * weights[p.importance] for p in self.pages)
        self.overall_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0
        return self
