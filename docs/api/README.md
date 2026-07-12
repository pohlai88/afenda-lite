# API / REST / OPEN — docs entry

| Field | Value |
|-------|-------|
| Surface | `docs/api/` |
| Mode | Internal guide |
| Audience | Backend and frontend maintainers |
| Updated | 2026-07-13 |

Entry point for Afenda-Lite **interface contracts**. Enables engineers to open the right SSOT before writing Server Actions or Route Handlers.

Published OpenAPI for Fumadocs: human guide [OPEN-001](OPEN-001-openapi.md); machine file `OPEN-001-openapi.yaml` (generate with `npm run openapi:generate`).

## Read in this order

| Order | Doc | Use when |
|------:|-----|----------|
| 1 | [API-001 API Boundaries](API-001-api-boundaries.md) | Choosing adapter + security pipeline |
| 2 | [API-002 Error Contract](API-002-error-contract.md) | Failure shapes (RH / Action / RSC) |
| 3 | [REST-001 Rest Resources](REST-001-rest-resources.md) | Paths, api-now vs contract-only, HTTP semantics |
| 4 | [API-003 API Types](API-003-api-types.md) | Brands, Input/Output, pagination types |
| 5 | [API-004 Schema Map](API-004-schema-map.md) | Zod module ownership |
| 6 | [OPEN-001 OpenAPI](OPEN-001-openapi.md) | Machine OAS guide + generate command |

Skill mirror: `.cursor/skills/afenda-elite-api-contract/` (must follow these docs, not the reverse).

## Prefix map

| Prefix | Owns |
|--------|------|
| **API-** | Cross-cutting BFF (Actions + HTTP vocabulary) |
| **REST-** | Human REST path catalogs |
| **OPEN-** | OpenAPI machine exports |

## Accept / Upgrade / Reject (audit snapshot)

Living decisions applied to this pack. **Do not reopen** without an ADR or explicit program change.

### Accept

- RSC → domain for same-origin reads; Server Actions for UI mutations; Route Handlers for health, Neon Auth, draft XHR, future external REST
- One-version HTTP (no `/api/v1` + `/api/v2`)
- Single `APIErrorBody` / `ActionResult` code vocabulary
- Route Handler success JSON uses `{ data: T }` (API-001); errors stay bare `APIErrorBody` (API-002)
- api-now only: health, `/api/auth/[...path]`, `/api/client/declaration-draft`
- FFT HTTP contract-only, locale-free paths
- Zod as type SSOT under `modules/*/schemas`
- Node runtime default for DB-backed handlers

### Upgrade (landed in current versions)

- Security pipeline inside every Action / mutating RH (API-001)
- Three error surfaces (API-002)
- REST method semantics, success statuses, auth columns, filters, cache posture (REST-001 v1.2.0)
- Full brand table + schema map including `action-result` / `platform-rbac` (API-003 / API-004)
- DOC-001 categories API / REST / OPEN

### Reject

- Scaffolding contract-only paths as Route Handlers for web UI
- Dual doc filenames (`01-*.md` alongside `API-` / `REST-`)
- FFT `/api/fft/:locale/...`
- Layout-only auth for Actions; throw for expected auth failures
- Server Actions as cacheable GET APIs; `route.ts` beside `page.tsx`
- Edge runtime default for DB handlers; CDN cache on session draft
- OpenAPI dump of all contract-only paths; BotID/Blob recipes in this pack

## Deferred (named)

See REST-001 and API-004 Gaps: rate limiting, cursor pagination, Account PATCH schema, `PaginatedResult` Zod helper — **recorded** there. OpenAPI forward work is **recorded** in [OPEN-001](OPEN-001-openapi.md) (Zod import, Fumadocs wire, contract-only expand); execute against that guide when coding.

## Related

- [../frontend/ARCH-013-bff-and-data-flow.md](../frontend/ARCH-013-bff-and-data-flow.md)
- [../backend/ARCH-010-backend-conventions.md](../backend/ARCH-010-backend-conventions.md)
- [../_control/DOC-001-documentation-control.md](../_control/DOC-001-documentation-control.md)
