# Multi-tenant ecosystem (Afenda-Lite)

| Field | Value |
|-------|-------|
| **Status** | Living SSOT — v1 hard cutover **shipped**; multi-org ready **not** claimed |
| **Decision ADR** | [doc/backend/adr/002-platform-tenancy-rbac.md](../backend/adr/002-platform-tenancy-rbac.md) |
| **Phase evidence** | [doc/frontend/14-org-admin-rbac-tenancy-tasks.md](../frontend/14-org-admin-rbac-tenancy-tasks.md) |
| **Audience** | Agents + engineers — load this before inventing tenancy features |

**Anti-claim:** Do **not** say “full multi-org SaaS” or “multi-org ready” until [Definition of Done](#definition-of-done--multi-org-ready) below. v1 is **hard tenancy filters** on a single active portal org bootstrap.

---

## 1. What is shipped (v1 hard cutover)

Three-tier IAM (ADR-002):

```text
Tier 1  Neon Auth     organization / member / session.activeOrganizationId
Tier 2  Platform RBAC platform_* + fft.access (module entry)
Tier 3  Modules       hard organization_id = $org on tenant roots
```

| Capability | Evidence |
|------------|----------|
| Hard SQL scope | `modules/platform/db/organization-scope.ts` → `col = $n` |
| Required org on tenant APIs | Declarations + FFT domain; Actions pass org from `resolvePlatformOrgContext` |
| Users directory | `listOrganizationUsers` / `getOrganizationUser` ⋈ `neon_auth.member` |
| FFT module entry | `hasFftModuleAccess` → platform `fft.access` only (no login promote) |
| Schema | Migration `027` — eight roots `NOT NULL` + full indexes |
| Ops / CI | `npm run audit:tenancy-nulls` · `check:tenancy-residue` · `backfill:fft-access` |

---

## 2. Configuration inventory

### Repo env (tenancy-relevant)

| Var | Meaning |
|-----|---------|
| `PORTAL_ORG_SLUG` / `PORTAL_ORG_NAME` | Neon Auth org bootstrap identity (optional; defaults from `APP_URL` / product name) |
| `APP_URL` | Invite Origin + slug fallback |
| `FFT_RBAC_ENABLED` | FFT **domain** dual-read flag — **not** soft SQL tenancy |
| `NEON_ORG_ID` | Neon **Cloud** account org — **not** the Auth tenant id |

No Neon Auth organization UUID is hardcoded in app runtime; tenant id is resolved from session / list / create.

### Neon Auth (Tier 1)

| Object | Role |
|--------|------|
| `neon_auth.organization` | Tenant registry |
| `neon_auth.member` | Membership SoT for Users UI |
| `session.activeOrganizationId` | Preferred resolver input (N1) |

### App DB tenant roots (`organization_id NOT NULL` after `027`)

| Module | Tables |
|--------|--------|
| Declarations | `surveys`, `client_invitations`, `client_profiles`, `client_assignments` |
| FFT | `fft_event`, `fft_sales_member`, `fft_role`, `fft_role_assignment` |

Platform: `platform_role.organization_id` may be NULL only when `is_system_template = TRUE`. Assignments are always org-scoped.

### Code entrypoints

| Concern | Path |
|---------|------|
| Org resolve | `modules/identity/portal-organization.ts` → `ensurePortalOrganization` |
| Adapter context | `modules/identity/domain/platform-rbac-access.ts` → `resolvePlatformOrgContext` |
| Hard SQL | `modules/platform/db/organization-scope.ts` |
| FFT entry | `modules/fft/auth/fft-module-access.ts` |
| Migration | `db/migrations/025` → `026` → `027` |

Resolve order today: `activeOrganizationId` (if member) → slug match → **first listed org** → create + `setActive`.

---

## 3. Explicit non-goals of v1

- Neon RLS (product path = Server Actions + SQL predicates; Data API not used for tenant data)
- Org-switcher chrome
- Merging FFT **domain** permission catalogs into `platform_*`
- Flipping prod `FFT_*` flags without gate-register
- Adding `organization_id` to every FFT child table (`fft_order`, etc.) — parent event join is enough for v1

---

## 4. Residual single-org debt register

| ID | Debt | Why it blocks “multi-org ready” |
|----|------|----------------------------------|
| D1 | First-org fallback when no active org / slug miss | Second real org can be ignored |
| D2 | Global `UNIQUE(template_key)` on `platform_role` / `fft_role` | Cannot seed independent templates per tenant |
| D3 | No org-switcher UI | Operators cannot change active org in chrome |
| D4 | FFT children inherit org via `fft_event` only | Fine for v1; analytics may need denormalized columns later |
| D5 | Single Neon project/branch deploy | Logical multi-tenant only (not multi-DB isolation) |
| D6 | Ops scripts that stamp “first org” | Unsafe once multiple Auth orgs exist |

---

## 5. Post-v1 requirements ecosystem

Proposed product backlog (**not** Approved for implementation until explicitly reopened):

| Phase | Track | Requirement |
|-------|-------|-------------|
| **M1** | Membership UX | Org switcher bound to `organization.setActive`; fail closed when no active org (remove `organizations[0]` fallback once multi-org is real) |
| **M2** | RBAC templates | Scoped unique `(organization_id, template_key)` and/or per-org template clones |
| **M3** | Isolation proof | L4 journeys: cross-org Users / survey / event → not-found |
| **M4** | Ops multi-org | Per-tenant seed/backfill playbooks; never stamp first-org in multi-org DBs |
| **M5** | Optional data | `organization_id` on hot FFT children only if cross-event analytics need it |

---

## Definition of Done — “multi-org ready”

Agents and humans may claim **multi-org ready** only when:

- [ ] **M1** Accepted and shipped (switcher + fail-closed bootstrap)
- [ ] **M2** Accepted and shipped (template uniqueness per org)
- [ ] **M3** Accepted and green in CI
- [ ] **M4** Accepted (ops playbooks)

**M5** remains optional. Until then, correct language is: **v1 hard tenancy shipped** (filters + NOT NULL + membership Users + `fft.access`).
