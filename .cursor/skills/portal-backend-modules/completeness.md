# Portal backend modules — completeness (2026-07-12)

Plan authority: this skill + `doc/backend/` + org-admin users vertical slice.

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| Module tree `platform/identity/declarations/fft` | Exact L2 folders | Disk matches | **Done** |
| No `modules/trade/` / `features/trade/` product | Forbidden | Absent | **Done** |
| `lib/` runners only (`entry\|pages\|playground`) | Pass 2 | Disk matches | **Done** |
| Shared Zod + `parseSchema` on Platform | Trade/Identity import Platform | Actions use Platform common | **Done** |
| Trade ↛ Declarations imports | Ban | No matches under `modules/fft` | **Done** |
| api-now Route Handlers (4 trees) | Only health/auth/draft | Disk matches | **Done** |
| Actions map (`account/admin/client/declarations/surveys/fft`) | adapter-map | Disk matches; no `trade.ts` | **Done** |
| Org users list/get domain | IdentityPort | `organization-users.ts` | **Done** |
| Org users RSC + profile compose at adapter | Compose only at page | `organization-admin-users-page.ts` | **Done** |
| Pure display mapper (no Neon Next in unit tests) | Map module | `organization-admin-users-map.ts` | **Done** |
| Create / update / remove / role / ban / unban | Actions | `admin.ts` + shared cores | **Done** |
| Bulk remove / bulk ban | Same Zod edge | `organizationUserIdsSchema` / `banOrganizationUsersSchema` | **Done** |
| Password set / revoke sessions | Actions + view | Wired | **Done** |
| CSV / JSON export | Client filtered list | `organization-admin-users-export.ts` | **Done** |
| Client page size + prev/next | AdminCN chrome live | List pagination wired | **Done** |
| User import | CSV/JSON → create users | `importOrganizationUsersAction` + import dialog | **Done** |
| ClientProfile port (drop Identity→Declarations `getClientProfile`) | Optional follow-up | Narrow edges remain | **Deferred** |
| Absorb `lib/entry\|pages` into features | Explicit approve | Runners kept | **Deferred** |
| `/client` workspace restore | Closed | Closed | **Out of scope** |
| FFT P3 flag promotion | gate-register | Closed | **Out of scope** |
| SaaS plan/billing product fields | Not Identity | Chrome defaults `Basic`/`Manual` | **Intentional** |
| Billing / 2FA / projects / social tabs | AdminCN “Coming soon” | Unchanged | **Deferred chrome** |

## Stabilization (latest)

- Shared `createOrganizationUserForAdmin` for form create + CSV/JSON import
- Shared name/password Zod + `ORGANIZATION_ADMIN_USERS_IMPORT_MAX` (parse + Action + UI)
- Duplicate-email rejection on import parse
- IdentityPort / brands / module-tree / schema-map aligned for import
- Prior: ban/remove cores, `getActionError`, pagination, dead `isPlaceholder` removed

## Verify

```bash
npx tsc --noEmit
npm run test:unit -- features/organization-admin/organization-admin-users-import features/organization-admin/organization-admin-users-export modules/identity/schemas/users lib/pages/organization-admin-users-page
```
