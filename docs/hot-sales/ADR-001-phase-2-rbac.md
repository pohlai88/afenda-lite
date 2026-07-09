# ADR-001: Hot Sales Phase 2 — SaaS-style configurable RBAC

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Accepted** | 2026-07-09 |
| **Date** | 2026-07-09 |
| **Owners** | Hot Sales / Trade |
| **Scope** | Access control for `/trade` Hot Sales Event Engine (Phase 2A foundation) |
| **Out of scope** | Finance settlement SoT, pickup ops schema, ERP sync, notification provider, declaration-portal IAM |

**Related:** [PHASE-2-FEEDBACK.md](./PHASE-2-FEEDBACK.md) (authoritative planning) · [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) · [PRD-V2.md](./PRD-V2.md) (Phase 1 accepted @ `1bc1294` / `hot-sales-phase-1`) · [PHASE-2-SCOPING.md](./PHASE-2-SCOPING.md) (candidate list; 7-role framing superseded)

**Gate:** This ADR, [PRD-V2-Phase2.md](./PRD-V2-Phase2.md), and [PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md) are **Accepted / closed**. **Operational rollout** — [PHASE-2A-OPS-GATE-REGISTER.md](./PHASE-2A-OPS-GATE-REGISTER.md). Do not start 2B–2D or reopen 2A product scope.

---

## Context

Phase 1 Hot Sales uses:

- **Admin** — portal `isAdminSession`
- **Sales** — email allowlist (`hot_sales_sales_member`) with own-orders visibility

That is enough for the Phase 1 engine, but it does not scale to multi-client SaaS, team/BU scoping, finance/ops permissions, or client-specific org charts.

A naive Phase 2 approach would hardcode job titles as application role enums:

```text
Super Admin, Client Admin, Business Unit Manager, Sales Executive,
Sales Supervisor, Sales Manager, Sales Operations, Account/Finance,
Viewer, Commercial Operation & Governance, General Manager
```

That repeats the same class of mistake as piglet-in-schema: org-chart labels become code contracts, every client rename or new title requires a release, and permission checks become `if (role === "Sales Manager")`.

---

## Decision

Adopt a **permission-catalog RBAC** model for Hot Sales:

```text
Fixed permission codes (product-owned)
+ Client-customisable roles (named bags of permissions)
+ Seeded role templates (job titles as defaults only)
+ Scoped role assignments (own / team / event / BU / company / platform)
+ Audit of role and assignment changes
```

### Rules

1. **No code depends on role display names.** Authorization checks permission codes (and scope), never `"Sales Manager"`.
2. **Job titles are templates only.** The list above may be seeded as default templates a Client Admin can clone, rename, disable, or ignore.
3. **Permissions are fixed and versioned** in product (catalog). Adding a permission is a product change; assigning it to a role is a client admin action.
4. **Assignments are scoped.** A user may hold a role for own data, a team, an event, a BU, the company, or (platform) operators — exact scope enum finalized in PRD-V2-Phase2 / 2A slices.
5. **Server-side enforcement is mandatory** for every sensitive trade action (create/edit/open event, order create/view, allocation, transfer, deposit, pickup, export, role.manage).
6. **Phase 1 compatibility:** Until cutover completes, existing Admin + Sales allowlist behavior must continue to work (bootstrap mapping or dual-read). Rollback reference remains tag `hot-sales-phase-1`.
7. **Portal operator admin** (`isAdminSession`) maps to a platform-scoped Super Admin / equivalent template — not a second parallel auth system inside Hot Sales.

### Suggested permission catalog (initial; refine in 2A slices)

```text
event.view | event.create | event.edit | event.open_close
product.manage | supply.manage | priority.manage | custom_field.manage
order.create | order.view_own | order.view_team | order.view_all
allocation.preview | allocation.run | allocation.override
transfer.request | transfer.approve
deposit.view | deposit.manage
pickup.view | pickup.manage
export.orders | export.finance
audit.view | role.manage
```

Sensitive permissions (e.g. `allocation.override`, `role.manage`, `deposit.manage`) require explicit grant; templates must not silently grant them to all sales roles.

### Seeded role templates (display names only)

| Template name | Intent (non-normative) |
|---------------|------------------------|
| Super Admin | Platform / full Hot Sales control |
| Client Admin | Client org admin; role.manage |
| Business Unit Manager | BU-scoped management |
| Sales Executive | Create orders; view own |
| Sales Supervisor | Team-scoped order view |
| Sales Manager | Broader sales scope |
| Sales Operations | Ops-adjacent sales support |
| Account/Finance | Deposit view/manage (when 2B ships) |
| Viewer | Read-only |
| Commercial Operation & Governance | Governance / commercial oversight |
| General Manager | Broad read + selected manage |

Clients may rename or disable templates; product code must not `switch` on these strings.

### Suggested data shape (planning; schema only after approval)

```text
hot_sales_permission          — catalog (code PK, description, sensitivity)
hot_sales_role                — client-owned role (name, active, is_template_seed?)
hot_sales_role_permission     — role ↔ permission
hot_sales_role_assignment     — user ↔ role ↔ scope_type ↔ scope_id
hot_sales_rbac_audit          — role/permission/assignment changes
```

Exact columns, Neon Auth user id linkage, and migration from `hot_sales_sales_member` are deferred to approved 2A slices.

---

## Alternatives considered

| Alternative | Why rejected / deferred |
|-------------|-------------------------|
| **Fixed 7–11 app role enums** matching job titles | Brittle; couples code to org chart; fails multi-tenant SaaS |
| **Neon Auth org roles only** | Useful for membership; Hot Sales needs event/team/BU scopes and a permission catalog owned by the product |
| **Keep Phase 1 Admin + allowlist forever** | Blocks finance/ops/ERP safely; not sustainable |
| **ABAC-only (attributes without roles)** | More flexible but heavier UX; roles-as-permission-bags are enough for Phase 2A |

---

## Consequences

### Positive

- Clients customize roles without engineering releases
- Permission checks stay stable as org charts change
- Clear path to finance/ops permissions in 2B without rewriting auth
- Aligns with reusable Hot Sales engine (not one-company hardcoding)

### Negative / costs

- More tables and admin UI than Phase 1 allowlist
- Requires careful Phase 1 → 2A migration and dual-read period
- Scope model (team/BU) needs clear definitions before coding

### Follow-ups (not this ADR)

- ADR-002 finance source of truth (before 2B settlement claims)
- ADR-003 notifications provider (before 2C mail)
- ADR-004 ERP sync contract (before 2D)

---

## Acceptance criteria

```text
- [x] Document status flipped to Accepted by explicit stakeholder approval (2026-07-09)
- [x] PRD-V2-Phase2 references this ADR as normative for 2A RBAC
- [ ] No implementation until Phase 2A slices are explicitly approved
- [ ] Implementation must not hardcode job-title role enums
- [ ] Implementation must check permission codes server-side
- [ ] Role/assignment changes must be audited
- [ ] Phase 1 Admin + Sales allowlist behavior preserved through cutover
```

---

## Rollback

If 2A RBAC is abandoned after partial work: keep additive tables unused; continue Phase 1 `isAdminSession` + sales allowlist; baseline remains `hot-sales-phase-1`.
