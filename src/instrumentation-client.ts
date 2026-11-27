import posthog from "posthog-js";

/**
 * PostHog, configured for a tool whose visitors paste confidential documents:
 * cookieless, no session recording, no autocapture, no surveys, Do Not Track
 * honored, and report ids scrubbed from every URL property before it leaves
 * the browser. Pageviews and the explicit events in src/lib/analytics.ts only.
 *
 * The Vercel Marketplace install names the key NEXT_PUBLIC_POSTHOG_KEY; the
 * PostHog docs use NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN. Either works. Without a
 * key nothing initializes, so local development sends nothing.
 *
 * Same conventions as newlogogrowth.ai where they add no data collection:
 * every event carries site: "msgdrift", automated browsers send nothing, and
 * ?internal=1 marks a visit as internal traffic. Cookieless mode stores
 * nothing in the browser, so the internal flag lasts for that page load
 * (including in-app navigation) and has to be added again on a new visit.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
const automated = typeof navigator === "undefined" || navigator.webdriver || ua.includes("HeadlessChrome");

function internalFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("internal") === "1";
  } catch {
    return false;
  }
}

const REPORT_ID = /\/r\/[a-z0-9]+/gi;

function scrub(value: unknown): unknown {
  return typeof value === "string" ? value.replace(REPORT_ID, "/r/[id]") : value;
}

if (key && !automated) {
  const internal = internalFlag();
  try {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
      defaults: "2026-08-30",
      cookieless_mode: "always",
      disable_session_recording: true,
      disable_surveys: true,
      autocapture: false,
      capture_exceptions: false,
      respect_dnt: true,
      sanitize_properties: (properties) => {
        const out: Record<string, unknown> = { ...properties };
        for (const k of Object.keys(out)) {
          if (k.includes("url") || k.includes("pathname") || k.includes("referrer")) out[k] = scrub(out[k]);
        }
        out.site = "msgdrift";
        if (internal) out.internal_user = true;
        return out;
      },
    });
  } catch {
    // Analytics must never break the page.
  }
}
