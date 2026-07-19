# api-now — Route Handler allowlist

**Scratch SSOT:** [docs-V2/api/rest.md](../../../docs-V2/api/rest.md)  
**Disk:** `apps/web/app/api/**/route.ts` (exactly six handlers)  
**Living REST-001:** retired on this checkout — do not invent contract-only catalogues from history

This file mirrors the **api-now** allowlist. Verify with `Test-Path` / `pnpm check:openapi` — never trust a stale Cursor index alone.

---

## Allowlisted Route Handlers (api-now)

| Method | Path | Purpose | Auth | Cache / notes |
|--------|------|---------|------|---------------|
| GET | `/api/health/liveness` | Process up | public | Optional short public cache |
| GET | `/api/health/readiness` | DB / deps ready | public | Prefer `no-store` |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned; not portal JSON; excluded from OpenAPI YAML |
| GET | `/api/session/sync-cookies` | Cookie-safe session mint / refresh | member session | Redirect; not `{ data }` JSON; excluded from YAML |
| GET | `/api/session/ensure-active-organization` | Active-org persistence | member session | Redirect / plain-text; excluded from YAML |
| GET | `/api/client/declaration-draft` | Load draft | client session | `{ data }` · `private, no-store` |
| PUT / PATCH | `/api/client/declaration-draft` | Save draft | client session | Prefer PUT · `private, no-store` |
| POST | `/api/client/declaration-draft` | Keepalive write alias | client session | Same handler as PUT/PATCH |

Success JSON for health + draft uses `{ data: T }`. Failures use bare `APIErrorBody`. OpenAPI: [openapi.md](openapi.md).

**Only this set is api-now.** Do not add handlers for dashboard list reads.

---

## Prohibition — do not scaffold these as Route Handlers for web UI

Web UI adapters call `modules/*/domain` via RSC + Server Actions. Do **not** create Route Handlers for clients, declarations lists, assignments, share links, account, org users, or FFT until a real external consumer exists ([docs-V2/api/rest.md](../../../docs-V2/api/rest.md) decision rule).

> Neon-owned password/email flows stay on Neon Auth UI / `/api/auth/*` — do not duplicate.

---

## Feed Farm Trade (gated — not api-now)

**Do not implement as Route Handlers until an external consumer is confirmed.** Web UI continues via FFT Server Actions. Paths must stay **locale-free** (no `:locale` segment). See `/feed-farm-trade` skill before touching HTTP.

---

## Pagination shape (when HTTP lists exist)

Keep success under `{ data: T }`. Prefer:

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 0,
      "totalPages": 0
    }
  }
}
```

Do **not** introduce top-level `pagination` beside `data`. A shared `PaginatedResult` Zod helper is a **named gap** — add only when the first list is HTTP-exposed.

---

## Decision rule summary

```
Task                                                  Right adapter
────────────────────────────────────────────────────────────────────
Dashboard reads (declarations, clients list)        → RSC → domain (no /api)
Client workspace reads (assignment, questions)      → RSC → domain (no /api)
Account reads                                       → RSC → domain (no /api)
Client mutations (submit, draft, onboard)           → Server Action
Operator mutations (create, delete, update)         → Server Action
Draft autosave from browser XHR                     → /api/client/declaration-draft (api-now)
Neon Auth UI callbacks / magic-link                 → /api/auth/[...path] (api-now)
Health probes (uptime, readiness)                   → /api/health/* (api-now)
Session cookie bridges                              → /api/session/* (api-now)
Future mobile / external REST consumer              → new RH only when consumer exists
```
