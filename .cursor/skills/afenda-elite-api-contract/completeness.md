# Portal API contract — completeness (2026-07-13)

Plan authority: this skill + `api-now.md` + `docs/api/*` (SSOT: API-001..004, REST-001, OPEN-001).

**Forward writing:** The contract in `docs/api/*` is authoritative now. Missing trees or apps are **recorded** as forward work against those docs — do not soften Status to “wait for checkout.”

| Slice | Plan | Recorded location | Status |
|-------|------|-------------------|--------|
| api-now handlers only | health / auth / draft | [REST-001](../../../docs/api/REST-001-rest-resources.md) api-now; paths `app/api/{health,auth,client}` | **Done** (contract) |
| No web-UI list REST | RSC → domain | [API-001](../../../docs/api/API-001-api-boundaries.md) adapter choice | **Done** (contract) |
| ActionResult / APIErrorBody | Shared codes | [API-002](../../../docs/api/API-002-error-contract.md) | **Done** (contract) |
| HTTP success `{ data }` | Envelope | [API-001](../../../docs/api/API-001-api-boundaries.md); OPEN `*Envelope` schemas | **Done** (contract) |
| `parseSchema` from Platform | Shared Zod | [API-004](../../../docs/api/API-004-schema-map.md) | **Done** (contract) |
| Branded IDs one-version | Param = brand = Zod | [API-003](../../../docs/api/API-003-api-types.md) | **Done** (contract) |
| Draft Route Handler compose | Declarations owns | REST-001 + `modules/declarations/api/client-declaration-draft-route` | **Done** (contract) |
| FFT HTTP catalog | Contract-only, locale-free | REST-001 FFT appendix — not Route Handlers until reopen | **Intentional** |
| Docs prefix split API/REST/OPEN | DOC-001 + pack | `docs/api/API-*`, `REST-001`, `OPEN-001` | **Done** |
| Shared `PaginatedResult` Zod | Named gap | [API-004 Gaps](../../../docs/api/API-004-schema-map.md) | **Recorded** (forward) |
| OpenAPI api-now YAML + gate | OPEN-001 | YAML + `npm run check:openapi` | **Done** |
| OpenAPI Zod import handoff | Drop inline mirrors | [OPEN-001 Forward — Zod](../../../docs/api/OPEN-001-openapi.md) | **Recorded** (forward) |
| OpenAPI Fumadocs wire | Docs app consumer | [OPEN-001 Forward — Fumadocs](../../../docs/api/OPEN-001-openapi.md) | **Recorded** (forward) |
| OpenAPI contract-only expand | `x-afenda-status` | [OPEN-001 Forward — contract-only](../../../docs/api/OPEN-001-openapi.md) | **Recorded** (forward) |
| Divergent Action vs HTTP for same use-case | Forbidden | Draft Action + draft Route share domain | **Done** (contract) |

## Stabilization (latest)

- Draft API runner owned by Declarations (one-version Action/HTTP share domain + schemas)
- Org-admin RBAC mutations stay on Server Actions (`admin.ts`), not new `/api` routes
- Hard tenancy cutover: required `organizationId` into domain — see [ARCH-003](../../../docs/architecture/ARCH-003-multi-tenant-ecosystem.md)
- Pack entry: [docs/api/README.md](../../../docs/api/README.md)

## Verify

```bash
node scripts/check-docs-naming.mjs
npm run check:openapi
```
