"""Website content extraction.

Fetches web pages and extracts meaningful text content, stripping navigation,
scripts, styles, and other non-content elements.
"""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

import httpx
from bs4 import BeautifulSoup, Tag

from msgdrift.models import PageContent

if TYPE_CHECKING:
    from msgdrift.models import PageConfig

logger = logging.getLogger(__name__)

# Elements that don't contain meaningful page content
STRIP_ELEMENTS = {
    "script",
    "style",
    "nav",
    "footer",
    "header",
    "aside",
    "noscript",
    "iframe",
    "svg",
    "form",
}

# Common class/id patterns for non-content regions
NON_CONTENT_PATTERNS = {
    "nav",
    "navbar",
    "navigation",
    "footer",
    "sidebar",
    "menu",
    "cookie",
    "banner",
    "popup",
    "modal",
    "advertisement",
    "ad-",
    "social-share",
}

DEFAULT_HEADERS = {
    "User-Agent": "msgdrift/0.1 (messaging drift analysis tool)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def extract_text(html: str) -> tuple[str, str]:
    """Extract clean text content from HTML.

    Returns a tuple of (title, body_text). Strips non-content elements like
    nav, footer, scripts, and common UI patterns before extracting text.
    """
    soup = BeautifulSoup(html, "html.parser")

    title = ""
    title_tag = soup.find("title")
    if title_tag:
        title = title_tag.get_text(strip=True)

    # Remove elements that never contain page content
    for tag_name in STRIP_ELEMENTS:
        for element in soup.find_all(tag_name):
            element.decompose()

    # Remove elements with non-content class/id patterns
    for element in soup.find_all(True):
        if not isinstance(element, Tag):
            continue
        if element.attrs is None:
            continue
        classes = " ".join(element.get("class", []))  # type: ignore[arg-type]
        el_id = element.get("id", "")
        combined = f"{classes} {el_id}".lower()
        if any(pattern in combined for pattern in NON_CONTENT_PATTERNS):
            element.decompose()

    # Extract text from the main content area if identifiable
    main = soup.find("main") or soup.find("article") or soup.find(role="main")
    target = main if main else soup.body if soup.body else soup

    # Get text with newline separation between block elements
    lines = []
    for text in target.stripped_strings:  # type: ignore[union-attr]
        line = text.strip()
        if line:
            lines.append(line)

    body_text = "\n".join(lines)
    return title, body_text


async def fetch_page(
    client: httpx.AsyncClient,
    url: str,
    *,
    timeout: float = 30.0,
) -> PageContent:
    """Fetch a single page and extract its text content."""
    try:
        response = await client.get(str(url), timeout=timeout, follow_redirects=True)
        response.raise_for_status()
        title, text = extract_text(response.text)
        return PageContent(
            url=str(url),
            title=title,
            text=text,
            fetch_status=response.status_code,
        )
    except httpx.HTTPStatusError as exc:
        logger.warning("HTTP %d for %s", exc.response.status_code, url)
        return PageContent(
            url=str(url),
            text="",
            fetch_status=exc.response.status_code,
            error=f"HTTP {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        logger.warning("Request failed for %s: %s", url, exc)
        return PageContent(
            url=str(url),
            text="",
            fetch_status=0,
            error=str(exc),
        )


async def fetch_pages(
    pages: list[PageConfig],
    *,
    max_concurrent: int = 2,
    delay_seconds: float = 1.0,
) -> list[PageContent]:
    """Fetch multiple pages with concurrency limits and polite delays."""
    results: list[PageContent] = []
    semaphore = asyncio.Semaphore(max_concurrent)

    async with httpx.AsyncClient(headers=DEFAULT_HEADERS) as client:

        async def _fetch_with_limit(page: PageConfig) -> PageContent:
            async with semaphore:
                result = await fetch_page(client, str(page.url))
                if delay_seconds > 0:
                    await asyncio.sleep(delay_seconds)
                return result

        tasks = [_fetch_with_limit(page) for page in pages]
        results = await asyncio.gather(*tasks)

    return list(results)
