import { describe, expect, it } from "vitest";
import { hashVisitor, MemoryLimiter, visitorKey } from "./ratelimit";

describe("hashVisitor", () => {
  it("is stable, salted, and never contains the address", () => {
    const a = hashVisitor("203.0.113.7", "salt-a");
    expect(a).toBe(hashVisitor("203.0.113.7", "salt-a"));
    expect(a).not.toBe(hashVisitor("203.0.113.7", "salt-b"));
    expect(a).not.toContain("203");
    expect(a).toHaveLength(22);
  });

  it("reads the first forwarded address", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "198.51.100.9, 10.0.0.1" } });
    expect(visitorKey(req)).toBe(hashVisitor("198.51.100.9"));
  });
});

describe("MemoryLimiter", () => {
  it("allows up to the limit inside the window and then blocks", async () => {
    const l = new MemoryLimiter();
    const r1 = await l.check("k", 2, 60, "t");
    const r2 = await l.check("k", 2, 60, "t");
    const r3 = await l.check("k", 2, 60, "t");
    expect(r1.ok && r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.resetAt).toBeGreaterThan(Date.now());
  });
});
