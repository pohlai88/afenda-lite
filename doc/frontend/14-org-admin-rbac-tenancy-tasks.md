# Organization admin — platform RBAC + tenancy (phase 14)

**Status:** Accepted ADR-002 · hard multi-tenant cutover closed 2026-07-12  
**Phase ID:** `organization-admin-post-login` (IAM expansion)  
**ADR:** [doc/backend/adr/002-platform-tenancy-rbac.md](../backend/adr/002-platform-tenancy-rbac.md)

## Goal

Ship platform permission-catalog RBAC (Identity) + AdminCN Roles/Permissions product surfaces under `/dashboard/roles` and `/dashboard/permissions`. Neon Auth remains Tier 1 identity/org membership only. **No product Zustand** — RSC + Server Actions.

## Roles & Permissions plan ↔ codebase

| Plan item | Status | Evidence |
|-----------|--------|----------|
| ADR-002 Accepted | **Done** | `doc/backend/adr/002-platform-tenancy-rbac.md` |
| Migration `025` platform RBAC tables | **Done** | `db/migrations/025_platform_rbac_tenancy.sql` |
| Migration `027` hard tenancy | **Done** | `NOT NULL` on eight tenant roots + indexes |
| Catalog + templates (Org Admin / Editor / Viewer) | **Done** | `platform-rbac-catalog.ts` + unit tests; includes `fft.access` |
| Platform module entry `fft.access` | **Done** | Org-scoped SoT; write-time ensure + `npm run backfill:fft-access` |
| N1 active org alignment | **Done** | `resolveActivePortalOrganization` — active → slug → sole membership (M1 fail-closed) |
| `/fft/admin/rbac` + `org.roles.manage` | **Done** | Control plane gate + FFT `role.manage` |
| Domain CRUD + assign/revoke + audit | **Done** | `modules/identity/domain/platform-rbac.ts` |
| Idempotent template seed (no wipe+re-audit) | **Done** | Diff sync in `seedPlatformRbacCatalog`; scoped unique `028` |
| Neon admin → Org Admin template ensure | **Done** | Skips only when `templateKey === org_admin` already present |
| Operator session (`org.roles.manage`) | **Done** | `requirePlatformOperatorSession` on roles Actions + RSC |
| Role CRUD + permission matrix Actions (`ActionResult`) | **Done** | `app/actions/admin.ts` |
| `/dashboard/roles` + `/permissions` UI | **Done** | `organization-admin-roles-*` (no zustand) |
| Assign/revoke UI gated by `org.roles.manage` | **Done** | `canManagePlatformRoles` on user detail |
| Sidebar IAM under `kind: admin` | **Done** | Users/Roles/Permissions in Organization group; Viewer excluded from `isOrgAdmin` |
| NULL-org / cross-org role mutation guards | **Done** | `assertOrgOwnedRoleMutable` |
| HITL portal-view registry wrappers | **Optional / skipped** | Product UI in `features/organization-admin` |
| Merge FFT **domain** catalogs into platform tables | **Out of scope** | ADR rejected (entry code is not domain merge) |
| Hard multi-org cutover | **Done** | Hard `= org`; no soft dual-mode; no login promote |
| Remove entry bridges after `fft.access` backfill | **Done** | Platform-only decision; promoteLegacy deleted |
| Multi-org ready M1–M4 | **Done** | [multi-tenant-ecosystem.md](../architecture/multi-tenant-ecosystem.md) |
| User CRUD `{ error }` → `ActionResult` | **Done** | Exported org user Actions use `actionOk` / `actionFail` |
| L4 e2e for platform roles assign | **Done** | `e2e/org-roles.spec.ts` (@journey) |

**Roles & Permissions + control-plane completeness:** **100%** for hard cutover + M1–M4 (domain catalog merge remains rejected).

## Related tenancy (Declarations / FFT)

| Item | Status |
|------|--------|
| Declarations `organization_id` + hard filters | **Done** |
| Client invite/assignment get+delete org scope | **Done** |
| CDP package `updateSurvey` org pass-through | **Done** |
| Client onboarding profile org stamp | **Done** |
| DRY hard `organizationScopeSql` (Platform) | **Done** |
| FFT `organization_id` + scoped event reads | **Done** |
| FFT session RBAC lists/stamp/clone/template | **Done** |
| FFT import-store `getEventById` org thread | **Done** |
| Hard cutover (drop `IS NULL OR`) | **Done** |
| `listOrganizationUsers` via `neon_auth.member` | **Done** |
| Isolation unit coverage (membership + hard SQL) | **Done** |
| FFT RBAC seed stamps `organization_id` | **Done** |
| Org switcher + fail-closed resolve (M1) | **Done** |
| Scoped template unique `028` (M2) | **Done** |
| L4 tenancy isolation journeys (M3) | **Done** |
| Org-required ops backfill (M4) | **Done** |

**In-scope tenancy completeness:** **100%** for hard cutover + multi-org ready (intentional non-goals: Neon RLS, FFT domain catalog merge, AdminCN plan/billing columns stay `Basic`/`Manual`, M5 child denorm).

**Living SSOT:** [multi-tenant-ecosystem.md](../architecture/multi-tenant-ecosystem.md).

**Neon efficiency ladder (2026-07-12):** A–E closed — pooler/env, SQL health, Launch recovery (PITR 7d + snapshots), domain hard-root anti-drift (D7), E1 backfill no-op, D8 e2e org resolve fixed. Accepted constraints (not backlog): **D4** (M5 deferred), **D5** (shared-schema). Ops: [multi-org-ops.md](../../docs/runbooks/multi-org-ops.md).

## Verify

```bash
npm run test:unit -- modules/identity/domain/platform-rbac-catalog modules/identity/domain/platform-rbac-org-mutable modules/declarations/domain/organization-scope modules/fft/domain/organization-scope modules/fft/auth
npm run check:tenancy-residue
npm run audit:tenancy-nulls
npx tsc --noEmit
```
