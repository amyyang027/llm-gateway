import { cache, cacheKeyFor } from "./cache";
import { config } from "./config";
import { logRequest } from "./db";
import { orderedProviders } from "./providers";
import { ChatMessage, ProviderError } from "./providers/types";

export interface RouteResult {
  content: string;
  provider: string;
  cacheHit: boolean;
  latencyMs: number;
}

/** Tries providers in order, falling back to the next on failure.
 * Caches successful responses so repeat questions skip the AI call entirely. */
export async function routeChat(messages: ChatMessage[]): Promise<RouteResult> {
  const key = cacheKeyFor(messages);
  const cached = await cache.get(key);
  if (cached) {
    logRequest({ provider: null, cacheHit: true, status: "ok", latencyMs: 0 });
    return { content: cached, provider: "cache", cacheHit: true, latencyMs: 0 };
  }

  const providers = orderedProviders().filter((p) => p.isConfigured());
  if (providers.length === 0) {
    throw new Error(
      "No providers configured. Set at least one of GROQ_API_KEY / GEMINI_API_KEY, or run Ollama locally."
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const result = await provider.chat(messages);
      await cache.set(key, result.content, config.cacheTtlSeconds);
      logRequest({
        provider: result.provider,
        cacheHit: false,
        status: "ok",
        latencyMs: result.latencyMs,
      });
      return { content: result.content, provider: result.provider, cacheHit: false, latencyMs: result.latencyMs };
    } catch (err) {
      const message = err instanceof ProviderError ? err.message : String(err);
      errors.push(message);
      logRequest({
        provider: provider.name,
        cacheHit: false,
        status: "error",
        latencyMs: null,
        error: message,
      });
      // fall through to the next provider in the chain
    }
  }

  throw new Error(`All providers failed: ${errors.join(" | ")}`);
}
