"""Pydantic models for Message Drift Analyzer output."""

from pydantic import BaseModel


# --- Phase 1: Per-page analysis ---


class OnMessageElement(BaseModel):
    element: str
    positioning_dimension: str
    evidence: str
    strength: str  # "strong", "moderate", "weak"


class OffMessageElement(BaseModel):
    element: str
    description: str
    conflict: str
    severity: str  # "high", "medium", "low"


class MissingElement(BaseModel):
    positioning_dimension: str
    importance: str  # "critical", "important", "nice-to-have"
    suggestion: str


class ToneAssessment(BaseModel):
    observed_formality: str
    observed_traits: list[str]
    observed_appeal: str
    consistency_score: int  # 0-100
    deviations: list[str]


class DriftIssue(BaseModel):
    issue: str
    description: str
    page_location: str
    severity: str  # "high", "medium", "low"
    recommendation: str


class PageDriftAnalysis(BaseModel):
    alignment_score: int  # 0-100
    page_url: str
    page_type: str
    on_message_elements: list[OnMessageElement]
    off_message_elements: list[OffMessageElement]
    missing_elements: list[MissingElement]
    tone_assessment: ToneAssessment
    drift_issues: list[DriftIssue]
    summary: str


# --- Phase 2: Drift synthesis ---


class PageScore(BaseModel):
    url: str
    type: str
    score: int
    top_issue: str


class RecurringPattern(BaseModel):
    pattern: str
    description: str
    pages_affected: list[str]
    severity: str  # "high", "medium", "low"


class MessagingGap(BaseModel):
    gap: str
    description: str
    importance: str  # "critical", "important", "nice-to-have"
    pages_missing: list[str]


class DriftRecommendation(BaseModel):
    title: str
    description: str
    pages_affected: list[str]
    priority: str  # "high", "medium", "low"
    effort: str  # "high", "medium", "low"


class DriftSummary(BaseModel):
    overall_alignment_score: int  # 0-100
    executive_summary: str
    page_scores: list[PageScore]
    recurring_patterns: list[RecurringPattern]
    critical_messaging_gaps: list[MessagingGap]
    recommendations: list[DriftRecommendation]
