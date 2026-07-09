# Phase 2A — Implementation slice plan

| Field | Value |
|-------|-------|
| **Status** | **Proposed** — planning only; **not** approved for implementation |
| **Date** | 2026-07-09 |
| **Contract** | [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) (**Accepted**) |
| **RBAC ADR** | [ADR-001-phase-2-rbac.md](./ADR-001-phase-2-rbac.md) (**Accepted**) |
| **Phase 1 baseline** | `1bc1294` · tag `hot-sales-phase-1` |

### Gate

**Do not implement** any Phase 2A code or schema until this slice plan is **explicitly approved**.

After approval, implement **one slice at a time** (implement → test → verify → commit), in order. Do not start 2B–2D from this plan.

---

## Scope of Phase 2A

```text
SaaS-style configurable RBAC
+ dedicated /trade/[locale]/admin/events/new
```

**Out of this plan:** finance tables, pickup/ops, Excel, notifications, ERP, layout/repo-migration WIP, declaration domain.

---

## Dependency order

```text
2A-0  docs acceptance (done when this plan is Approved)
  ↓
2A-1  RBAC schema plan (design freeze; migration text may be drafted, not applied until Approved + execute)
  ↓
2A-2  permission catalog + role templates (seed data)
  ↓
2A-3  permission guard design (pure helpers + contracts)
  ↓
2A-4  bootstrap + dual-read compatibility (Admin + allowlist → assignments)
  ↓
2A-5  role management UI
  ↓
2A-6  user role assignment UI
  ↓
2A-7  apply guards to existing /trade flows
  ↓
2A-8  dedicated /admin/events/new
  ↓
2A-9  verification + closure
```

Slices 2A-5 and 2A-6 may be parallelized **after** 2A-4 if staffing allows; both must complete before 2A-7.

---

## Slice catalog

### 2A-0 — Docs acceptance

| | |
|--|--|
| **Goal** | Confirm ADR-001 + PRD-V2-Phase2 Accepted; this plan Approved |
| **Deliverables** | Status flips; cross-links; no code |
| **AC** | Stakeholders explicitly approve this document |
| **Verify** | Doc statuses read Accepted / Approved |
| **Depends on** | — |

### 2A-1 — RBAC schema plan

| | |
|--|--|
| **Goal** | Freeze additive table design for permissions, roles, assignments, rbac audit |
| **Deliverables** | Schema design note (columns, FKs, indexes) aligned to ADR-001; draft migration file **unapplied** until execute approval |
| **AC** | Tables cover catalog, role, role_permission, role_assignment (with scope), rbac_audit; Phase 1 tables untouched except additive FKs if any; piglet-free |
| **Verify** | Design review sign-off; no `db:migrate` until slice execute is approved |
| **Depends on** | 2A-0 |
| **Risk** | Over-scoping team/BU entities — prefer nullable `scope_type` + `scope_id` with documented enums |

### 2A-2 — Permission catalog + templates

| | |
|--|--|
| **Goal** | Seed fixed permission codes and default role templates (job titles as templates only) |
| **Deliverables** | Seed script or migration seed; template → permission mapping matrix |
| **AC** | Catalog matches ADR-001 examples (extend only with review); templates include Super Admin … General Manager list; **no** app enum of role names; sensitive perms not granted to all sales templates |
| **Verify** | Unit/integration assert seed idempotency; spot-check template permissions |
| **Depends on** | 2A-1 applied (when executing) |

### 2A-3 — Permission guard design

| | |
|--|--|
| **Goal** | Pure server helpers: resolve effective permissions for user + scope; `requirePermission` / `can` API |
| **Deliverables** | `lib/domain/trade` (or `lib/auth/trade-*`) guard module + L0 tests; no UI yet |
| **AC** | Checks permission **codes** only; supports own/team/event/BU/company/platform scopes per ADR; documented failure reasons |
| **Verify** | Unit tests for allow/deny matrix; no dependency on role display names |
| **Depends on** | 2A-2 |

### 2A-4 — Bootstrap + dual-read compatibility

| | |
|--|--|
| **Goal** | Map Phase 1 `isAdminSession` + `hot_sales_sales_member` into role assignments without breaking access |
| **Deliverables** | Bootstrap/backfill path; dual-read: allowlist **or** RBAC assignment grants sales access during cutover |
| **AC** | Existing admins retain full admin-equivalent permissions; allowlisted sales retain order.create + view_own; rollback = disable RBAC path, keep allowlist |
| **Verify** | Manual or e2e: admin + allowlisted sales still reach `/trade`; non-member still denied |
| **Depends on** | 2A-3 |

### 2A-5 — Role management UI

| | |
|--|--|
| **Goal** | Client Admin (role.manage) can create/rename/duplicate/disable roles and edit permission sets |
| **Deliverables** | Admin UI under `/trade/.../admin` (exact path in execute); server actions with guards |
| **AC** | Cannot edit permission catalog codes; can attach/detach permissions on custom roles; changes audited; templates clonable |
| **Verify** | Interaction or journey smoke for create role + assign permission |
| **Depends on** | 2A-4 |

### 2A-6 — User role assignment UI

| | |
|--|--|
| **Goal** | Assign users to roles with scope |
| **Deliverables** | Assignment UI + actions; list assignments; revoke |
| **AC** | Scope selectable per ADR; assignments audited; Sales Executive–style template yields own-orders only when scoped correctly |
| **Verify** | Assign viewer → cannot mutate; assign sales own → sees own orders only |
| **Depends on** | 2A-4 (parallel OK with 2A-5) |

### 2A-7 — Apply guards to existing flows

| | |
|--|--|
| **Goal** | Wire guards into existing trade actions/pages (event setup, order submit, allocation, transfer, export, sales list) |
| **Deliverables** | Replaced/augmented `requireTradeAdmin` / allowlist checks with permission checks; keep dual-read until cutover flag |
| **AC** | Every sensitive action listed in ADR-001 has server-side permission check; UI hides unauthorized actions where practical |
| **Verify** | Unit + smoke/journey; negative tests for missing permission |
| **Depends on** | 2A-5, 2A-6 |

### 2A-8 — Dedicated `/admin/events/new`

| | |
|--|--|
| **Goal** | Dedicated create wizard route (Phase 2A, not Phase 1) |
| **Deliverables** | `/trade/[locale]/admin/events/new`; blank or clone template → draft → redirect setup; optional redirect from list create |
| **AC** | Requires `event.create`; new event starts **draft**; clone GP2 template still data-only; list create may remain or redirect |
| **Verify** | Journey: create via `/new` → setup; permission deny without `event.create` |
| **Depends on** | 2A-7 (guards available) |

### 2A-9 — Verification + closure

| | |
|--|--|
| **Goal** | Prove 2A done; document cutover; no silent allowlist-only path unless flagged |
| **Deliverables** | Test evidence; short closure note in this file or S19; decide allowlist deprecation timeline (may remain dual-read) |
| **AC** | ADR-001 + PRD 2A AC met; smoke + journey (when creds); Phase 1 baseline still rollback-safe; no layout WIP in commits |
| **Verify** | Checklist signed; tag or note `hot-sales-phase-2a` optional |
| **Depends on** | 2A-8 |

---

## Cross-cutting rules (every slice)

- Additive migrations only; no piglet/job-title hardcoding in schema or `if (role === …)`
- Server-side permission checks; audit role/assignment/sensitive changes
- Commits: Hot Sales 2A only — **no** layout/repo-migration WIP
- Preserve `hot-sales-phase-1` rollback reference

---

## Explicit non-goals

- Implementing any slice before this plan is Approved  
- Phase 2B–2D work  
- Dropping `hot_sales_sales_member` in the first 2A cut (dual-read first)  
- Neon Auth org-role redesign outside Hot Sales tables  

---

## Approval

```text
Status: Proposed
Approve by: explicit stakeholder message ("PHASE-2A-SLICES approved" or equivalent)
Then: implement starting at 2A-1 (schema execute) per incremental-implementation
```
