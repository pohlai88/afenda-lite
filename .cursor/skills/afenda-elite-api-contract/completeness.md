# Afenda API contract — completeness

**Plan authority (this checkout):** this skill + [api-now.md](api-now.md) + Scratch [`docs-V2/api/*`](../../../docs-V2/api/README.md) + disk `apps/web/app/api/**` + `modules/platform/schemas/**`.

**Living pack:** `docs/api/*` · ARCH-029 · GUIDE-015 — **retired on disk** after HEAD cutover to docs-V2 Scratch. Do not treat deleted Living paths as blocking SSOT. Do not invent contract-only REST catalogues from history.

**Forward writing:** Disk handlers + docs-V2 Scratch + Zod schemas are authoritative for api-now. Missing Living trees are recorded as Docs-lane restore work — not as permission to scaffold fake HTTP.

| Slice | Plan | Recorded location | Status |
| ----- | ---- | ----------------- | ------ |
| api-now handlers only | health / auth / session | [rest.md](../../../docs-V2/api/rest.md); `app/api/{health,auth,session}` | **Done** |
| Declaration draft RH | Removed with Declarations | — | **Removed (wiped)** |
| No web-UI list REST | RSC → domain | docs-V2 adapter table | **Done** |
| ActionResult / APIErrorBody | Shared codes | `apps/web/modules/platform/schemas/{action-result,api-error}.ts` | **Done** |
| HTTP success `{ data }` | Envelope | docs-V2 + OPEN YAML envelopes | **Done** |
| List payload preference | `data: { items, pagination }` | Architecture preference; no HTTP list yet | **Recorded** (forward) |
| `parseSchema` from Platform | Shared Zod | `apps/web/modules/platform/schemas/common.ts` | **Done** |
| Branded IDs one-version | Param = brand = Zod | [brands-and-schemas.md](brands-and-schemas.md) + disk schemas | **Done** (living identity brands) |
| FFT HTTP catalog | Removed with FFT | — | **Removed (wiped)** |
| Living DOC-001 API pack | API/REST/OPEN Controlled docs | `docs/api/**` | **Retired on disk (docs-V2 Scratch)** |
| OpenAPI api-now YAML + gate | Generate + check (health + metrics) | `docs-V2/api/OPEN-001-openapi.yaml` + `pnpm check:openapi` | **Done** |
| `@afenda/openapi` Zod→OAS leaf | Extended `z` · envelope · stamps · YAML emit | `packages/runtime/openapi` · web `openapi-zod` re-export | **Done** |
| OpenAPI Fumadocs wire | Docs app consumer | [openapi.md](openapi.md); `apps/docs` | **Done** |
| OpenAPI contract-only expand | `x-afenda-status` | Only with real consumer | **Recorded** (forward) |
| Skill ↔ Scratch sync | Mirror disk | This skill + docs-V2 | **Operational** |

## Stabilization (latest)

- api-now OpenAPI include set is **health probes + Prometheus `/api/metrics`** (declaration-draft removed with Declarations product; stream `/api/ai/chat` stays YAML-excluded)
- Org-admin RBAC mutations stay on discrete Server Actions (`assign-org-role` · `revoke-org-role` · `invite-org-member`), not new `/api` routes — see Scratch [actions.md](../../../docs-V2/api/actions.md)
- OpenAPI artifact lives under `docs-V2/api/` (not deleted `docs/api/`)
- Pack entry: [docs-V2/api/README.md](../../../docs-V2/api/README.md)

## Verify

```bash
pnpm openapi:generate
pnpm check:openapi
pnpm --filter @afenda/web test -- __tests__/action-result-contract.test.ts __tests__/openapi-api-now-disk.test.ts __tests__/api-health-routes.test.ts
```
