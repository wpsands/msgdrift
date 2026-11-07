"""Tests for agent response parsing."""

from __future__ import annotations

from msgdrift.agent import _parse_analysis_response


class TestParseAnalysisResponse:
    def test_parses_valid_json(self) -> None:
        raw = """{
            "findings": [
                {
                    "severity": "major",
                    "category": "omission",
                    "page_excerpt": "We help teams",
                    "source_excerpt": "We help mid-market engineering teams",
                    "explanation": "Missing audience specificity."
                }
            ],
            "summary": "Mostly aligned.",
            "alignment_score": 72
        }"""
        findings, summary, score = _parse_analysis_response(raw, "https://example.com")
        assert len(findings) == 1
        assert findings[0].severity.value == "major"
        assert findings[0].page_url == "https://example.com"
        assert summary == "Mostly aligned."
        assert score == 72.0

    def test_handles_code_fences(self) -> None:
        raw = """```json
{
    "findings": [],
    "summary": "Perfect alignment.",
    "alignment_score": 95
}
```"""
        findings, summary, score = _parse_analysis_response(raw, "https://example.com")
        assert findings == []
        assert summary == "Perfect alignment."
        assert score == 95.0

    def test_handles_malformed_json(self) -> None:
        raw = "This is not JSON at all"
        findings, summary, score = _parse_analysis_response(raw, "https://example.com")
        assert findings == []
        assert "could not be parsed" in summary
        assert score == 50.0

    def test_clamps_score_to_bounds(self) -> None:
        raw = '{"findings": [], "summary": "Test", "alignment_score": 150}'
        _, _, score = _parse_analysis_response(raw, "https://example.com")
        assert score == 100.0

        raw = '{"findings": [], "summary": "Test", "alignment_score": -20}'
        _, _, score = _parse_analysis_response(raw, "https://example.com")
        assert score == 0.0

    def test_skips_malformed_findings(self) -> None:
        raw = """{
            "findings": [
                {"severity": "invalid_level", "category": "test"},
                {
                    "severity": "minor",
                    "category": "tone",
                    "page_excerpt": "bold claim",
                    "source_excerpt": "measured language",
                    "explanation": "Tone mismatch."
                }
            ],
            "summary": "Mixed results.",
            "alignment_score": 60
        }"""
        findings, _, _ = _parse_analysis_response(raw, "https://example.com")
        # First finding should be skipped (invalid severity), second should parse
        assert len(findings) == 1
        assert findings[0].category == "tone"
