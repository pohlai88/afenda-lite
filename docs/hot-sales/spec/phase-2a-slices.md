# Phase 2A — Implementation slice plan

| Field | Value |
|-------|-------|
| **Status** | **Closed** — implementation complete; ops rollout active |
| **Approved** | 2026-07-09 |
| **Date** | 2026-07-09 |
| **Contract** | [./phase-2a-prd.md](./phase-2a-prd.md) (**Accepted**) |
| **RBAC ADR** | [../adr/001-rbac.md](../adr/001-rbac.md) (**Accepted**) |
| **Phase 1 baseline** | `1bc1294` · tag `hot-sales-phase-1` |

### Gate

This slice plan is **Approved** and **implementation closed** (tag `hot-sales-phase-2a` → `8e650ff`). **Active work:** operational rollout — [../ops/gate-register.md](../ops/gate-register.md). Do **not** start Phase 2B, 2C, or 2D or reopen 2A product scope.

---

## Execution clarifications (binding)

1. **RBAC cutover feature flag** — `HOT_SALES_RBAC_ENABLED` (default unset/`false` = Phase 1 Admin + sales allowlist only). When `true`, dual-read: allowlist **or** RBAC assignment. Rollback = set flag false (or unset); no need to drop tables.
2. **Unknown team/BU scope** — If an assignment uses `team` or `bu` scope and the resolver cannot resolve membership for that scope id, the check **denies** (never broadens to company/platform).
3. **Sensitive permissions** — Codes marked sensitive (e.g. `allocation.override`, `role.manage`, `deposit.manage`) require **explicit** grant on a role; granting/revoking them **must** write `hot_sales_rbac_audit`.

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
2A-0  docs acceptance (Approved)
  ↓
2A-1  RBAC schema
  ↓
2A-2  permission catalog + role templates
  ↓
2A-3  permission guard design
  ↓
2A-4  bootstrap + dual-read + feature flag
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

Slices 2A-5 and 2A-6 may be parallelized **after** 2A-4; both must complete before 2A-7.

---

## Slice catalog

### 2A-0 — Docs acceptance

| | |
|--|--|
| **Goal** | Confirm ADR-001 + PRD-V2-Phase2 Accepted; this plan Approved |
| **Status** | **Done** (2026-07-09) |
| **AC** | Stakeholders explicitly approved this document + clarifications above |

### 2A-1 — RBAC schema

| | |
|--|--|
| **Goal** | Additive tables: permission, role, role_permission, role_assignment, rbac_audit |
| **AC** | Piglet-free; scope_type + scope_id; Phase 1 tables untouched except no destructive changes |
| **Depends on** | 2A-0 |

### 2A-2 — Permission catalog + templates

| | |
|--|--|
| **Goal** | Seed fixed permission codes and default role templates |
| **AC** | Templates = job titles as data only; sensitive perms not on all sales templates; idempotent seed |
| **Depends on** | 2A-1 |

### 2A-3 — Permission guard design

| | |
|--|--|
| **Goal** | Pure helpers: effective permissions; deny on unknown team/BU |
| **AC** | Permission codes only; L0 tests for allow/deny + unknown-scope deny |
| **Depends on** | 2A-2 |

### 2A-4 — Bootstrap + dual-read + feature flag

| | |
|--|--|
| **Goal** | Map Admin + allowlist; `HOT_SALES_RBAC_ENABLED` switch |
| **AC** | Flag off → Phase 1 path; flag on → dual-read; admins + allowlisted sales still work |
| **Depends on** | 2A-3 |

### 2A-5 — Role management UI

| | |
|--|--|
| **Goal** | Create/rename/duplicate/disable roles; edit permission sets; audit |
| **Depends on** | 2A-4 |

### 2A-6 — User role assignment UI

| | |
|--|--|
| **Goal** | Assign/revoke users with scope; audit |
| **Depends on** | 2A-4 |

### 2A-7 — Apply guards to existing flows

| | |
|--|--|
| **Goal** | Wire guards into trade actions; respect feature flag |
| **Depends on** | 2A-5, 2A-6 |

### 2A-8 — Dedicated `/admin/events/new`

| | |
|--|--|
| **Goal** | Create wizard route (Phase 2A, not Phase 1) |
| **Depends on** | 2A-7 |

### 2A-9 — Verification + closure

| | |
|--|--|
| **Goal** | Evidence + closure note; optional tag `hot-sales-phase-2a` |
| **Status** | **Closed** (2026-07-09) |
| **Evidence** | `014` applied; 35 trade unit tests; smoke e2e pass; flag defaults off |
| **Depends on** | 2A-8 |

### Closure notes

- `HOT_SALES_RBAC_ENABLED` — rollback switch (default off = Phase 1 path)
- Unknown team/BU → deny (`team_scope_unresolved` / `bu_scope_unresolved`)
- Sensitive permission grants audited (seed + role updates)
- UI: `/admin/rbac`, `/admin/events/new`
- **Not started:** Phase 2B / 2C / 2D
- **Next lane:** [../ops/release-readiness.md](../ops/release-readiness.md) — operational packaging  
- **Ops tracker:** [../ops/rollout.md](../ops/rollout.md) — rollout checklist  
- **Gate SSOT:** [../ops/gate-register.md](../ops/gate-register.md) — **active**; Gates 1–7 closed; stop drift

---

## Cross-cutting rules (every slice)

- Additive migrations only; no piglet/job-title hardcoding in schema or `if (role === …)`
- Server-side permission checks; audit role/assignment/sensitive changes
- Commits: Hot Sales 2A only — **no** layout/repo-migration WIP
- Preserve `hot-sales-phase-1` rollback reference
- Honor the three execution clarifications above

---

## Explicit non-goals

- Phase 2B–2D work from this approval  
- Dropping `hot_sales_sales_member` in the first 2A cut (dual-read first)  
- Neon Auth org-role redesign outside Hot Sales tables  

---

## Approval

```text
Status: Approved (2026-07-09) · Implementation closed (tag hot-sales-phase-2a @ 8e650ff)
Active: operational rollout per ../ops/gate-register.md (Gates 1–7 closed)
```
