# HTTP Route Handlers (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/rest.md` |
| Authority | **Scratch** — api-and-interface-design + Next.js MCP `get_routes` + disk `apps/web/app/api/**` |
| Updated | 2026-07-19 |

Only handlers that exist on disk / MCP. No contract-only path catalogue (would invent APIs without a consumer).

---

## api-now (MCP + disk)

| Method | Path | Purpose | Auth | Notes |
|--------|------|---------|------|-------|
| GET | `/api/health/liveness` | Process up | public | Optional short public cache |
| GET | `/api/health/readiness` | Deps ready | public | Prefer `no-store` |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned; not portal JSON; excluded from OpenAPI YAML |
| GET | `/api/session/sync-cookies` | Session cookie mint / refresh | member session | Redirect + Set-Cookie; excluded from OpenAPI YAML |
| GET | `/api/session/ensure-active-organization` | Active-org persistence | member session | Redirect / plain-text; excluded from OpenAPI YAML |
| GET | `/api/client/declaration-draft` | Load draft | client session | Success `{ data }` · `private, no-store` |
| PUT / PATCH | `/api/client/declaration-draft` | Save draft | client session | Prefer PUT for full replace · `private, no-store` |
| POST | `/api/client/declaration-draft` | Keepalive write alias | client session | Same body/handler as PUT/PATCH |

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

Generated machine file: [`OPEN-001-openapi.yaml`](OPEN-001-openapi.yaml) (health + declaration-draft only).

```text
pnpm openapi:generate
pnpm check:openapi
```

## Verify

```text
1. Disk apps/web/app/api/**/route.ts ↔ this table (exactly 6 handlers)
2. pnpm check:openapi
3. nextjs_index → get_routes when MCP available
```

---

## Decision rule

```text
UI reads                         → RSC → domain (no /api)
UI mutations                     → Server Action → ActionResult
Draft autosave XHR               → /api/client/declaration-draft
Neon Auth callbacks              → /api/auth/[...path]
Session cookie bridges           → /api/session/*
Health probes                    → /api/health/*
External / mobile REST later     → new RH only when a real consumer exists
```

Action contracts: [README.md](README.md).
