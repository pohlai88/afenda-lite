# ADR-002: Platform tenancy + RBAC

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Accepted** | 2026-07-12 |
| **Owners** | Platform / Identity |
| **Scope** | Multi-tenant boundary + app-owned permission-catalog RBAC for Afenda-Lite modules |
| **Out of scope** | Neon RLS; Neon Auth custom roles (unsupported); merging FFT **domain** permission catalogs into `platform_*` tables |
| **Follow-up done** | FFT `organization_id` (026); operator session; org-scoped reads; **control-plane** `fft.access` module entry (catalogs remain separate) |

**Related:** [001-modular-monolith-hexagonal.md](./001-modular-monolith-hexagonal.md) · [docs/fft/adr/001-rbac.md](../../docs/fft/adr/001-rbac.md) · Neon Auth Organization plugin (owner/admin/member fixed)

---

## Context

Afenda-Lite is an ERP-to-be. Declarations and Feed Farm Trade are pilot modules on one SaaS shell. Neon Auth provides identity and organizations with **fixed** roles (`owner` | `admin` | `member`) and cannot define product permission codes. FFT already ships a permission-catalog RBAC; Declarations product authorization uses platform permission codes via `requirePlatformOperatorSession` / `requirePlatformPermission` (Neon `admin` bootstraps until assignments exist). Those converge on one platform pattern without inventing a second auth system.

## Decision

Adopt a **three-tier IAM** model:

1. **Tier 1 — Neon Auth:** who the user is + which organization they belong to (`organizationId` = tenant boundary).
2. **Tier 2 — Platform RBAC (app DB):** fixed permission codes + named roles + scoped assignments + audit under `modules/identity`.
3. **Tier 3 — Modules:** check permission codes only (`hasPermission`), never role display names.

### Rules

1. Neon org roles manage membership/invite only — not product authorization.
2. Neon `user.role` `admin`|`user` bootstraps platform access until assignments exist; product code must prefer permission checks.
3. Platform catalog is product-owned; adding a code is a release; assigning it to a role is an org-admin action.
4. Scope v1: `organization` | `platform`. Defer team/BU/event to later ADRs.
5. FFT keeps its own `fft_*` **domain** catalog (event/order/allocation/…). Do not merge domain codes into `platform_permission`. Platform owns **module entry** via `fft.access` (org-scoped control plane). Additive `organization_id` on FFT tables landed in migration `026`.
6. Reads: RSC → Identity domain. Mutations: Server Actions + Zod + `ActionResult`. No new web-UI REST list endpoints.
7. AdminCN Roles/Permissions DNA (`ACN-BLK-APPS-ROLES` / `PERMISSIONS`) adapts into `features/organization-admin`; demo zustand stays DNA-only.

### Seed permission codes (v1)

```text
org.users.manage | org.roles.manage
declarations.manage | declarations.read
clients.invite | account.self
fft.access
```

### Seed role templates (display names only)

```text
Org Admin → all v1 codes (includes fft.access)
Editor → declarations.manage, declarations.read, clients.invite, account.self
Viewer → declarations.read, account.self
```

## Consequences

- Declarations tables gain nullable `organization_id` for progressive tenancy; enforcement filters land with backfill.
- `/dashboard/roles` and `/dashboard/permissions` become organization-admin product routes.
- S12 tenancy is **reopened** under this ADR (was frozen pending S17).
- Agents must not invent UI registry IDs; product UI lives under `features/organization-admin` until HITL registers portal-view blocks.

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Encode product IAM in Neon Auth roles | Neon forbids custom roles/permissions |
| Only Neon `admin`\|`user` forever | Cannot support ERP multi-module SaaS |
| Merge FFT **domain** catalogs into platform tables now | Couples FFT gate-register to platform IAM; scopes differ |
| Ship AdminCN zustand demo as product | Fake data; violates fake-db ban |
