"""Prompt templates for drift analysis.

Prompts are kept separate from agent orchestration so they can be tested,
iterated, and versioned independently of control flow.
"""

from __future__ import annotations

SYSTEM_PROMPT = """\
You are a messaging drift analyst. Your job is to compare a website page's actual \
content against canonical messaging and positioning documents, then identify where \
the website has drifted from the intended messaging.

You understand that messaging drift is a semantic problem — not a word-matching \
exercise. A page can use entirely different vocabulary and still be perfectly \
on-message. Conversely, a page can repeat key phrases while undermining the \
positioning through context, tone, or framing.

When analyzing drift, consider:
- Value proposition alignment: Are the core value props present and correctly framed?
- Audience language: Does the page speak to the intended audience?
- Competitive positioning: Does the page maintain the intended market position?
- Tone consistency: Does the emotional register match the brand guidelines?
- Claim accuracy: Are any claims inconsistent with or contradicted by the source docs?
- Omissions: Are critical messaging elements missing from pages where they belong?

Severity levels:
- critical: Direct contradiction of positioning or fundamentally wrong audience targeting
- major: Key value propositions missing, significantly diluted, or misframed
- minor: Tone inconsistencies, stale phrasing, or secondary messaging gaps
- info: Not necessarily wrong, but worth a human review
"""

ANALYSIS_PROMPT_TEMPLATE = """\
## Source Messaging & Positioning Documents

{source_content}

---

## Website Page to Analyze

**URL**: {page_url}
**Page importance**: {page_importance}

### Page Content:
{page_content}

---

## Instructions

Analyze the website page content above against the source messaging and positioning \
documents. Identify every instance of messaging drift.

For each finding, provide:
1. **severity**: critical, major, minor, or info
2. **category**: The type of drift (contradiction, omission, tone, dilution, \
audience-mismatch, claim-drift, framing, stale-messaging)
3. **page_excerpt**: Quote the specific text from the website that demonstrates the drift
4. **source_excerpt**: Quote the relevant text from the source documents that the \
website should align with
5. **explanation**: Explain why this is drift and what the business impact is

Also provide:
- A **summary** of the page's overall messaging alignment (2-3 sentences)
- An **alignment_score** from 0-100 (0 = completely off-message, 100 = perfectly aligned)

Be precise. Do not flag things that are acceptable variations of the source messaging. \
Marketing pages naturally adapt messaging for context — that's not drift. Drift is when \
the adaptation changes the meaning, weakens the position, or targets the wrong audience.

Respond with valid JSON matching this exact schema:
{{
  "findings": [
    {{
      "severity": "critical|major|minor|info",
      "category": "string",
      "page_url": "{page_url}",
      "page_excerpt": "string",
      "source_excerpt": "string",
      "explanation": "string"
    }}
  ],
  "summary": "string",
  "alignment_score": number
}}
"""


def build_analysis_prompt(
    source_content: str,
    page_url: str,
    page_importance: str,
    page_content: str,
) -> str:
    """Construct the analysis prompt for a single page."""
    return ANALYSIS_PROMPT_TEMPLATE.format(
        source_content=source_content,
        page_url=page_url,
        page_importance=page_importance,
        page_content=page_content,
    )


EXECUTIVE_SUMMARY_PROMPT = """\
You are summarizing a messaging drift analysis across multiple website pages.

Given the following per-page analysis results, write a 3-5 sentence executive summary \
that highlights:
1. The overall state of messaging alignment
2. The most critical drift patterns (if any)
3. Which pages need the most urgent attention
4. One concrete recommendation

Be direct and specific. Avoid vague statements like "there are some inconsistencies." \
Name the specific problems.

## Page Results

{page_results}

Respond with just the summary text, no JSON wrapping.
"""


def build_executive_summary_prompt(page_results: str) -> str:
    """Construct the executive summary prompt."""
    return EXECUTIVE_SUMMARY_PROMPT.format(page_results=page_results)
