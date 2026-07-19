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
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned; not portal JSON |
| GET | `/api/session/sync-cookies` | Session cookie mint / refresh | member session | Redirect + Set-Cookie |
| GET | `/api/session/ensure-active-organization` | Active-org persistence | member session | Redirect / plain-text |
| GET/PUT/PATCH | `/api/client/declaration-draft` | Draft autosave | client session | Success `{ data }` · `private, no-store` |

Prefer PUT for full draft replace. Do not add dashboard list GETs under `/api` for same-origin UI — use RSC → domain.

---

## Wire shapes

| Outcome | Body |
|---------|------|
| Success (JSON handlers) | `{ "data": T }` |
| Failure (JSON handlers) | `{ "error": { "code", "message", "details?" } }` |
| Auth / session bridges | Redirect or plain-text |

One URL version — no `/api/v1` / `/api/v2`.

---

## Verify

```text
nextjs_index → get_routes  # keep this file aligned with disk apps/web/app/api/**
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
