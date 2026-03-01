"""Tests for prompt construction."""

from __future__ import annotations

from msgdrift.prompts import build_analysis_prompt, build_executive_summary_prompt


class TestBuildAnalysisPrompt:
    def test_includes_source_content(self) -> None:
        prompt = build_analysis_prompt(
            source_content="Our value prop is speed.",
            page_url="https://example.com",
            page_importance="high",
            page_content="We are fast.",
        )
        assert "Our value prop is speed." in prompt

    def test_includes_page_content(self) -> None:
        prompt = build_analysis_prompt(
            source_content="source",
            page_url="https://example.com",
            page_importance="medium",
            page_content="This is the page body.",
        )
        assert "This is the page body." in prompt

    def test_includes_page_url(self) -> None:
        prompt = build_analysis_prompt(
            source_content="source",
            page_url="https://example.com/pricing",
            page_importance="high",
            page_content="content",
        )
        assert "https://example.com/pricing" in prompt

    def test_includes_importance(self) -> None:
        prompt = build_analysis_prompt(
            source_content="source",
            page_url="https://example.com",
            page_importance="high",
            page_content="content",
        )
        assert "high" in prompt

    def test_requests_json_response(self) -> None:
        prompt = build_analysis_prompt(
            source_content="source",
            page_url="https://example.com",
            page_importance="medium",
            page_content="content",
        )
        assert "JSON" in prompt
        assert "alignment_score" in prompt


class TestBuildExecutiveSummaryPrompt:
    def test_includes_page_results(self) -> None:
        prompt = build_executive_summary_prompt("Page 1: score 85\nPage 2: score 45")
        assert "Page 1: score 85" in prompt
        assert "Page 2: score 45" in prompt
