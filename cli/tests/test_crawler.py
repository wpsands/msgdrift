"""Tests for website content extraction."""

from __future__ import annotations

from msgdrift.crawler import extract_text


class TestExtractText:
    def test_extracts_title(self, sample_html: str) -> None:
        title, _ = extract_text(sample_html)
        assert title == "Acme Platform — Build Faster, Ship Smarter"

    def test_extracts_body_content(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        assert "Build Faster, Ship Smarter" in text
        assert "engineering teams move fast" in text

    def test_strips_navigation(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        # Nav links should be removed
        assert "Pricing" not in text or "Docs" not in text

    def test_strips_footer(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        assert "All rights reserved" not in text

    def test_strips_scripts_and_styles(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        assert "window.analytics" not in text
        assert "font-family" not in text

    def test_strips_cookie_banner(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        assert "We use cookies" not in text

    def test_strips_social_share(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        assert "Follow us on Twitter" not in text

    def test_preserves_list_items(self, sample_html: str) -> None:
        _, text = extract_text(sample_html)
        assert "Deploy in seconds, not hours" in text
        assert "SOC 2 compliant" in text

    def test_minimal_html(self, minimal_html: str) -> None:
        title, text = extract_text(minimal_html)
        assert title == ""
        assert "Hello world" in text

    def test_empty_html(self) -> None:
        title, text = extract_text("")
        assert title == ""
        assert text == ""

    def test_handles_main_content_area(self) -> None:
        html = """<html><body>
            <div>Outside content</div>
            <main><p>Main content here</p></main>
        </body></html>"""
        _, text = extract_text(html)
        assert "Main content here" in text

    def test_handles_article_element(self) -> None:
        html = """<html><body>
            <article><p>Article content</p></article>
        </body></html>"""
        _, text = extract_text(html)
        assert "Article content" in text
