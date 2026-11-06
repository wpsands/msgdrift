/**
 * Prompt templates. Ported verbatim in intent from cli/src/msgdrift/prompts.py.
 * Kept separate from orchestration so they can be unit tested and tuned independently.
 */

export const SYSTEM_PROMPT = `You are a messaging drift analyst. Your job is to compare a website page's actual content against canonical messaging and positioning documents, then identify where the website has drifted from the intended messaging.

You understand that messaging drift is a semantic problem, not a word-matching exercise. A page can use entirely different vocabulary and still be perfectly on-message. Conversely, a page can repeat key phrases while undermining the positioning through context, tone, or framing.

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
- info: Not necessarily wrong, but worth a human review`;

export interface AnalysisPromptInput {
  sourceContent: string;
  pageUrl: string;
  pageImportance: string;
  pageTitle: string;
  pageContent: string;
}

export function buildAnalysisPrompt(input: AnalysisPromptInput): string {
  return `## Source Messaging & Positioning Documents

${input.sourceContent}

---

## Website Page to Analyze

**URL**: ${input.pageUrl}
**Title**: ${input.pageTitle || "(untitled)"}
**Page importance**: ${input.pageImportance}

### Page Content:
${input.pageContent}

---

## Instructions

Analyze the website page content above against the source messaging and positioning documents. Identify every instance of messaging drift.

For each finding, provide:
1. severity: critical, major, minor, or info
2. category: the type of drift (contradiction, omission, tone, dilution, audience-mismatch, claim-drift, framing, stale-messaging)
3. pageExcerpt: quote the specific text from the website that demonstrates the drift. Keep it under 60 words.
4. sourceExcerpt: quote the relevant text from the source documents that the website should align with. Keep it under 60 words. For an omission, quote the source text that is missing.
5. explanation: explain why this is drift and what the business impact is, in two to four sentences.

Also provide:
- summary: the page's overall messaging alignment in 2-3 sentences
- alignmentScore: 0-100 (0 = completely off-message, 100 = perfectly aligned)

Be precise. Do not flag things that are acceptable variations of the source messaging. Marketing pages naturally adapt messaging for context; that is not drift. Drift is when the adaptation changes the meaning, weakens the position, or targets the wrong audience. Return at most 8 findings, most important first.`;
}

export function buildExecutiveSummaryPrompt(pageResults: string): string {
  return `You are summarizing a messaging drift analysis across multiple website pages.

Given the following per-page analysis results, write a 3-5 sentence executive summary that highlights:
1. The overall state of messaging alignment
2. The most critical drift patterns (if any)
3. Which pages need the most urgent attention
4. One concrete recommendation

Be direct and specific. Avoid vague statements like "there are some inconsistencies." Name the specific problems. Write in plain prose with no headings, bullets, or markdown.

## Page Results

${pageResults}

Respond with just the summary text.`;
}
