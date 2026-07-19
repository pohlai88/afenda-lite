# Afenda API contract — completeness

Plan authority: this skill + `api-now.md` + `docs/api/*` (SSOT: Living API-001…004, REST-001, OPEN-001; parent [ARCH-029](../../../docs/architecture/ARCH-029-interface-api-architecture.md); order [GUIDE-015](../../../docs/api/guides/GUIDE-015-interface-pack-development-roadmap.md)).

**Forward writing:** The contract in `docs/api/*` is authoritative now. Missing trees or apps are **recorded** as forward work against those docs — do not soften Status to “wait for checkout.” Do not treat Draft Phase 2/3 docs as Living enforcement.

| Slice | Plan | Recorded location | Status |
| ----- | ---- | ----------------- | ------ |
| api-now handlers only | health / auth / session / draft | [REST-001](../../../docs/api/REST-001-rest-resources.md) api-now; paths `app/api/{health,auth,session,client}` | **Done** (contract) |
| No web-UI list REST | RSC → domain | [API-001](../../../docs/api/API-001-api-boundaries.md) adapter choice | **Done** (contract) |
| ActionResult / APIErrorBody | Shared codes | [API-002](../../../docs/api/API-002-error-contract.md) · Target `apps/web/modules/platform/schemas/{action-result,api-error}.ts` | **Done** (contract + Target runtime, I2.1) |
| HTTP success `{ data }` | Envelope | [API-001](../../../docs/api/API-001-api-boundaries.md); OPEN `*Envelope` schemas | **Done** (contract) |
| List payload preference | `data: { items, pagination }` | [ARCH-029](../../../docs/architecture/ARCH-029-interface-api-architecture.md); freeze in API-008 when Living | **Done** (architecture) / API-008 **Draft** |
| `parseSchema` from Platform | Shared Zod | [API-004](../../../docs/api/API-004-schema-map.md) · Target `apps/web/modules/platform/schemas/common.ts` | **Done** (contract + Target runtime, I2.1) |
| Branded IDs one-version | Param = brand = Zod | [API-003](../../../docs/api/API-003-api-types.md) | **Done** (contract) |
| Draft Route Handler compose | Declarations owns | REST-001 + `modules/declarations/api/client-declaration-draft-route` | **Done** (contract) |
| FFT HTTP catalog | Contract-only, locale-free | [FFT-REST-001](../../../docs/modules/feed-farm-trade/FFT-REST-001-feed-farm-trade-resource-index.md) · REST-001 appendix | **Intentional** (Draft index) |
| Docs prefix split API/REST/OPEN | DOC-001 + pack | `docs/api/API-*`, `REST-*`, `OPEN-*` + `guides/` + `runbooks/` | **Done** |
| GUIDE-015 locked roadmap | Phases 1–5 | [GUIDE-015](../../../docs/api/guides/GUIDE-015-interface-pack-development-roadmap.md) | **Done** (Living) |
| Phase 2 cross-cutting | Authz / idempotency / observability / collection / deprecation | API-005…009 | **Draft** — not Living SSOT |
| Phase 3 resource families | Domain REST catalogues | REST-002…007 | **Draft** — expand on demand |
| Shared `PaginatedResult` Zod | Named gap | [API-004 Gaps](../../../docs/api/API-004-schema-map.md) | **Recorded** (forward) |
| OpenAPI api-now YAML + gate | OPEN-001 | YAML + `npm run check:openapi` | **Done** |
| OpenAPI Zod import handoff | Drop inline mirrors | [OPEN-001 Forward — Zod](../../../docs/api/OPEN-001-openapi.md) · GUIDE-011 | **Recorded** (forward) |
| OpenAPI Fumadocs wire | Docs app consumer | [OPEN-001 Forward — Fumadocs](../../../docs/api/OPEN-001-openapi.md) | **Recorded** (forward) |
| OpenAPI contract-only expand | `x-afenda-status` | [OPEN-001 Forward — contract-only](../../../docs/api/OPEN-001-openapi.md) | **Recorded** (forward) |
| Divergent Action vs HTTP for same use-case | Forbidden | Draft Action + draft Route share domain | **Done** (contract) |
| Skill ↔ docs sync | Mirror only | This skill + `npm run check:doc-integrity` | **Operational** |

## Stabilization (latest)

- Draft API runner owned by Declarations (one-version Action/HTTP share domain + schemas)
- Org-admin RBAC mutations stay on Server Actions (`admin.ts`), not new `/api` routes
- Hard tenancy cutover: required `organizationId` into domain — see [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md)
- Pack entry: [docs/api/README.md](../../../docs/api/README.md)
- Control State + register: DOC-001 / DOC-002 — skill does not invent catalogue rows

## Verify

```bash
npm run check:doc-integrity
node scripts/check-docs-naming.mjs docs/api
npm run check:openapi
```
