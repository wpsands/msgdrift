"""Tests for data models and validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from msgdrift.models import (
    DriftFinding,
    DriftReport,
    PageAnalysis,
    PageImportance,
    Severity,
)


class TestDriftFinding:
    def test_valid_finding(self) -> None:
        finding = DriftFinding(
            severity=Severity.MAJOR,
            category="omission",
            page_url="https://example.com",
            page_excerpt="We help businesses grow",
            source_excerpt="We help mid-market engineering teams ship faster",
            explanation="The page uses generic language instead of targeting the specific audience.",
        )
        assert finding.severity == Severity.MAJOR
        assert finding.category == "omission"

    def test_severity_enum_values(self) -> None:
        assert Severity.CRITICAL.value == "critical"
        assert Severity.MAJOR.value == "major"
        assert Severity.MINOR.value == "minor"
        assert Severity.INFO.value == "info"


class TestPageAnalysis:
    def test_valid_analysis(self) -> None:
        analysis = PageAnalysis(
            url="https://example.com",
            importance=PageImportance.HIGH,
            alignment_score=75.0,
            summary="Mostly aligned with some gaps.",
        )
        assert analysis.alignment_score == 75.0

    def test_score_bounds(self) -> None:
        with pytest.raises(ValidationError):
            PageAnalysis(
                url="https://example.com",
                importance=PageImportance.MEDIUM,
                alignment_score=101,
            )

        with pytest.raises(ValidationError):
            PageAnalysis(
                url="https://example.com",
                importance=PageImportance.MEDIUM,
                alignment_score=-1,
            )


class TestDriftReport:
    def _make_report(self) -> DriftReport:
        findings = [
            DriftFinding(
                severity=Severity.CRITICAL,
                category="contradiction",
                page_url="https://example.com",
                page_excerpt="enterprise-grade",
                source_excerpt="mid-market teams",
                explanation="Targets wrong audience.",
            ),
            DriftFinding(
                severity=Severity.MAJOR,
                category="omission",
                page_url="https://example.com",
                page_excerpt="",
                source_excerpt="SOC 2 compliant",
                explanation="Missing compliance messaging.",
            ),
            DriftFinding(
                severity=Severity.MINOR,
                category="tone",
                page_url="https://example.com/about",
                page_excerpt="revolutionary platform",
                source_excerpt="avoid: revolutionary",
                explanation="Uses hype language the brand guidelines prohibit.",
            ),
        ]
        return DriftReport(
            pages=[
                PageAnalysis(
                    url="https://example.com",
                    importance=PageImportance.HIGH,
                    findings=findings[:2],
                    alignment_score=45.0,
                ),
                PageAnalysis(
                    url="https://example.com/about",
                    importance=PageImportance.LOW,
                    findings=findings[2:],
                    alignment_score=80.0,
                ),
            ],
            overall_score=0,
        )

    def test_compute_counts(self) -> None:
        report = self._make_report().compute_counts()
        assert report.critical_count == 1
        assert report.major_count == 1
        assert report.minor_count == 1
        assert report.info_count == 0

    def test_compute_overall_score_weights_by_importance(self) -> None:
        report = self._make_report().compute_overall_score()
        # HIGH = weight 3, LOW = weight 1
        # Expected: (45 * 3 + 80 * 1) / (3 + 1) = 215 / 4 = 53.75 -> 53.8
        assert report.overall_score == 53.8

    def test_empty_report(self) -> None:
        report = DriftReport(pages=[], overall_score=0)
        report.compute_counts()
        report.compute_overall_score()
        assert report.overall_score == 0
        assert report.critical_count == 0
