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
| Role CRUD + assign/revoke Actions (`ActionResult`) | **Done** | `app/actions/admin.ts` + `modules/platform/schemas/action-result.ts` |
| `/dashboard/roles` + `/dashboard/permissions` UI | **Done** | roles/permissions routes + `organization-admin-roles-*` |
| Assign/revoke **UI** | **Done** | User detail → Platform roles (`organization-admin-user-platform-roles.tsx`) |
| Declarations backfill + list/get/mutate org scope | **Done** | `organization-scope` + org-admin loaders + survey/client actions |
| Permission gates `declarations.manage` / `clients.invite` / `org.roles.manage` | **Done** | survey/client/RBAC actions |
| Permission gate `org.users.manage` on user Actions | **Done** | Org-user CRUD + `/dashboard/users` RSC |
| Permission gate `declarations.read` on read surfaces | **Done** | Dashboard / detail / clients / share panel via `anyOf` |
| Permission gate `account.self` | **Done** | `requireAccountSession` + `/account` layout; self-bootstrap when no assignments |
| Operator session beyond Neon admin | **Done** | `requirePlatformOperatorSession` — Editor/Viewer with platform codes can enter ops surfaces |
| Shell `isOrgAdmin` includes platform operators | **Done** | `modules/platform/shell/access.ts` |
| FFT list/create stamp + backfill | **Done** | `fft-organization-context` + store + pages |
| FFT `getEventById` org-scoped on product pages + actions | **Done** | `getFftEventForOrganization` · `getScopedEvent` in `app/actions/fft.ts` |
| Route brand `[declarationId]` (not `[id]`) | **Done** | `app/dashboard/[declarationId]` |
| HITL portal-view registry wrappers | **Optional / skipped** | Product UI stays in `features/organization-admin` (AdminCN skill: no invented IDs) |
| Merge FFT + platform catalogs | **Out of scope** | Catalogs remain separate |
| Hard multi-org cutover (drop `IS NULL OR`) | **Deferred** | Progressive soft filters intentional until cutover |
| FFT import-store internal `getEventById` | **Residual** | Called after action-gated event; soft filter at action/RSC boundary |
| Ghost `/trade` + `lib/domain/trade` | **Residue** | Deprecated Hot Sales paths — not product surface |

**In-scope completeness:** ~98% (soft tenancy + optional HITL/catalog merge excluded by design).

## Delivered paths (operator + tenancy)

| Layer | Path |
|-------|------|
| Operator session | `modules/identity/auth/platform-operator-session.ts` |
| Tenancy bootstrap | `features/organization-admin/organization-admin-tenancy.ts` |
| Assign/revoke UI | `features/organization-admin/organization-admin-user-platform-roles.tsx` |
| Users manage gate | `assertUsersManageAllowed` → `org.users.manage` + operator session |
| Account self gate | `modules/identity/account-session.ts` + `app/account/layout.tsx` |
| FFT org event read | `features/fft/fft-organization-context.ts` |

## Verify

```bash
npm run test:unit -- modules/identity/domain/platform-rbac-catalog features/organization-admin/organization-admin-declaration-detail
npx tsc --noEmit
```

Manual: `/dashboard/users` requires `org.users.manage` (or Neon admin); `/dashboard/users/[userId]` → Account → Platform roles; `/account` requires `account.self`; FFT event pages 404 for cross-org ids after stamp.
