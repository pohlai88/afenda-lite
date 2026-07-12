# api-now — current Route Handler inventory

**Source:** [docs/api/REST-001-rest-resources.md](../../../docs/api/REST-001-rest-resources.md)

This file mirrors what **is implemented today** as `app/api/**` Route Handlers vs what is **contract-only** (canonical REST shapes consumed via RSC + Server Actions until an external consumer needs HTTP). SSOT is REST-001.

---

## Implemented Route Handlers (api-now)

| Method | Path | Purpose | Auth | Cache |
|--------|------|---------|------|-------|
| GET | `/api/health/liveness` | Process up | public | Optional short public CDN cache |
| GET | `/api/health/readiness` | DB / deps ready | public | Prefer `no-store` |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned |
| GET/PUT/PATCH | `/api/client/declaration-draft` | Draft autosave (POST keepalive alias) | client session | `private, no-store` |

**No other Route Handlers exist today.** Any scaffold or implementation that adds to this list must match an api-now classification from `docs/api/REST-001-rest-resources.md` or a new explicit decision.

---

## Prohibition — do not scaffold these as Route Handlers for web UI

The resources below have a defined REST contract but **web UI adapters call the same `modules/*/domain` functions without HTTP**. Do not create Route Handlers for these routes to serve the dashboard, client workspace, or account surfaces.

See full path tables (including organization users and FFT) in [REST-001](../../../docs/api/REST-001-rest-resources.md).

### Clients / Declarations / Assignments / Share links / Account

Contract-only — RSC + Server Actions for web UI.

> Neon-owned password/email flows stay on Neon Auth UI / `/api/auth/*` — do not duplicate.

---

## Feed Farm Trade appendix (contract-only, gated)

**Do not implement as Route Handlers until an external consumer is confirmed.** Web UI continues via `app/actions/fft.ts`. Paths are **locale-free** (no `:locale` segment):

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/fft/events` | List / create events |
| GET/PATCH | `/api/fft/events/:eventId` | Detail / setup |
| POST | `/api/fft/events/:eventId/orders` | Submit order |
| POST | `/api/fft/events/:eventId/allocations` | Run allocation |
| GET/POST | `/api/fft/events/:eventId/deposits` | Deposits |
| GET/POST | `/api/fft/events/:eventId/pickups` | Pickup windows / fulfill |
| POST | `/api/fft/events/:eventId/imports` | Import dry-run / apply |
| GET | `/api/fft/rbac/roles` | List trade roles |
| POST | `/api/fft/rbac/assignments` | Assign trade role |
| DELETE | `/api/fft/rbac/assignments/:assignmentId` | Remove assignment |
| POST | `/api/fft/erp-sync/jobs` | Enqueue sync job |
| GET | `/api/fft/erp-sync/jobs/:jobId` | Sync job status |

See `/feed-farm-trade` and `docs/fft/` before touching any of these.

---

## Pagination shape (contract)

All list endpoints (when exposed over HTTP) must return:

```http
GET /api/declarations?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

A shared `PaginatedResult` Zod schema helper is a **named gap** — add when the first contract-only list is exposed over HTTP.

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
Future mobile / external REST consumer              → Route Handler per REST-001 contract-only catalog
```
