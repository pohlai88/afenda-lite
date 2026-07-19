# api-now — Route Handler allowlist

**Scratch SSOT:** [docs-V2/api/rest.md](../../../docs-V2/api/rest.md)  
**Disk:** `apps/web/app/api/**/route.ts`  
**Living REST-001:** retired on this checkout — do not invent contract-only catalogues from history

This file mirrors the **api-now** allowlist. Verify with `Test-Path` / `pnpm check:openapi` — never trust a stale Cursor index alone.

---

## Allowlisted Route Handlers (api-now)

| Method | Path | Purpose | Auth | Cache / notes |
|--------|------|---------|------|---------------|
| GET | `/api/health/liveness` | Process up | public | Optional short public cache |
| GET | `/api/health/readiness` | DB / deps ready | public | Prefer `no-store`; **503** when `not_ready` |
| GET | `/api/metrics` | Prometheus scrape | bearer `METRICS_SCRAPE_TOKEN` | Fail closed unset → **404**; bad bearer → **401**; `text/plain` |
| POST | `/api/ai/chat` | The Machine UIMessage stream | member session | AI SDK stream; **excluded** from OpenAPI YAML |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned; not portal JSON; excluded from OpenAPI YAML |
| GET | `/api/session/sync-cookies` | Cookie-safe session mint / refresh | member session | Redirect; not `{ data }` JSON; excluded from YAML |
| GET | `/api/session/ensure-active-organization` | Active-org persistence | member session | Redirect / plain-text; excluded from YAML |

Success JSON for health uses `{ data: T }`. Failures use bare `APIErrorBody`. Metrics is Prometheus text (not `{ data }`). OpenAPI: [openapi.md](openapi.md) — health + metrics YAML include set (`/api/ai/chat` excluded).

**Only this set is api-now.** Do not add handlers for dashboard list reads. **Removed:** `/api/client/declaration-draft` (Declarations product wiped).

---

## Prohibition — do not scaffold these as Route Handlers for web UI

Web UI adapters call `modules/*/domain` via RSC + Server Actions. Do **not** create Route Handlers for clients, wiped Declarations lists/drafts, assignments, share links, account, org users, or FFT until a real external consumer exists **and** a living product module is approved ([docs-V2/api/rest.md](../../../docs-V2/api/rest.md) decision rule).

> Neon-owned password/email flows stay on Neon Auth UI / `/api/auth/*` — do not duplicate.

---

## Feed Farm Trade / Declarations HTTP

**Removed** with product domains (nuclear wipe). Do not implement FFT or declaration-draft Route Handlers. Do not route to deleted `feed-farm-trade` skill.

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
Dashboard / org-admin reads                         → RSC → domain (no /api)
Account reads                                       → RSC → domain (no /api)
Operator / identity mutations                       → Server Action
Neon Auth UI callbacks / magic-link                 → /api/auth/[...path] (api-now)
Health probes (uptime, readiness)                   → /api/health/* (api-now)
Session cookie bridges                              → /api/session/* (api-now)
Future mobile / external REST consumer              → new RH only when consumer exists
Wiped Declarations draft / FFT HTTP                 → do not recreate
```
