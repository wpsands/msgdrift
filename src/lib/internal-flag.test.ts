import { describe, expect, it } from "vitest";
import { INTERNAL_KEY, resolveInternalFlag } from "./internal-flag";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe("resolveInternalFlag", () => {
  it("is false for a normal visitor and stores nothing", () => {
    const s = memoryStorage();
    expect(resolveInternalFlag("", s)).toBe(false);
    expect(s.data.size).toBe(0);
  });

  it("keeps the flag on later pages after ?internal=1", () => {
    const s = memoryStorage();
    expect(resolveInternalFlag("?internal=1", s)).toBe(true);
    expect(s.data.get(INTERNAL_KEY)).toBe("1");
    expect(resolveInternalFlag("", s)).toBe(true);
    expect(resolveInternalFlag("?utm_source=x", s)).toBe(true);
  });

  it("clears the flag with ?internal=0", () => {
    const s = memoryStorage();
    resolveInternalFlag("?internal=1", s);
    expect(resolveInternalFlag("?internal=0", s)).toBe(false);
    expect(resolveInternalFlag("", s)).toBe(false);
  });

  it("falls back to the URL when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(resolveInternalFlag("?internal=1", broken)).toBe(true);
    expect(resolveInternalFlag("", broken)).toBe(false);
  });

  it("works with no storage at all", () => {
    expect(resolveInternalFlag("?internal=1", null)).toBe(true);
    expect(resolveInternalFlag("", null)).toBe(false);
  });
});
