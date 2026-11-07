"""Shared test fixtures."""

from __future__ import annotations

import pytest


@pytest.fixture()
def sample_html() -> str:
    """Realistic product page HTML for testing content extraction."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Acme Platform — Build Faster, Ship Smarter</title>
    <script>window.analytics = {};</script>
    <style>body { font-family: sans-serif; }</style>
</head>
<body>
    <nav class="navbar">
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/docs">Docs</a>
    </nav>

    <main>
        <h1>Build Faster, Ship Smarter</h1>
        <p>Acme Platform helps engineering teams move fast without breaking things.
           Our developer-first approach means you spend less time on infrastructure
           and more time shipping features your customers love.</p>

        <h2>Why Teams Choose Acme</h2>
        <ul>
            <li>Deploy in seconds, not hours</li>
            <li>Built-in observability from day one</li>
            <li>SOC 2 compliant out of the box</li>
        </ul>

        <p>Trusted by over 500 engineering teams worldwide.</p>
    </main>

    <footer id="footer">
        <p>&copy; 2025 Acme Inc. All rights reserved.</p>
        <div class="social-share">Follow us on Twitter</div>
    </footer>

    <div class="cookie-banner">We use cookies.</div>
</body>
</html>"""


@pytest.fixture()
def sample_positioning() -> str:
    """Sample messaging and positioning document content."""
    return """# Acme Platform — Messaging & Positioning

## Target Audience
Mid-market engineering teams (50-500 engineers) who need to ship faster
without sacrificing reliability.

## Core Value Proposition
Acme Platform eliminates infrastructure toil so engineering teams can
focus on building product. We are the developer-first deployment platform.

## Key Messages
1. **Speed**: Deploy in seconds, not hours. Zero-config CI/CD that just works.
2. **Reliability**: Built-in observability, automated rollbacks, and SRE best practices baked in.
3. **Compliance**: SOC 2, HIPAA-ready, and audit logs from day one — not bolted on later.

## Tone
- Confident but not arrogant
- Technical but accessible
- Pragmatic, not hype-driven

## Competitive Positioning
- vs. Heroku: "We scale with you — Acme is what Heroku should have become."
- vs. AWS/GCP raw: "All the power, none of the PhD in YAML."
- vs. Vercel/Netlify: "Built for full-stack teams, not just frontend."

## Words We Use
- deploy, ship, build, observe, scale
- developer-first, engineering teams, infrastructure toil

## Words We Avoid
- enterprise-grade (we're not targeting Fortune 500 yet)
- disrupting, revolutionary (too much hype)
- easy (patronizing — say "straightforward" or "fast" instead)
"""


@pytest.fixture()
def minimal_html() -> str:
    """Minimal HTML for edge case testing."""
    return "<html><body><p>Hello world</p></body></html>"
