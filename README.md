# llm-gateway

A small reliability layer in front of multiple free LLM providers. Instead of
calling one AI API directly, clients call this gateway, which:

- **Caches** identical requests so repeat questions skip the AI call entirely
- **Rate limits** per client to protect the service (and your free-tier quota)
- **Routes with fallback** — tries providers in order and moves to the next
  one on error or missing credentials, instead of failing the request
- **Logs every request** (provider used, latency, cache hit/miss, errors) to
  a local JSONL file, exposed via `/metrics`

```
Client → auth → rate limit → cache? → router → [Groq → Gemini → Ollama]
                                                        ↓
                                                  JSONL request log
```

## Why

Free LLM APIs come with tight rate limits and occasional outages. A gateway
like this is the same shape as what production AI products run in front of
their model calls — the interesting part isn't calling an API, it's making
that call reliable.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in at least one provider in `.env`:

- **Groq** (fast, generous free tier) — get a key at https://console.groq.com.
  Groq retires older models periodically; if `GROQ_MODEL` 404s, list what's
  currently available on your key with
  `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`
- **Gemini** (Google's free tier) — get a key at https://aistudio.google.com/apikey
- **Ollama** (fully local, no key, no rate limit) — install from https://ollama.com,
  then `ollama pull llama3.2` and `ollama serve`

Set `GATEWAY_API_KEY` to any string — that's the token clients must send back.

Caching uses an in-memory `Map` by default. To use real Redis instead (so
the cache survives restarts and can be shared across instances), get a free
database at https://upstash.com and set `REDIS_URL`.

## Run

```bash
npm run dev
```

## Try it

```bash
curl http://localhost:3000/health

curl http://localhost:3000/v1/chat \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hi in 5 words"}]}'

curl http://localhost:3000/metrics -H "Authorization: Bearer change-me"
```

Send the same `/v1/chat` request twice — the second response comes back with
`"cacheHit": true` and near-zero latency.

## Project structure

```
src/
  config.ts          env vars, single source of truth
  cache.ts            Redis-or-in-memory cache
  rateLimiter.ts       fixed-window rate limiter
  db.ts                JSONL request log + /metrics aggregation
  router.ts            cache lookup → provider fallback chain → logging
  providers/           one adapter per provider, normalized to one interface
  routes/               chat.ts (POST /v1/chat), metrics.ts (GET /metrics)
  server.ts             express app, auth + rate-limit middleware
```

## Deploying for free

This repo includes a `render.yaml` Blueprint, so deploying to Render's free
tier (no credit card) takes a few clicks:

1. Go to https://dashboard.render.com/blueprints → **New Blueprint Instance**
2. Connect your GitHub account and pick the `llm-gateway` repo
3. Render reads `render.yaml` and prompts you for the secret values
   (`GATEWAY_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`) — paste your Groq
   key in directly on Render's dashboard, not anywhere else
4. Deploy — you'll get a public URL like `https://llm-gateway-xxxx.onrender.com`

Notes:
- The free plan spins the service down after 15 minutes of no traffic; the
  first request after idle takes ~30-50s to cold-start, then it's fast again
- `ollama` is dropped from `PROVIDER_ORDER` in `render.yaml` since there's no
  local Ollama instance reachable from Render — it's still in the code, so
  local dev can still fall back to it
- **Upstash** free tier for real Redis (optional — in-memory works for a demo,
  but resets on every cold start on Render's free plan, so Redis is worth it
  if you deploy this for real)
- The JSONL log works fine for a single-instance deployment; swap for
  Postgres (e.g. Supabase free tier) if you outgrow one instance

## What this demonstrates

Caching, rate limiting, fallback/circuit-breaking across dependencies, and
basic observability — the core building blocks of a reliable service, applied
to LLM calls specifically.
