import { describe, expect, it } from "vitest";
import { humanize, rankCandidates } from "./discover";

describe("humanize", () => {
  it("turns the last path segment into a label", () => {
    expect(humanize("/solutions/revenue-ops")).toBe("Revenue ops");
    expect(humanize("/why_acme")).toBe("Why acme");
    expect(humanize("/")).toBe("Page");
  });
});

describe("rankCandidates", () => {
  const origin = new URL("https://acme.com");
  const links = [
    "https://acme.com/",
    "https://acme.com/blog/how-we-work",
    "https://acme.com/pricing",
    "https://acme.com/about/",
    "https://www.acme.com/product",
    "https://acme.com/careers",
    "https://acme.com/contact",
    "https://acme.com/solutions/enterprise",
    "https://acme.com/brochure.pdf",
    "https://other.com/pricing",
    "https://acme.com/partners",
    "not a url",
  ];
  const ranked = rankCandidates(links, origin);
  const urls = ranked.map((r) => r.url);

  it("puts pricing and product first and drops blog, careers, contact, assets, and other hosts", () => {
    expect(urls[0]).toBe("https://acme.com/pricing");
    expect(urls[1]).toBe("https://acme.com/product");
    expect(urls).not.toContain("https://acme.com/blog/how-we-work");
    expect(urls).not.toContain("https://acme.com/careers");
    expect(urls).not.toContain("https://acme.com/contact");
    expect(urls).not.toContain("https://acme.com/brochure.pdf");
    expect(urls.some((u) => u.includes("other.com"))).toBe(false);
  });

  it("assigns importance and labels", () => {
    const pricing = ranked.find((r) => r.url.endsWith("/pricing"));
    expect(pricing?.importance).toBe("high");
    expect(pricing?.label).toBe("Pricing");
    const about = ranked.find((r) => r.url.endsWith("/about"));
    expect(about?.importance).toBe("medium");
    const sub = ranked.find((r) => r.url.endsWith("/solutions/enterprise"));
    expect(sub?.label).toBe("Enterprise");
    expect(sub?.importance).toBe("medium");
    const partners = ranked.find((r) => r.url.endsWith("/partners"));
    expect(partners?.importance).toBe("low");
    expect(partners?.reason).toMatch(/Top-level/);
  });

  it("normalizes trailing slashes and www", () => {
    expect(urls).toContain("https://acme.com/about");
    expect(urls).toContain("https://acme.com/product");
  });
});
