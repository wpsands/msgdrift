import { describe, expect, it } from "vitest";
import { extractPage } from "./crawler";

const HTML = `
<!doctype html>
<html>
<head><title>Acme | Revenue Intelligence</title><style>.x{}</style><script>var a=1;</script></head>
<body>
  <header class="site-header"><a href="/">Acme</a><a href="/pricing">Pricing</a></header>
  <nav><a href="/about">About</a><a href="https://twitter.com/acme">Twitter</a></nav>
  <div class="cookie-banner">We use cookies</div>
  <main>
    <h1>Revenue intelligence for <em>mid-market</em> teams</h1>
    <p>Acme turns your call recordings into pipeline you can trust.</p>
    <ul><li>Forecast with confidence</li><li>Coach every rep</li></ul>
    <p>Acme turns your call recordings into pipeline you can trust.</p>
    <a href="/customers/">Customers</a>
    <a href="/blog/post-1?utm=x#top">Blog post</a>
  </main>
  <footer><p>© Acme</p><a href="/legal">Legal</a></footer>
</body>
</html>`;

describe("extractPage", () => {
  const page = extractPage(HTML, "https://acme.com/");

  it("reads the title", () => {
    expect(page.title).toBe("Acme | Revenue Intelligence");
  });

  it("strips chrome and keeps main copy with inline elements joined", () => {
    expect(page.text).toContain("Revenue intelligence for mid-market teams");
    expect(page.text).toContain("Forecast with confidence");
    expect(page.text).not.toContain("We use cookies");
    expect(page.text).not.toContain("© Acme");
    expect(page.text).not.toContain("var a=1");
  });

  it("dedupes repeated blocks", () => {
    const occurrences = page.text.split("pipeline you can trust").length - 1;
    expect(occurrences).toBe(1);
  });

  it("collects internal links from the whole document, normalized", () => {
    expect(page.links).toContain("https://acme.com/pricing");
    expect(page.links).toContain("https://acme.com/about");
    expect(page.links).toContain("https://acme.com/customers/");
    expect(page.links).toContain("https://acme.com/blog/post-1");
    expect(page.links.some((l) => l.includes("twitter.com"))).toBe(false);
  });

  it("strips chrome by whole class tokens, not substrings", () => {
    const html = `<html><body><main>
      <section class="hero-banner text-navy-800"><h1>Welcome to the canvas</h1></section>
      <div class="pad-4 thread-list"><p>Padded copy</p></div>
      <div class="mainMenu"><a href="/x">Menu item</a></div>
      <div id="cookieConsent"><p>Accept cookies</p></div>
      <div class="ad-slot"><p>Sponsored</p></div>
      <nav class="breadcrumb"><a href="/">Home</a></nav>
    </main></body></html>`;
    const text = extractPage(html).text;
    expect(text).toContain("Welcome to the canvas");
    expect(text).toContain("Padded copy");
    expect(text).not.toContain("Menu item");
    expect(text).not.toContain("Accept cookies");
    expect(text).not.toContain("Sponsored");
    expect(text).not.toContain("Home");
  });

  it("never strips a wrapper that contains main", () => {
    const html = `<html><body><div class="site-nav-wrapper"><main><p>Real copy</p></main></div></body></html>`;
    expect(extractPage(html).text).toBe("Real copy");
  });

  it("falls back to body when there is no main", () => {
    const simple = extractPage("<html><body><p>Hello</p><p>World</p></body></html>");
    expect(simple.text).toBe("Hello\nWorld");
  });
});
