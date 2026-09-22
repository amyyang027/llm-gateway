import Redis from "ioredis";
import crypto from "crypto";
import { config } from "./config";
import { ChatMessage } from "./providers/types";

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/** Falls back to a plain in-memory Map when REDIS_URL isn't set, so the
 * gateway runs with zero external dependencies out of the box. */
class InMemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

class RedisCache implements Cache {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, "EX", ttlSeconds);
  }
}

export const cache: Cache = config.redisUrl
  ? new RedisCache(config.redisUrl)
  : new InMemoryCache();

/** Deterministic cache key from the request body — same messages/model → same key. */
export function cacheKeyFor(messages: ChatMessage[]): string {
  const normalized = JSON.stringify(messages);
  return "chat:" + crypto.createHash("sha256").update(normalized).digest("hex");
}
