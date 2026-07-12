# Multi-tenant ecosystem (Afenda-Lite)

| Field | Value |
|-------|-------|
| **Status** | Living SSOT — v1 hard cutover **shipped**; **multi-org ready** (M1–M4) **shipped** (logical tenancy; not multi-DB) |
| **Decision ADR** | [doc/backend/adr/002-platform-tenancy-rbac.md](../backend/adr/002-platform-tenancy-rbac.md) |
| **Phase evidence** | [doc/frontend/14-org-admin-rbac-tenancy-tasks.md](../frontend/14-org-admin-rbac-tenancy-tasks.md) |
| **Audience** | Agents + engineers — load this before inventing tenancy features |

**Anti-claim:** Do **not** say “full multi-DB SaaS isolation” — D5 (single Neon branch) remains. After M1–M4: **multi-org ready** means logical tenancy + switcher + scoped templates + org-required ops.

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
| `PORTAL_ORG_SWITCHER_ENABLED` | Show org switcher in AdminCN header (default off) |
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
| Org resolve | `modules/identity/portal-organization.ts` → `resolveActivePortalOrganization` |
| Adapter context | `modules/identity/domain/platform-rbac-access.ts` → `resolvePlatformOrgContext` |
| Hard SQL | `modules/platform/db/organization-scope.ts` |
| FFT entry | `modules/fft/auth/fft-module-access.ts` |
| Migration | `db/migrations/025` → `026` → `027` → `028` (scoped template unique) |
| Org switcher | `PORTAL_ORG_SWITCHER_ENABLED` + `setActiveOrganizationAction` + `features/portal-chrome/organization-switcher.tsx` |

Resolve order (M1): `activeOrganizationId` (if member) → slug match → **sole membership** → create + `setActive`. **Never** `organizations[0]` when membership length > 1 (throws `NO_ACTIVE_ORGANIZATION`).

Ops: [docs/runbooks/multi-org-ops.md](../../docs/runbooks/multi-org-ops.md).
---

## 3. Explicit non-goals of v1

- Neon RLS (product path = Server Actions + SQL predicates; Data API not used for tenant data)
- Merging FFT **domain** permission catalogs into `platform_*`
- Flipping prod `FFT_*` flags without gate-register
- Adding `organization_id` to every FFT child table (`fft_order`, etc.) — parent event join is enough for v1 (M5)

M1–M4 (switcher, scoped templates, isolation journeys, org-required ops) are tracked in §5 — **not** v1 non-goals.

---

## 4. Residual single-org debt register

| ID | Debt | Status |
|----|------|--------|
| D1 | First-org fallback when no active org / slug miss | **Closed (M1)** — sole membership only; multi-org fails closed |
| D2 | Global `UNIQUE(template_key)` on `platform_role` / `fft_role` | **Closed (M2)** — migration `028` scoped unique |
| D3 | No org-switcher UI | **Closed (M1)** — gated by `PORTAL_ORG_SWITCHER_ENABLED` |
| D4 | FFT children inherit org via `fft_event` only | Open (M5 optional) |
| D5 | Single Neon project/branch deploy | Open (infra) |
| D6 | Ops scripts that stamp “first org” | **Closed (M4)** — `backfill-fft-access` requires explicit org |

---

## 5. Post-v1 requirements ecosystem

| Phase | Track | Status | Requirement |
|-------|-------|--------|-------------|
| **M1** | Membership UX | **Shipped** | Org switcher (`PORTAL_ORG_SWITCHER_ENABLED`) + `setActiveOrganizationAction`; no first-org `[0]` when membership length > 1 |
| **M2** | RBAC templates | **Shipped** | Scoped unique `(organization_id, template_key)` NULLS NOT DISTINCT on `platform_role` / `fft_role` (`028`) |
| **M3** | Isolation proof | **Shipped** | L4 `e2e/tenancy-isolation.spec.ts` (missing UUID always; foreign fixtures optional) |
| **M4** | Ops multi-org | **Shipped** | Org-required `backfill-fft-access`; [docs/runbooks/multi-org-ops.md](../../docs/runbooks/multi-org-ops.md) |
| **M5** | Optional data | Proposed | `organization_id` on hot FFT children only if cross-event analytics need it |

---

## Definition of Done — “multi-org ready”

Agents and humans may claim **multi-org ready** only when:

- [x] **M1** Accepted and shipped (switcher + fail-closed bootstrap)
- [x] **M2** Accepted and shipped (template uniqueness per org)
- [x] **M3** Accepted and green in CI (`tenancy-isolation` missing-UUID cases; foreign-org env optional)
- [x] **M4** Accepted (ops playbooks)

**M5** remains optional. Language after M1–M4: **multi-org ready** (logical tenancy + switcher + scoped templates + ops). Still **not** multi-DB isolation (D5).
