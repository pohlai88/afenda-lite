# Organization admin — platform RBAC + tenancy (phase 14)

**Status:** Accepted ADR-002 · soft-harden closed 2026-07-12  
**Phase ID:** `organization-admin-post-login` (IAM expansion)  
**ADR:** [doc/backend/adr/002-platform-tenancy-rbac.md](../backend/adr/002-platform-tenancy-rbac.md)

## Goal

Ship platform permission-catalog RBAC (Identity) + AdminCN Roles/Permissions product surfaces under `/dashboard/roles` and `/dashboard/permissions`. Neon Auth remains Tier 1 identity/org membership only. **No product Zustand** — RSC + Server Actions.

## Roles & Permissions plan ↔ codebase

| Plan item | Status | Evidence |
|-----------|--------|----------|
| ADR-002 Accepted | **Done** | `doc/backend/adr/002-platform-tenancy-rbac.md` |
| Migration `025` platform RBAC tables | **Done** | `db/migrations/025_platform_rbac_tenancy.sql` |
| Catalog + templates (Org Admin / Editor / Viewer) | **Done** | `platform-rbac-catalog.ts` + unit tests; includes `fft.access` |
| Platform module entry `fft.access` | **Done** | Org-scoped SoT; allowlist + FFT assignment = bridges |
| `/fft/admin/rbac` + `org.roles.manage` | **Done** | Control plane gate + FFT `role.manage` |
| Domain CRUD + assign/revoke + audit | **Done** | `modules/identity/domain/platform-rbac.ts` |
| Idempotent template seed (no wipe+re-audit) | **Done** | Diff sync in `seedPlatformRbacCatalog` |
| Neon admin → Org Admin template ensure | **Done** | Skips only when `templateKey === org_admin` already present |
| Operator session (`org.roles.manage`) | **Done** | `requirePlatformOperatorSession` on roles Actions + RSC |
| Role CRUD + permission matrix Actions (`ActionResult`) | **Done** | `app/actions/admin.ts` |
| `/dashboard/roles` + `/dashboard/permissions` UI | **Done** | `organization-admin-roles-*` (no zustand) |
| Assign/revoke UI gated by `org.roles.manage` | **Done** | `canManagePlatformRoles` on user detail |
| Sidebar IAM under `kind: admin` | **Done** | Users/Roles/Permissions in Organization group; Viewer excluded from `isOrgAdmin` |
| NULL-org / cross-org role mutation guards | **Done** | `assertOrgOwnedRoleMutable` |
| HITL portal-view registry wrappers | **Optional / skipped** | Product UI in `features/organization-admin` |
| Merge FFT **domain** catalogs into platform tables | **Out of scope** | ADR rejected (entry code is not domain merge) |
| Hard multi-org cutover | **Deferred** | Soft `(NULL OR org)` filters |
| Remove entry bridges after `fft.access` backfill | **Follow-up** | Sales allowlist + FFT assignment entry |
| User CRUD `{ error }` → `ActionResult` | **Residual P2** | Roles path already `ActionResult` |
| L4 e2e for roles assign | **Residual P2** | Catalog unit coverage present |

**Roles & Permissions + control-plane completeness:** ~97% (bridges intentional; domain catalog merge rejected).

## Related tenancy (Declarations / FFT)

| Item | Status |
|------|--------|
| Declarations `organization_id` + soft filters | **Done** |
| Client invite/assignment get+delete org scope | **Done** (soft-harden) |
| CDP package `updateSurvey` org pass-through | **Done** |
| Client onboarding profile org stamp | **Done** |
| DRY `organizationScopeSql` (Declarations + FFT) | **Done** |
| FFT `organization_id` + scoped event reads | **Done** |
| FFT session allowlist + RBAC lists/stamp/clone/template | **Done** (soft-harden) |
| FFT import-store `getEventById` org thread | **Done** |
| Hard cutover (drop `IS NULL OR`) | **Deferred** |
| `listOrganizationUsers` Neon directory (not org-membership API) | **Intentional** |

**In-scope soft tenancy completeness:** **100%** (hard cutover still deferred by design).

## Verify

```bash
npm run test:unit -- modules/identity/domain/platform-rbac-catalog modules/identity/domain/platform-rbac-org-mutable modules/declarations/domain/organization-scope modules/fft/domain/organization-scope modules/fft/auth
npx tsc --noEmit
```

Manual: Neon admin / Org Admin → Organization → Users / Roles / Permissions. Viewer must not see Organization IAM group. User detail Assign/Revoke only with `org.roles.manage`. Cross-org invitation UUID delete → missing. FFT RBAC page only shows org+NULL roles.
