import "dotenv/config";

function int(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? parseInt(v, 10) : fallback;
}

export const config = {
  port: int("PORT", 3000),
  gatewayApiKey: process.env.GATEWAY_API_KEY || "change-me",

  providerOrder: (process.env.PROVIDER_ORDER || "groq,gemini,ollama")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3.2",
  },

  redisUrl: process.env.REDIS_URL || "",
  cacheTtlSeconds: int("CACHE_TTL_SECONDS", 3600),

  rateLimitMax: int("RATE_LIMIT_MAX", 30),
  rateLimitWindowSeconds: int("RATE_LIMIT_WINDOW_SECONDS", 60),

  logPath: process.env.LOG_PATH || "./gateway-requests.jsonl",
};
