import express, { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { rateLimiter } from "./rateLimiter";
import { chatRouter } from "./routes/chat";
import { metricsRouter } from "./routes/metrics";
import { orderedProviders } from "./providers";

const app = express();
app.use(express.json());

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== config.gatewayApiKey) {
    return res.status(401).json({ error: "missing or invalid Authorization bearer token" });
  }
  next();
}

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  const { allowed, remaining, resetInSeconds } = rateLimiter.allow(key);
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  if (!allowed) {
    res.setHeader("Retry-After", String(resetInSeconds));
    return res.status(429).json({ error: "rate limit exceeded", retryInSeconds: resetInSeconds });
  }
  next();
}

app.get("/health", (_req, res) => {
  const configured = orderedProviders()
    .filter((p) => p.isConfigured())
    .map((p) => p.name);
  res.json({ status: "ok", configuredProviders: configured });
});

app.use(requireAuth, rateLimit, chatRouter, metricsRouter);

app.listen(config.port, () => {
  console.log(`llm-gateway listening on http://localhost:${config.port}`);
});
