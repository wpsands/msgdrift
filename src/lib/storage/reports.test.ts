import { describe, expect, it } from "vitest";
import { hashToken, isValidOwnerToken, isValidReportId, newOwnerToken, newReportId, publicReport, tokenMatches } from "./reports";
import type { DriftReport } from "@/lib/engine/schema";

describe("report ids", () => {
  it("are 12 chars from the safe alphabet and validate", () => {
    const id = newReportId();
    expect(id).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{12}$/);
    expect(isValidReportId(id)).toBe(true);
    expect(isValidReportId("../etc")).toBe(false);
    expect(isValidReportId("ABC")).toBe(false);
  });
});

describe("owner tokens", () => {
  it("generate, validate, hash, and compare in constant time", () => {
    const token = newOwnerToken();
    expect(isValidOwnerToken(token)).toBe(true);
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(newOwnerToken(), hash)).toBe(false);
    expect(tokenMatches(token, undefined)).toBe(false);
    expect(tokenMatches(token, "zz")).toBe(false);
  });
});

describe("publicReport", () => {
  it("strips the owner hash and nothing else", () => {
    const report = { id: "abc", ownerTokenHash: "deadbeef", site: "x" } as unknown as DriftReport;
    const pub = publicReport(report);
    expect("ownerTokenHash" in pub).toBe(false);
    expect(pub.id).toBe("abc");
    expect(report.ownerTokenHash).toBe("deadbeef");
  });
});
