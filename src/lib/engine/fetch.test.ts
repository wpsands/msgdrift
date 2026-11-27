import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage, markdownToText, MAX_REDIRECTS, needsRender, type FetchResult } from "./crawler";

// IP-literal hosts so the public-host check needs no DNS.
const PUBLIC = "http://93.184.216.34";
const LONG_COPY = `<html><body><main><p>${"Revenue intelligence for mid-market sales teams. ".repeat(10)}</p></main></body></html>`;

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}
function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchPage redirects", () => {
  it("refuses a redirect to a private address without requesting it", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect("http://169.254.169.254/latest/meta-data/"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPage(`${PUBLIC}/start`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toMatch(/^Redirect refused/);
    expect(result.text).toBe("");
  });

  it("refuses a redirect to an internal hostname without requesting it", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect("http://localhost:8080/admin"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPage(`${PUBLIC}/start`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toMatch(/^Redirect refused/);
  });

  it("follows public redirects hop by hop and reports the final URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("/step-two", 301))
      .mockResolvedValueOnce(redirect(`${PUBLIC}/final`))
      .mockResolvedValueOnce(html(LONG_COPY));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPage(`${PUBLIC}/start`);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toBe(`${PUBLIC}/step-two`);
    expect(fetchMock.mock.calls.every((c) => c[1].redirect === "manual")).toBe(true);
    expect(result.error).toBeNull();
    expect(result.finalUrl).toBe(`${PUBLIC}/final`);
    expect(result.text).toContain("Revenue intelligence");
  });

  it("stops after the redirect cap", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => redirect(`${PUBLIC}/loop`));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPage(`${PUBLIC}/loop`);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
    expect(result.error).toMatch(/Too many redirects/);
  });
});

describe("rendered fallback", () => {
  const thinShell = () => html("<html><body><div id='root'></div><noscript>Enable JavaScript</noscript></body></html>");

  it("is not used when no render key is configured", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");
    const fetchMock = vi.fn().mockResolvedValueOnce(thinShell());
    vi.stubGlobal("fetch", fetchMock);
    await fetchPage(`${PUBLIC}/app`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders a thin JavaScript page and keeps the rendered copy", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
    const rendered = {
      success: true,
      data: {
        markdown: "# Revenue intelligence\n\nAcme turns call recordings into [pipeline](/pipeline) you can trust.\n\n![logo](/logo.png)",
        links: [`${PUBLIC}/pricing?utm=x`, "https://twitter.com/acme"],
        metadata: { title: "Acme", url: `${PUBLIC}/app`, statusCode: 200 },
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(thinShell())
      .mockResolvedValueOnce(new Response(JSON.stringify(rendered), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPage(`${PUBLIC}/app`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://api.firecrawl.dev/v2/scrape");
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(sent.url).toBe(`${PUBLIC}/app`);
    expect(result.error).toBeNull();
    expect(result.title).toBe("Acme");
    expect(result.text).toBe("Revenue intelligence\nAcme turns call recordings into pipeline you can trust.");
    expect(result.links).toEqual([`${PUBLIC}/pricing`]);
  });

  it("keeps the plain result when rendering fails", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(html("<html><body><main><p>Short copy</p></main></body></html>"))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPage(`${PUBLIC}/app`);
    expect(result.text).toBe("Short copy");
  });

  it("never renders a refused redirect", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect("http://10.0.0.5/"));
    vi.stubGlobal("fetch", fetchMock);
    await fetchPage(`${PUBLIC}/start`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("needsRender", () => {
  const base: FetchResult = { url: "u", finalUrl: "u", title: "", text: "", fetchStatus: 200, error: null, links: [] };
  it("retries thin pages, bot walls, and timeouts", () => {
    expect(needsRender({ ...base, text: "tiny" })).toBe(true);
    expect(needsRender({ ...base, fetchStatus: 403, error: "HTTP 403" })).toBe(true);
    expect(needsRender({ ...base, fetchStatus: 0, error: "Timed out after 20s" })).toBe(true);
  });
  it("does not retry full pages, missing pages, refusals, or non-HTML", () => {
    expect(needsRender({ ...base, text: "x".repeat(500) })).toBe(false);
    expect(needsRender({ ...base, fetchStatus: 404, error: "HTTP 404" })).toBe(false);
    expect(needsRender({ ...base, fetchStatus: 0, error: "Redirect refused: Private network addresses cannot be scanned." })).toBe(false);
    expect(needsRender({ ...base, error: "Not an HTML page (application/pdf)" })).toBe(false);
  });
});

describe("markdownToText", () => {
  it("strips markup, tables, rules, and repeats", () => {
    const md = "## Plans\n\n| Tier | Price |\n|---|---|\n| **Pro** | $49 |\n\n---\n\n- Coach every rep\n- Coach every rep";
    expect(markdownToText(md)).toBe("Plans\nTier Price\nPro $49\nCoach every rep");
  });
});
