# api-now — current Route Handler inventory

**Source:** [docs/api/02-rest-resources.md](../../../docs/api/02-rest-resources.md)

This file is the canonical reference for what **is implemented today** as `app/api/**` Route Handlers vs what is **contract-only** (canonical REST shapes consumed via RSC + Server Actions until an external consumer needs HTTP).

---

## Implemented Route Handlers (api-now)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/health/liveness` | Process up | public |
| GET | `/api/health/readiness` | DB / deps ready | public |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon |
| GET/PUT/PATCH | `/api/client/declaration-draft` | Draft autosave (POST keepalive alias) | client session |

**No other Route Handlers exist today.** Any scaffold or implementation that adds to this list must match an api-now classification from `docs/api/02-rest-resources.md` or a new explicit decision.

---

## Prohibition — do not scaffold these as Route Handlers for web UI

The resources below have a defined REST contract but **web UI adapters call the same `modules/*/domain` functions without HTTP**. Do not create Route Handlers for these routes to serve the dashboard, client workspace, or account surfaces:

### Clients

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/clients` | List (paginated) |
| GET | `/api/clients/:clientId` | Detail |
| POST | `/api/clients/invitations` | Issue invite |
| DELETE | `/api/clients/:clientId` | Remove registration |

### Declarations (surveys)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/declarations` | Operator list |
| POST | `/api/declarations` | Create |
| GET | `/api/declarations/:declarationId` | Detail |
| PATCH | `/api/declarations/:declarationId` | Update metadata / questions |
| DELETE | `/api/declarations/:declarationId` | Delete |

### Assignments

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/assignments/:assignmentId` | Client assignment + questions |
| POST | `/api/assignments/:assignmentId/submissions` | Submit answers |
| PUT | `/api/assignments/:assignmentId/draft` | Save draft |

### Share links

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/declarations/:declarationId/share-links` | Create / rotate |
| GET | `/api/public/surveys/:slug` | Open link read model |
| GET | `/api/public/secure-links/:token` | Secure link read model |
| POST | `/api/public/secure-links/:token/submissions` | Public submit |

### Account

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/account` | Current member profile summary |
| PATCH | `/api/account` | Update allowed fields |

> Neon-owned password/email flows stay on Neon Auth UI / `/api/auth/*` — do not duplicate.

---

## Feed Farm Trade appendix (contract-only, gated)

**Do not implement as Route Handlers until an external consumer is confirmed.** Web UI continues via `app/actions/fft.ts`.

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/fft/:locale/events` | List / create events |
| GET/PATCH | `/api/fft/:locale/events/:eventId` | Detail / setup |
| POST | `/api/fft/:locale/events/:eventId/orders` | Submit order |
| POST | `/api/fft/:locale/events/:eventId/allocations` | Run allocation |
| GET/POST | `/api/fft/:locale/events/:eventId/deposits` | Deposits |
| GET/POST | `/api/fft/:locale/events/:eventId/pickups` | Pickup windows / fulfill |
| POST | `/api/fft/:locale/events/:eventId/imports` | Import dry-run / apply |
| GET/POST | `/api/fft/:locale/rbac/...` | Roles / assignments |
| POST | `/api/fft/:locale/erp-sync/...` | Sync jobs |

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
Future mobile / external REST consumer              → Route Handler per contract-only catalog
```
