# HTTP Route Handlers (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/rest.md` |
| Authority | **Scratch** — api-and-interface-design + Next.js MCP `get_routes` + disk `apps/web/app/api/**` |
| Updated | 2026-07-20 |

Only handlers that exist on disk / MCP. No contract-only path catalogue (would invent APIs without a consumer).

---

## api-now (MCP + disk)

| Method | Path | Purpose | Auth | Notes |
|--------|------|---------|------|-------|
| GET | `/api/health/liveness` | Process up | public | Optional short public cache |
| GET | `/api/health/readiness` | Deps ready | public | Prefer `no-store`; **503** when `status` is `not_ready` (critical storage down); **200** for `ready` / `degraded` |
| GET | `/api/metrics` | Prometheus scrape | bearer `METRICS_SCRAPE_TOKEN` | Fail closed when unset → **404**; wrong/missing bearer → **401**; `text/plain` Prometheus exposition |
| POST | `/api/ai/chat` | The Machine UIMessage stream | member session (`getApiSession`) | AI SDK stream; rate bucket `ai_chat`; fail-closed without Gateway credentials locally; **excluded** from OpenAPI YAML (stream — see [ai-the-machine-dna.md](../ai/ai-the-machine-dna.md)) |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned; not portal JSON; excluded from OpenAPI YAML |
| GET | `/api/session/sync-cookies` | Session cookie mint / refresh | member session | Redirect + Set-Cookie; excluded from OpenAPI YAML |
| GET | `/api/session/ensure-active-organization` | Active-org persistence | member session | Redirect / plain-text; excluded from OpenAPI YAML |

Do not add dashboard list GETs under `/api` for same-origin UI — use RSC → domain.

---

## Wire shapes

| Outcome | Body |
|---------|------|
| Success (JSON handlers) | `{ "data": T }` |
| Failure (JSON handlers) | `{ "error": { "code", "message", "details?" } }` |
| Auth / session bridges | Redirect or plain-text |

One URL version — no `/api/v1` / `/api/v2`.

---

## OpenAPI

Generated machine file: [`OPEN-001-openapi.yaml`](OPEN-001-openapi.yaml) (health probes + Prometheus scrape).

```text
pnpm openapi:generate
pnpm check:openapi
```

## Verify

```text
1. Disk apps/web/app/api/**/route.ts ↔ this table
2. pnpm check:openapi
3. nextjs_index → get_routes when MCP available
```

---

## Decision rule

```text
UI reads                         → RSC → domain (no /api)
UI mutations                     → Server Action → ActionResult
Neon Auth callbacks              → /api/auth/[...path]
Session cookie bridges           → /api/session/*
Health probes                    → /api/health/*
Prometheus scrape                → /api/metrics (bearer METRICS_SCRAPE_TOKEN)
The Machine chat stream          → /api/ai/chat (member session + AI Gateway)
External / mobile REST later     → new RH only when a real consumer exists
```

Action contracts: [README.md](README.md).
