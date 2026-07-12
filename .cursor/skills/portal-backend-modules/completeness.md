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
| Platform ↛ Declarations / FFT domain | No product compose in Platform | Draft route in `modules/declarations/api/`; shell resolve in `features/portal-chrome` | **Done** |
| api-now Route Handlers (4 trees) | Only health/auth/draft | Disk matches | **Done** |
| Actions map (`account/admin/client/declarations/surveys/fft`) | adapter-map | Disk matches; no `trade.ts` | **Done** |
| Org users full stack | CRUD/export/import/bulk | Wired | **Done** |
| ClientProfile port | Identity owns read/ensure + invite bootstrap | Done | **Done** |
| Platform copy port | `modules/platform/copy/*` | Done | **Done** |
| Absorb entry / org-admin / playground runners | → `features/*` | Done | **Done** |
| Platform RBAC catalog + domain + schemas | ADR-002 | Wired + `fft.access` | **Done** |
| Org-admin Roles / Permissions UI | `/dashboard/roles` `/permissions` | Wired + admin nav entitlement | **Done** |
| Assign UI gated by `org.roles.manage` | User detail | `canManagePlatformRoles` | **Done** |
| Declarations / FFT `organization_id` scope | Tenancy | Hard `= org` + `027` NOT NULL | **Done** |
| Soft-harden IDOR / stamp / session / DRY SQL | ADR-002 progressive | Superseded by hard cutover | **Superseded** |
| FFT module entry control plane | `hasFftModuleAccess` | platform `fft.access` only; write-time `ensureFftMember`; ops `backfill:fft-access` | **Done** |
| Apply migrations `025`/`026`/`027` on Neon | Ops | Child `br-jolly-mountain-ao6ph4od` + prod promote | **Done** |
| Hard multi-org cutover | Drop `IS NULL OR` + promoteLegacy | Hard scope + membership Users + CI residue + N1 active org | **Done** |
| Post-v1 multi-org ecosystem doc | Living inventory + M1–M5 | [multi-tenant-ecosystem.md](../../../doc/architecture/multi-tenant-ecosystem.md) | **Done** |
| `/client` workspace restore | Closed + reopen checklist | Stubs only | **Closed (registered)** |
| FFT P3 flag promotion | gate-register | Prod flags off | **Closed (registered)** |
| SaaS billing / 2FA product | Deferred chrome | Coming-soon + plan defaults | **Intentional (registered)** |

## Stabilization (latest)

- Hard multi-tenant cutover: `organizationScopeSql` → `col = $n`; required `organizationId` Actions→domain; `027` NOT NULL; delete `promoteLegacy`; Users via `neon_auth.member`; N1 prefers `session.activeOrganizationId`; CI `check:tenancy-residue` + `audit:tenancy-nulls`
- Soft-harden multi-tenancy superseded (no dual-mode)
- Relocated draft Route Handler compose → `modules/declarations/api/client-declaration-draft-route*` (Platform no longer imports Declarations)
- Relocated shell entitlement resolve → `features/portal-chrome/resolve-shell-access.ts`; FFT gate → `modules/fft/auth/fft-module-access.ts` (Platform no longer imports FFT)
- Reliance registry: dropped stale `domain:auth` on admin-declaration-detail / admin-access-share → **26/26** surfaces aligned
- Closed-scope items remain registered (no reopen)

## Verify

```bash
npx tsc --noEmit
npm run test:unit -- modules/identity/domain/platform-rbac-org-mutable modules/fft/auth modules/declarations/domain/organization-scope
npm run check:reliance-mapping-drift
npm run check:reliance-coverage
npm run check:route-coverage-drift
# Platform → declarations|fft imports: none
```
