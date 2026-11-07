import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * Guards for user-supplied URLs. The scanner fetches arbitrary pages on behalf of
 * anonymous visitors, so it must refuse anything that could reach internal networks.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"]);

export function normalizeSiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new UnsafeUrlError("Enter a website URL.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new UnsafeUrlError("That does not look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are supported.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed.");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new UnsafeUrlError("Local and internal hostnames cannot be scanned.");
  }
  if (!host.includes(".") && !isIP(host)) {
    throw new UnsafeUrlError("Enter a public domain name, like example.com.");
  }
  if (isIP(host) && isPrivateAddress(host)) {
    throw new UnsafeUrlError("Private network addresses cannot be scanned.");
  }
  url.hash = "";
  return url;
}

/** Resolve the hostname and refuse if any address is private, loopback, or link-local. */
export async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname;
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError("Private network addresses cannot be scanned.");
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError(`Could not resolve ${host}.`);
  }
  if (addresses.length === 0) throw new UnsafeUrlError(`Could not resolve ${host}.`);
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new UnsafeUrlError(`${host} resolves to a private address and cannot be scanned.`);
    }
  }
}

export function isPrivateAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) return isPrivateV4(address);
  if (kind === 6) return isPrivateV6(address);
  return true;
}

function isPrivateV4(address: string): boolean {
  const parts = address.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true; // this network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier NAT
  if (a === 192 && b === 0 && parts[2] === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function isPrivateV6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("ff")) return true; // multicast
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}
