import { createHash } from "node:crypto";

/**
 * Rate limiting for anonymous scans. Upstash Redis when configured, otherwise an
 * in-process sliding window that is good enough for local development.
 * Visitors are keyed by a salted hash of their IP address; the address itself
 * is never written anywhere.
 */

export interface LimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  scope: string;
}

export interface Limiter {
  check(key: string, limit: number, windowSeconds: number, scope: string): Promise<LimitResult>;
}

export class MemoryLimiter implements Limiter {
  private hits = new Map<string, number[]>();
  async check(key: string, limit: number, windowSeconds: number, scope: string): Promise<LimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const ok = recent.length < limit;
    if (ok) recent.push(now);
    this.hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return { ok, limit, remaining: Math.max(0, limit - recent.length), resetAt: oldest + windowMs, scope };
  }
}

class UpstashLimiter implements Limiter {
  private cache = new Map<string, Promise<unknown>>();
  async check(key: string, limit: number, windowSeconds: number, scope: string): Promise<LimitResult> {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const cacheKey = `${limit}:${windowSeconds}`;
    let limiter = this.cache.get(cacheKey) as Promise<InstanceType<typeof Ratelimit>> | undefined;
    if (!limiter) {
      limiter = Promise.resolve(
        new Ratelimit({
          redis: new Redis({ url: redisUrl()!, token: redisToken()! }),
          limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
          prefix: "msgdrift",
        }),
      );
      this.cache.set(cacheKey, limiter);
    }
    const result = await (await limiter).limit(key);
    return { ok: result.success, limit: result.limit, remaining: result.remaining, resetAt: result.reset, scope };
  }
}

/** The Vercel Marketplace install names these KV_*; a direct Upstash setup names them UPSTASH_*. */
function redisUrl(): string | undefined {
  return process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
}
function redisToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
}

let limiter: Limiter | null = null;

export function getLimiter(): Limiter {
  if (limiter) return limiter;
  limiter = redisUrl() && redisToken() ? new UpstashLimiter() : new MemoryLimiter();
  return limiter;
}

export const SCAN_LIMITS = {
  perIpHourly: Number(process.env.SCAN_LIMIT_IP_HOURLY ?? 3),
  perIpDaily: Number(process.env.SCAN_LIMIT_IP_DAILY ?? 10),
  globalDaily: Number(process.env.SCAN_LIMIT_GLOBAL_DAILY ?? 200),
  discoverHourly: Number(process.env.DISCOVER_LIMIT_IP_HOURLY ?? 30),
};

function rawClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Salted, truncated hash of the IP. Stable within a deployment, not reversible, not an address. */
export function hashVisitor(ip: string, salt = process.env.RATE_LIMIT_SALT ?? "msgdrift-dev-salt"): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("base64url").slice(0, 22);
}

export function visitorKey(request: Request): string {
  return hashVisitor(rawClientIp(request));
}

/** Returns null when allowed, or a human message when blocked. */
export async function checkScanAllowed(visitor: string): Promise<{ blocked: false } | { blocked: true; message: string; retryAfterSeconds: number }> {
  const l = getLimiter();
  const checks = [
    { r: await l.check(`scan:v:hour:${visitor}`, SCAN_LIMITS.perIpHourly, 60 * 60, "hourly"), message: `You have used your ${SCAN_LIMITS.perIpHourly} scans for this hour.` },
    { r: await l.check(`scan:v:day:${visitor}`, SCAN_LIMITS.perIpDaily, 60 * 60 * 24, "daily"), message: `You have used your ${SCAN_LIMITS.perIpDaily} scans for today.` },
    { r: await l.check("scan:global:day", SCAN_LIMITS.globalDaily, 60 * 60 * 24, "global"), message: "msgdrift has hit its daily scan budget. Try again tomorrow, or run the open-source CLI with your own key." },
  ];
  for (const { r, message } of checks) {
    if (!r.ok) {
      const retryAfterSeconds = Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000));
      return { blocked: true, message, retryAfterSeconds };
    }
  }
  return { blocked: false };
}
