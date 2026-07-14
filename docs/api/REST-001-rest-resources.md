# REST-001 REST Resources

| Field | Value |
|-------|-------|
| ID | REST-001 |
| Category | REST |
| Version | 2.0.1 |
| Status | Living |
| Control State | Closed |
| Owner | Backend |
| Updated | 2026-07-14 |

# 1. Purpose

Human REST **standard and resource index**. Plural nouns; HTTP methods as verbs; query params `camelCase`; one version. Enables engineers to classify api-now vs contract-only before scaffolding handlers.

**Target shape:** REST-001 stays standards + high-level index; domain catalogues move to child docs (Draft placeholders below). Until rows migrate, the full inventory in this file remains Living.

**Audience:** backend maintainers. **Action enabled:** implement only api-now Route Handlers; keep contract-only on RSC + Server Actions until an external consumer exists.

Aligns with Afenda elite API contract + interface-design verification (typed schemas via [API-004](API-004-schema-map.md), single error shape via [API-002](API-002-error-contract.md), validate at boundary via [API-001](API-001-api-boundaries.md)). Parent: [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md).

# 2. Scope

### Domain catalogue placeholders (Draft)

```text
REST-001 REST Standards and Resource Index (this file)
├── REST-002 Identity and Organization Resources
├── REST-003 Client Resources
├── REST-004 Declaration Resources
├── REST-005 Assignment and Submission Resources
├── REST-006 Public Survey and Secure-Link Resources
├── REST-007 Account Resources
└── module-owned: FFT-REST-001 Feed Farm Trade Resource Index
```

| ID | Doc | Priority |
|----|-----|----------|
| REST-002 | [Identity and Organization](REST-002-identity-organization-resources.md) | High |
| REST-003 | [Client Resources](REST-003-client-resources.md) | Medium |
| REST-004 | [Declaration Resources](REST-004-declaration-resources.md) | High |
| REST-005 | [Assignment and Submission](REST-005-assignment-submission-resources.md) | High |
| REST-006 | [Public Survey and Secure-Link](REST-006-public-survey-secure-link-resources.md) | High |
| REST-007 | [Account Resources](REST-007-account-resources.md) | Gate: portal-owned fields |
| FFT-REST-001 | [FFT Resource Index](../modules/feed-farm-trade/FFT-REST-001-feed-farm-trade-resource-index.md) | Module-owned |

**Columns**

- **api-now** — implemented (or allowed) as `app/api/**` Route Handlers
- **contract-only** — canonical REST shapes; **web UI uses RSC + Server Actions today**

Machine OpenAPI exports (when added) live under **OPEN-**, not here. Do **not** introduce `/api/v1` URL versioning — one-version rule in [API-001](API-001-api-boundaries.md).

# 3. Contract

## HTTP method semantics

| Method | Meaning on this contract |
|--------|--------------------------|
| `GET` | Read; safe; idempotent |
| `POST` | Create, or a non-CRUD sub-action that cannot be modeled as PATCH (invite, ban, allocate, submit) |
| `PUT` | Full replace of a writable document (e.g. draft body) — idempotent |
| `PATCH` | Partial update — only provided fields change |
| `DELETE` | Remove; **idempotent** — succeed if already absent (`204` or `200`; not `404` for “already gone” when intent is delete) |

### Success status codes (when exposed over HTTP)

| Outcome | Status |
|---------|--------|
| Read OK | `200` + JSON body |
| Create OK | `201` + created resource (prefer `201` over `200`) |
| Update OK (PUT/PATCH) | `200` + updated resource |
| Delete OK | `204` empty, or `200` with `{ ok: true }` — pick one per resource family and keep it |

Errors: [API-002](API-002-error-contract.md) only — never alternate shapes.

## api-now (Route Handlers)

| Method | Path | Purpose | Auth | Cache |
|--------|------|---------|------|-------|
| GET | `/api/health/liveness` | Process up | public | Optional short public CDN cache |
| GET | `/api/health/readiness` | DB / deps ready | public | Prefer `no-store` (DB-sensitive) |
| ALL | `/api/auth/[...path]` | Neon Auth proxy | Neon | Neon-owned — do not add portal caching rules |
| GET/PUT/PATCH | `/api/client/declaration-draft` | Draft autosave (POST = keepalive alias) | client session | `private, no-store` |

Draft is a Route Handler because Server Actions are POST-only and Client Component autosave needs GET/PUT/PATCH plus keepalive-style XHR. Prefer **PUT** for full draft replace; **PATCH** only if partial draft fields are supported by schema.

Do not add same-origin “list declarations” GETs under `/api` for the dashboard — use RSC → domain.

## contract-only (portal core)

Shapes below are the **canonical REST contract**. UI adapters call the same domain functions without HTTP. Errors use [API-002](API-002-error-contract.md). Types/brands use [API-003](API-003-api-types.md).

**Default auth (unless row says otherwise):** operator/client session as appropriate to the surface; public rows are explicit. Mutating handlers still run the [API-001](API-001-api-boundaries.md) security pipeline inside the adapter.

### Clients

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/clients` | List (paginated) | operator |
| GET | `/api/clients/:clientId` | Detail | operator |
| POST | `/api/clients/invitations` | Issue invite | operator |
| DELETE | `/api/clients/:clientId` | Remove registration | operator |

| Direction | Fields (contract) |
|-----------|-------------------|
| List query | `page`, `pageSize`, `sortBy`, `sortOrder`; optional filters `camelCase` (e.g. `status`, `createdAfter`) when schema adds them |
| Invite body | email + invite fields per `issueClientInviteSchema` |
| Output | `clientId`, registration summary fields; ISO timestamps |

### Declarations (surveys)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/declarations` | Operator list | operator |
| POST | `/api/declarations` | Create | operator |
| GET | `/api/declarations/:declarationId` | Detail | operator |
| PATCH | `/api/declarations/:declarationId` | Update metadata / questions | operator |
| DELETE | `/api/declarations/:declarationId` | Delete | operator |

| Direction | Schema / shape |
|-----------|----------------|
| Create | `surveyMetadataFormSchema` (omit server ids/timestamps) → `201` |
| Patch | `updateSurveySchema` (partial) |
| Output | `declarationId`, title/metadata, `createdAt`, `updatedAt` (ISO) |

### Assignments

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/assignments/:assignmentId` | Client assignment + questions | client (owner) |
| POST | `/api/assignments/:assignmentId/submissions` | Submit answers | client (owner) |
| PUT | `/api/assignments/:assignmentId/draft` | Full draft replace (HTTP alias; api-now = `/api/client/declaration-draft`) | client (owner) |

| Direction | Schema / shape |
|-----------|----------------|
| Submit | `submitClientDeclarationSchema` → prefer `201` or `200` consistently |
| Draft | `saveClientDeclarationDraftSchema` (PUT = full replace) |
| Output | assignment + questions; submission status discriminant |

### Share links

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/declarations/:declarationId/share-links` | Create / rotate | operator |
| GET | `/api/public/surveys/:slug` | Open link read model | public |
| GET | `/api/public/secure-links/:token` | Secure link read model | token |
| POST | `/api/public/secure-links/:token/submissions` | Public submit | token |

| Direction | Schema / shape |
|-----------|----------------|
| Public submit | `submitSurveyResponseSchema` |
| Params | `openSurveySlugParamSchema`, `surveyInviteTokenParamSchema` |

### Account

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/account` | Current member profile summary | member session |
| PATCH | `/api/account` | Update allowed fields (if not Neon-owned) | member session |

Neon-owned password/email flows stay on Neon Auth UI / `/api/auth/*` — do not duplicate. Account PATCH schema is a **named gap** until portal-owned fields exist.

### Organization users (Server-Action-primary)

Web UI uses `app/actions/admin.ts` today. HTTP below is **contract-only** until an external consumer needs it — do not scaffold for the dashboard.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/organization/users` | List (paginated) | operator |
| GET | `/api/organization/users/:userId` | Detail | operator |
| POST | `/api/organization/users` | Create / invite | operator |
| PATCH | `/api/organization/users/:userId` | Update profile / role | operator |
| POST | `/api/organization/users/:userId/ban` | Ban (sub-action) | operator |
| POST | `/api/organization/users/:userId/password` | Set password if portal-owned (sub-action) | operator |

Schemas: `modules/identity/schemas/users.ts` (`userIdSchema`, create/update/role/ban/password schemas). Ban/password use `POST` on a sub-resource because they are not field PATCHes.

### Pagination and filtering (lists)

```http
GET /api/declarations?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&status=ACTIVE
```

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

| Query | Rule |
|-------|------|
| `page`, `pageSize` | List semantics; defaults `1` / `20` when omitted; cap `pageSize` in schema when HTTP-exposed |
| `sortBy`, `sortOrder` | `camelCase` field name; `asc` \| `desc` |
| Filters | Optional `camelCase` query params; never verbs in path |

Authenticated list/detail responses must not use public CDN caching (`Cache-Control: private, no-store` when exposed over HTTP).

## Feed Farm Trade appendix (contract-only, gated)

Web UI uses `app/actions/fft.ts` on locale-free `/fft/*` (AdminCN). HTTP below is contract-only until an external consumer needs it — **no `:locale` segment**. 2B–2D rows are gated by program docs; listing them here does not authorize implementation. Auth: FFT access helpers / RBAC per event.

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/fft/events` | List / create events |
| GET/PATCH | `/api/fft/events/:eventId` | Detail / setup |
| POST | `/api/fft/events/:eventId/orders` | Submit order |
| POST | `/api/fft/events/:eventId/allocations` | Run allocation |
| GET/POST | `/api/fft/events/:eventId/deposits` | List / record deposits |
| GET/POST | `/api/fft/events/:eventId/pickups` | Pickup windows / fulfill |
| POST | `/api/fft/events/:eventId/imports` | Import dry-run / apply |
| GET | `/api/fft/rbac/roles` | List trade roles |
| POST | `/api/fft/rbac/assignments` | Assign trade role |
| DELETE | `/api/fft/rbac/assignments/:assignmentId` | Remove trade role assignment |
| POST | `/api/fft/erp-sync/jobs` | Enqueue sync job |
| GET | `/api/fft/erp-sync/jobs/:jobId` | Sync job status |

## Naming

| Pattern | Convention |
|---------|------------|
| Paths | Plural nouns, no verbs in path (`/api/clients`, not `/api/createClient`) |
| IDs | Path params; UUID strings / branded ids |
| Query params | `camelCase` |
| Booleans | `is` / `has` / `can` prefixes in JSON |
| Enums | `UPPER_SNAKE` in JSON wire format |

# 4. References

## Deferred (named — do not invent here)

| Topic | Notes |
|-------|-------|
| Rate limiting | Protect sensitive Actions/RH when abuse appears; not part of path catalog |
| Cursor pagination | Page/offset is the one-version list shape until a consumer requires cursors |
| OPEN-001 OpenAPI | Machine export — see [OPEN-001-openapi.md](OPEN-001-openapi.md); YAML generated for api-now |
| Full per-field TypeScript stubs | Zod in [API-004](API-004-schema-map.md) is SSOT — avoid parallel hand-written interfaces |

## Related

- [API-001 API Boundaries](API-001-api-boundaries.md)
- [API-002 Error Contract](API-002-error-contract.md)
- [API-003 API Types](API-003-api-types.md)
- [API-004 Schema Map](API-004-schema-map.md)
- [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md)
- [FFT-REST-001](../modules/feed-farm-trade/FFT-REST-001-feed-farm-trade-resource-index.md)
- [../architecture/ARCH-013-bff-and-data-flow.md](../architecture/ARCH-013-bff-and-data-flow.md)

# 5. Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.0.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 2.0.0 | 2026-07-13 | Breaking: aligned list responses to `{ data: { items, pagination } }`; corrected title and adopted six-section structure |
| 1.2.1 | 2026-07-13 | Documented target split to REST-002…007 + FFT-REST-001 placeholders |
| 1.2.0 | 2026-07-13 | Method semantics, success statuses, auth columns, filters, deferred gaps |
| 1.1.0 | 2026-07-13 | Renamed from API-002; wire shapes; org-users; FFT paths; cache posture |
| 1.0.0 | 2026-07-13 | Initial resource catalog |

# 6. Notes

Draft child catalogues do not authorize implementation until promoted through the locked roadmap.
