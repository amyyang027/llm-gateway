import fs from "fs";
import { config } from "./config";

interface RequestLogEntry {
  createdAt: string;
  provider: string | null;
  cacheHit: boolean;
  status: "ok" | "error";
  latencyMs: number | null;
  error?: string;
}

/** Append-only JSONL log — no native dependencies, easy to swap for
 * Postgres/SQLite later without changing the call sites below. */
export function logRequest(entry: Omit<RequestLogEntry, "createdAt">) {
  const line: RequestLogEntry = { createdAt: new Date().toISOString(), ...entry };
  fs.appendFileSync(config.logPath, JSON.stringify(line) + "\n");
}

function readAll(): RequestLogEntry[] {
  if (!fs.existsSync(config.logPath)) return [];
  return fs
    .readFileSync(config.logPath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RequestLogEntry);
}

export function getMetrics() {
  const entries = readAll();
  const total = entries.length;
  const cacheHits = entries.filter((e) => e.cacheHit).length;
  const errors = entries.filter((e) => e.status === "error").length;
  const latencies = entries.map((e) => e.latencyMs).filter((n): n is number => n != null);
  const avgLatencyMs = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  const byProvider: Record<string, { requests: number; avgLatencyMs: number | null }> = {};
  for (const e of entries) {
    if (!e.provider) continue;
    byProvider[e.provider] ??= { requests: 0, avgLatencyMs: null };
    byProvider[e.provider].requests += 1;
  }
  for (const name of Object.keys(byProvider)) {
    const lat = entries
      .filter((e) => e.provider === name && e.latencyMs != null)
      .map((e) => e.latencyMs as number);
    byProvider[name].avgLatencyMs = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null;
  }

  return {
    totals: { totalRequests: total, cacheHits, errors, avgLatencyMs },
    byProvider,
  };
}
