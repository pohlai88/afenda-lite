# Afenda API contract — completeness

**Plan authority (this checkout):** this skill + [api-now.md](api-now.md) + Scratch [`docs-V2/api/*`](../../../docs-V2/api/README.md) + disk `apps/web/app/api/**` + `modules/platform/schemas/**`.

**Living pack:** `docs/api/*` · ARCH-029 · GUIDE-015 — **retired on disk** after HEAD cutover to docs-V2 Scratch. Do not treat deleted Living paths as blocking SSOT. Do not invent contract-only REST catalogues from history.

**Forward writing:** Disk handlers + docs-V2 Scratch + Zod schemas are authoritative for api-now. Missing Living trees are recorded as Docs-lane restore work — not as permission to scaffold fake HTTP.

| Slice | Plan | Recorded location | Status |
| ----- | ---- | ----------------- | ------ |
| api-now handlers only | health / auth / session / draft | [rest.md](../../../docs-V2/api/rest.md); `app/api/{health,auth,session,client}` | **Done** |
| No web-UI list REST | RSC → domain | docs-V2 adapter table | **Done** |
| ActionResult / APIErrorBody | Shared codes | `apps/web/modules/platform/schemas/{action-result,api-error}.ts` | **Done** |
| HTTP success `{ data }` | Envelope | docs-V2 + OPEN YAML envelopes | **Done** |
| List payload preference | `data: { items, pagination }` | Architecture preference; no HTTP list yet | **Recorded** (forward) |
| `parseSchema` from Platform | Shared Zod | `apps/web/modules/platform/schemas/common.ts` | **Done** |
| Branded IDs one-version | Param = brand = Zod | [brands-and-schemas.md](brands-and-schemas.md) + disk schemas | **Done** |
| Draft Route Handler compose | Declarations owns | `modules/declarations/api/client-declaration-draft-route` | **Done** |
| Draft RH unexpected errors | `INTERNAL_ERROR` + correlation | Same compose file | **Done** (stabilize) |
| FFT HTTP catalog | Gated until consumer | feed-farm-trade skill | **Intentional** (not api-now) |
| Living DOC-001 API pack | API/REST/OPEN Controlled docs | `docs/api/**` | **Retired on disk (docs-V2 Scratch)** |
| GUIDE-015 locked roadmap | Phases 1–5 | Living pack | **Retired on disk** |
| OpenAPI api-now YAML + gate | Generate + check | `docs-V2/api/OPEN-001-openapi.yaml` + `pnpm check:openapi` | **Done** |
| OpenAPI Fumadocs wire | Docs app consumer | [openapi.md](openapi.md); `apps/docs` | **Done** |
| OpenAPI contract-only expand | `x-afenda-status` | Only with real consumer | **Recorded** (forward) |
| Divergent Action vs HTTP for same use-case | Forbidden | Draft Action + draft Route share domain | **Done** |
| Skill ↔ Scratch sync | Mirror disk | This skill + docs-V2 | **Operational** |

## Stabilization (latest)

- Draft API runner owned by Declarations (one-version Action/HTTP share domain + schemas)
- Org-admin RBAC mutations stay on discrete Server Actions (`assign-org-role` · `revoke-org-role` · `invite-org-member`), not new `/api` routes — see Scratch [actions.md](../../../docs-V2/api/actions.md); no monolithic `admin.ts` on disk
- OpenAPI artifact lives under `docs-V2/api/` (not deleted `docs/api/`)
- Action vs RH session helpers remain intentionally mirrored (adapter isolation — not a defect)
- Pack entry: [docs-V2/api/README.md](../../../docs-V2/api/README.md)

## Verify

```bash
pnpm openapi:generate
pnpm check:openapi
pnpm --filter @afenda/web test -- __tests__/action-result-contract.test.ts __tests__/openapi-api-now-disk.test.ts __tests__/api-health-routes.test.ts __tests__/declaration-draft-route-internal-error.test.ts
```
