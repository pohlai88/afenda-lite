# Organization admin — platform RBAC + tenancy (phase 14)

**Status:** Accepted ADR-002 · stabilized 2026-07-12  
**Phase ID:** `organization-admin-post-login` (IAM expansion)  
**ADR:** [doc/backend/adr/002-platform-tenancy-rbac.md](../backend/adr/002-platform-tenancy-rbac.md)

## Goal

Ship platform permission-catalog RBAC (Identity) + AdminCN Roles/Permissions product surfaces under `/dashboard/roles` and `/dashboard/permissions`. Neon Auth remains Tier 1 identity/org membership only.

## Plan ↔ codebase completeness

| Plan item | Status | Evidence |
|-----------|--------|----------|
| ADR-002 Accepted | **Done** | `doc/backend/adr/002-platform-tenancy-rbac.md` |
| Context docs (routes, AdminCN, brands, tasks) | **Done** | `03-routes`, `06-admincn-alignment`, brands, this file |
| Migration `025` platform RBAC + Declarations `organization_id` | **Done** | `db/migrations/025_platform_rbac_tenancy.sql` |
| Migration `026` FFT `organization_id` | **Done** | `db/migrations/026_fft_organization_id.sql` |
| Identity catalog + domain + schemas + access | **Done** | `modules/identity/domain/platform-rbac*` · `schemas/platform-rbac.ts` |
| Default Org Admin assignment for Neon admins | **Done** | `ensureNeonAdminOrgAdminAssignment` via bootstrap |
| Role CRUD + assign/revoke Actions (`ActionResult`) | **Done** | `app/actions/admin.ts` + shared `modules/platform/schemas/action-result.ts` |
| `/dashboard/roles` + `/dashboard/permissions` UI | **Done** | roles/permissions routes + `organization-admin-roles-*` |
| Declarations backfill + list filters | **Done** | `organization-scope` + org-admin loaders |
| Declarations get/mutate org scope | **Done** | survey/client/declaration actions + detail loader |
| Permission gates (`declarations.manage`, `clients.invite`, `org.roles.manage`) | **Done** | survey/client/RBAC actions; Neon admin bootstrap until assignments |
| FFT list/create stamp + backfill | **Done** | `fft-organization-context` + store + pages |
| FFT sales-member list filter | **Done** | `listSalesMembers(organizationId?)` |
| FFT role/assignment create stamp | **Done** | `createCustomRole` / `ensureRoleAssignment` accept `organizationId` |
| Route brand `[declarationId]` (not `[id]`) | **Done** | `app/dashboard/[declarationId]` |
| Assign/revoke **UI** on roles page | **Deferred** | Actions exist; no assignment matrix UI yet |
| `org.users.manage` on user Actions | **Deferred** | Still Neon `requireAdminSession` |
| `account.self` product gate | **Deferred** | Account flow unchanged |
| HITL portal-view registry wrappers | **Optional** | Product UI stays in `features/organization-admin` |
| Merge FFT + platform catalogs | **Out of scope** | Catalogs remain separate |

## Delivered paths

| Layer | Path |
|-------|------|
| Migrations | `025_platform_rbac_tenancy.sql`, `026_fft_organization_id.sql` |
| Catalog | `modules/identity/domain/platform-rbac-catalog.ts` |
| Domain | `modules/identity/domain/platform-rbac.ts` |
| Access | `modules/identity/domain/platform-rbac-access.ts` |
| Schemas | `modules/identity/schemas/platform-rbac.ts` |
| ActionResult | `modules/platform/schemas/action-result.ts` |
| Actions | RBAC + org-scoped survey/client/declaration adapters |
| Tenancy adapters | `features/organization-admin/organization-admin-tenancy.ts`, `features/fft/fft-organization-context.ts` |
| UI | `organization-admin-roles-list.tsx` |
| Routes | `/dashboard/roles`, `/dashboard/permissions`, `/dashboard/[declarationId]` |

## Verify

```bash
npm run db:migrate
npm run test:unit -- modules/identity/domain/platform-rbac-catalog modules/platform/governance/portal-route-inventory
npx tsc --noEmit
```

Manual: org admin opens `/dashboard/roles` → Org Admin / Editor / Viewer templates visible.
