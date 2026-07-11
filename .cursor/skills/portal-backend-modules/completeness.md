# Portal backend modules — completeness (2026-07-12)

Plan authority: this skill + `doc/backend/` + [closed-scope-register](../../../doc/architecture/closed-scope-register.md).

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| Module tree `platform/identity/declarations/fft` | Exact L2 folders | Disk matches | **Done** |
| No `modules/trade/` / `features/trade/` product | Forbidden | Absent | **Done** |
| No `lib/` architecture drawer | Absorb all runners | `lib/` gone; runners under `features/` | **Done** |
| Shared Zod + `parseSchema` on Platform | Trade/Identity import Platform | Actions use Platform common | **Done** |
| Trade ↛ Declarations imports | Ban | No matches under `modules/fft` | **Done** |
| Identity ↛ Declarations (any) | Zero imports | 0 matches under `modules/identity` | **Done** |
| Platform ↛ Declarations product compose | Public-link landing at adapter | `features/auth/public-link-routing.ts` | **Done** |
| api-now Route Handlers (4 trees) | Only health/auth/draft | Disk matches | **Done** |
| Actions map (`account/admin/client/declarations/surveys/fft`) | adapter-map | Disk matches; no `trade.ts` | **Done** |
| Org users full stack | CRUD/export/import/bulk | Wired | **Done** |
| ClientProfile port | Identity owns read/ensure + invite bootstrap | Done | **Done** |
| Platform copy port | `modules/platform/copy/*` | Done | **Done** |
| Absorb entry / org-admin / playground runners | → `features/*` | Done | **Done** |
| Platform RBAC catalog + domain + schemas | ADR-002 | Wired | **Done** |
| Org-admin Roles / Permissions UI | `/dashboard/roles` `/permissions` | Wired | **Done** |
| Declarations / FFT `organization_id` scope | Tenancy | Code landed | **Done** |
| Apply migrations `025`/`026` on Neon | Ops | Applied on `br-tiny-hill-ao82jp6f` (`schema_migrations` + `organization_id` columns) | **Done** |
| `/client` workspace restore | Closed + reopen checklist | Stubs only | **Closed (registered)** |
| FFT P3 flag promotion | gate-register | Prod flags off | **Closed (registered)** |
| SaaS billing / 2FA product | Deferred chrome | Coming-soon + plan defaults | **Intentional (registered)** |

## Stabilization (latest)

- Neon tenancy migrations `025`/`026` verified applied on production branch
- Doc paths: `lib/entry` → `features/auth/entry` in routes/surfaces SSOT
- Closed-scope items remain registered (no reopen)
- Governance: reliance 26/26 · actions 38/38 · route coverage 36/36

## Verify

```bash
npx tsc --noEmit
npm run check:reliance-mapping-drift
npm run check:route-coverage-drift
# Neon: schema_migrations includes 025_platform_rbac_tenancy.sql + 026_fft_organization_id.sql
```
