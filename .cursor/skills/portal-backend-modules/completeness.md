# Portal backend modules — completeness (2026-07-12)

Plan authority: this skill + `doc/backend/` + org-admin users + ClientProfile + copy port + runner absorb + ADR-002 RBAC.

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| Module tree `platform/identity/declarations/fft` | Exact L2 folders | Disk matches | **Done** |
| No `modules/trade/` / `features/trade/` product | Forbidden | Absent | **Done** |
| No `lib/` architecture drawer | Absorb all runners | `lib/` gone; runners under `features/` | **Done** |
| Shared Zod + `parseSchema` on Platform | Trade/Identity import Platform | Actions use Platform common | **Done** |
| Trade ↛ Declarations imports | Ban | No matches under `modules/fft` | **Done** |
| Identity ↛ Declarations (any) | Zero imports | 0 matches under `modules/identity` | **Done** |
| api-now Route Handlers (4 trees) | Only health/auth/draft | Disk matches | **Done** |
| Actions map (`account/admin/client/declarations/surveys/fft`) | adapter-map | Disk matches; no `trade.ts` | **Done** |
| Org users full stack | CRUD/export/import/bulk | Wired | **Done** |
| ClientProfile port | Identity owns read/ensure + invite bootstrap | Done | **Done** |
| Platform copy port | `modules/platform/copy/*` | Done | **Done** |
| Absorb entry / org-admin / playground runners | → `features/*` | Done | **Done** |
| Platform RBAC catalog + domain + schemas | ADR-002 | `modules/identity/domain/platform-rbac*` | **Done** |
| Org-admin Roles / Permissions UI | `/dashboard/roles` `/permissions` | Pages + features wired | **Done** |
| Declarations / FFT `organization_id` scope | Tenancy | `organization-scope` + migrations `025`/`026` | **Done (code)** |
| Apply migrations on Neon | Ops | Run `npm run db:migrate` when promoting | **Ops pending** |
| Platform routing still imports Declarations for public-link | Compose at adapter ideal | Pre-existing narrow edge | **Deferred** |
| `/client` workspace restore | Closed | Closed | **Out of scope** |
| FFT P3 flag promotion | gate-register | Closed | **Out of scope** |
| SaaS plan/billing / 2FA product | Not Identity | Chrome defaults | **Intentional** |

## Stabilization (latest)

- Closed declarationId brand rename end-to-end
- Documented RBAC/tenancy slice against ADR-002
- Cross-skill completeness matrices added for scaffold + api-contract

## Verify

```bash
npx tsc --noEmit
npm run test:unit -- modules/identity/domain/platform-rbac-catalog features/organization-admin/organization-admin-declaration-detail features/auth/entry
```
