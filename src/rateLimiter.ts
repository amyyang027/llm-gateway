import { config } from "./config";

/** Fixed-window rate limiter, keyed by client identifier (e.g. IP).
 * In-memory is fine for a single-instance demo; swap for a Redis-backed
 * counter (INCR + EXPIRE) if this ever runs behind multiple instances. */
class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();

  allow(key: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const now = Date.now();
    const windowMs = config.rateLimitWindowSeconds * 1000;
    const entry = this.hits.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: config.rateLimitMax - 1, resetInSeconds: config.rateLimitWindowSeconds };
    }

    entry.count += 1;
    const resetInSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);

    if (entry.count > config.rateLimitMax) {
      return { allowed: false, remaining: 0, resetInSeconds };
    }
    return { allowed: true, remaining: config.rateLimitMax - entry.count, resetInSeconds };
  }
}

export const rateLimiter = new RateLimiter();
