import { describe, expect, it } from "vitest";
import { isPrivateAddress, normalizeSiteUrl, UnsafeUrlError } from "./url-safety";

describe("normalizeSiteUrl", () => {
  it("adds https when the scheme is missing", () => {
    expect(normalizeSiteUrl("acme.com").toString()).toBe("https://acme.com/");
    expect(normalizeSiteUrl("  www.acme.com/pricing ").toString()).toBe("https://www.acme.com/pricing");
  });

  it("drops fragments", () => {
    expect(normalizeSiteUrl("https://acme.com/a#top").toString()).toBe("https://acme.com/a");
  });

  it("rejects non-http schemes, credentials, and local hosts", () => {
    expect(() => normalizeSiteUrl("ftp://acme.com")).toThrow(UnsafeUrlError);
    expect(() => normalizeSiteUrl("file:///etc/passwd")).toThrow(UnsafeUrlError);
    expect(() => normalizeSiteUrl("https://user:pw@acme.com")).toThrow(UnsafeUrlError);
    expect(() => normalizeSiteUrl("http://localhost:3000")).toThrow(UnsafeUrlError);
    expect(() => normalizeSiteUrl("http://intranet")).toThrow(UnsafeUrlError);
    expect(() => normalizeSiteUrl("http://169.254.169.254/latest/meta-data")).toThrow(UnsafeUrlError);
    expect(() => normalizeSiteUrl("http://10.0.0.5")).toThrow(UnsafeUrlError);
  });
});

describe("isPrivateAddress", () => {
  it("flags private, loopback, link-local and reserved ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "76.76.21.21", "172.32.0.1", "2606:4700::6810:84e5"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
