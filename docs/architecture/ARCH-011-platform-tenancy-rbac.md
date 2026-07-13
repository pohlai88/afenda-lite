# ARCH-011 Platform Tenancy + RBAC

| Field | Value |
|-------|-------|
| ID | ARCH-011 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

**Promoted from:** ADR-002 (Accepted 2026-07-12).  
**Companion:** [ARCH-023](turborepo/ARCH-023-multi-tenancy.md) — Neon shared-schema model, Decision lock R*/D*, ops posture.  
**Audience:** Engineers and agents implementing IAM, org-admin Roles/Permissions, or tenant-root filters.

**Enables:** Correct three-tier IAM; hard `organization_id` predicates; `fft.access` as module entry without merging FFT domain catalogs.

**Out of scope:** Neon RLS; Neon Auth custom roles (unsupported); merging FFT **domain** permission catalogs into `platform_*` tables.

**Follow-up done:** FFT `organization_id` (`026`); hard cutover `027`; operator session; org-scoped Users via `neon_auth.member`; control-plane `fft.access`.

---

## Context

Afenda-Lite is an ERP-to-be. Declarations and Feed Farm Trade are pilot modules on one SaaS shell. Neon Auth provides identity and organizations with **fixed** roles (`owner` | `admin` | `member`) and cannot define product permission codes. FFT ships a permission-catalog RBAC; Declarations uses platform permission codes via `requirePlatformOperatorSession` / `requirePlatformPermission` (Neon `admin` bootstraps until assignments exist). Those converge on one platform pattern without inventing a second auth system.

## Responsibilities and boundaries

Adopt a **three-tier IAM** model:

```text
Tier 1  Neon Auth      who the user is + which organization (organizationId = tenant)
Tier 2  Platform RBAC  fixed permission codes + named roles + scoped assignments + audit (modules/identity)
Tier 3  Modules         check permission codes only (hasPermission) — never role display names
```

| Layer | Owns | Must not |
|-------|------|----------|
| Neon Auth | Identity, membership, invites, active org | Product permission codes |
| Platform RBAC | Catalogs, org-scoped assignments, `fft.access` | FFT domain event/order permissions |
| Module domain | Org-scoped queries/writes + business rules | Ambient org; first-org stamp when multi-member |

## Rules

1. Neon org roles manage membership/invite only — not product authorization.
2. Neon `user.role` `admin`|`user` bootstraps platform access until assignments exist; product code must prefer permission checks.
3. Platform catalog is product-owned; adding a code is a release; assigning it to a role is an org-admin action.
4. Scope v1: `organization` | `platform`. Defer team/BU/event to later ADRs.
5. FFT keeps its own `fft_*` **domain** catalog (event/order/allocation/…). Do not merge domain codes into `platform_permission`. Platform owns **module entry** via `fft.access` (org-scoped control plane). Additive `organization_id` on FFT tables in `026`; hard `NOT NULL` + hard SQL filters in `027`.
6. Reads: RSC → Identity domain. Mutations: Server Actions + Zod + `ActionResult`. No new web-UI REST list endpoints for IAM chrome.
7. AdminCN Roles/Permissions DNA adapts into `features/organization-admin`; demo zustand stays DNA-only.
8. **Neon RLS is out of scope** for the product path (Server Actions + explicit org predicates). RLS is for Neon Data API; this app does not use Data API for tenant data.
9. Tenant-root reads/writes use hard `organization_id = $org` only — no soft `(NULL OR org)` dual-mode after Gate 0 + `027`.

## Seed permission codes (v1)

```text
org.users.manage | org.roles.manage
declarations.manage | declarations.read
clients.invite | account.self
fft.access
```

## Seed role templates (display names only)

```text
Org Admin → all v1 codes (includes fft.access)
Editor → declarations.manage, declarations.read, clients.invite, account.self
Viewer → declarations.read, account.self
```

## Key decisions

| Decision | Record |
|----------|--------|
| Three-tier IAM | This doc |
| Shared schema (not project-/schema-per-tenant) | [ARCH-023](turborepo/ARCH-023-multi-tenancy.md) § Shared-schema |
| Hard tenancy; no soft dual-mode | Migration `027` · ARCH-023 **R1** |
| FFT domain catalogs stay separate | This doc · ARCH-023 **R6** |
| Neon RLS not default on BFF | ARCH-023 **R3** |

## Consequences

- Declarations + FFT tenant roots are `organization_id NOT NULL` (`027`); app filters are hard `= org`.
- `/dashboard/users` is membership-scoped via `neon_auth.member`.
- `/dashboard/roles` and `/dashboard/permissions` are organization-admin product routes.
- S12 tenancy hard cutover is **closed** (soft dual-mode deleted).
- Multi-org ready M1–M4 (logical) and Neon posture: [ARCH-023](turborepo/ARCH-023-multi-tenancy.md).
- Do not invent UI registry IDs; product UI lives under `features/organization-admin` until HITL registers portal-view blocks.

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Encode product IAM in Neon Auth roles | Neon forbids custom roles/permissions |
| Only Neon `admin`\|`user` forever | Cannot support ERP multi-module SaaS |
| Merge FFT **domain** catalogs into platform tables now | Couples FFT gate-register to platform IAM; scopes differ |
| Ship AdminCN zustand demo as product | Fake data; violates fake-db ban |
| Soft `(NULL OR org)` dual-mode after Gate 0 | Fail-open; hard-deleted (`027` + residue CI) |
| Neon RLS as default BFF tenant isolation | Data API concern; product path is Server Actions + hard SQL |
| Schema-per-tenant | Ops complexity without preferred isolation benefits |
| Project-per-tenant as default / efficiency fix | Conflicts with one Modular Monolith + one Vercel deploy (ARCH-023 **R5/D5**) |
| First-org `ORDER BY … LIMIT 1` stamp | Wrong-tenant risk; active/sole membership or `--organization-id` |

**Coding freeze:** [ARCH-023 Decision lock](turborepo/ARCH-023-multi-tenancy.md).

## Related

| Doc | Role |
|-----|------|
| [ARCH-023](turborepo/ARCH-023-multi-tenancy.md) | Neon shared-schema + Decision lock (absorbed ADR-012) |
| [ARCH-022](turborepo/ARCH-022-system-overview.md) | System framework (former ADR-001) |
| [FFT-MOD-005](../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md) | FFT domain RBAC |
| [ARCH-023](turborepo/ARCH-023-multi-tenancy.md) | Multi-tenancy + phase evidence |

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-07-13 | Promoted from ADR-002; frontend folder map renumbered to ARCH-029 |
