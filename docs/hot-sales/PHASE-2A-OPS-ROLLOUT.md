# Hot Sales Phase 2A RBAC — Ops Rollout Checklist

| Field | Value |
|-------|-------|
| **Status** | **Open** — operational tracker only |
| **Date** | 2026-07-09 |
| **GitHub issue** | [#1](https://github.com/pohlai88/iam-check/issues/1) |
| **Product boundary** | Tag `hot-sales-phase-2a` → `8e650ff` (**immutable**) |
| **Readiness docs** | Commit `0fd22f4` · [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) |

## Scope statement

This tracker covers **operational rollout** of Phase 2A RBAC after the product boundary tag `hot-sales-phase-2a`.

It does **not** reopen 2A design and does **not** authorize 2B–2D scope.

### Operating rule

> **Any change required to safely enable or roll back Phase 2A is allowed. Any change that improves, expands, renames, or reorganizes Phase 2A is not allowed.**

| Change | Allow? |
|--------|--------|
| Fix broken readiness doc link | Yes |
| Add missing smoke evidence note | Yes |
| Patch a bug where flag=false path breaks | Yes |
| Add a new permission | No |
| Add a new RBAC screen | No |
| Rename `HOT_SALES_RBAC_ENABLED` | No |
| Move RBAC files into cleaner folders | No |
| Change migration shape after approval | Only if production-blocking |

---

## Fixed refs

- [ ] Product boundary confirmed: `hot-sales-phase-2a` → `8e650ff`
- [ ] Readiness docs confirmed: `0fd22f4`
- [ ] [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) reviewed
- [ ] Cross-links verified from slices / PRD-V2 / feedback / S19

## Migration

- [ ] Apply `014_hot_sales_rbac.sql`
- [ ] Confirm migration applied successfully
- [ ] Confirm app still runs with `HOT_SALES_RBAC_ENABLED=false`

## Flag=false smoke

**Critical checkpoint — do not skip or compress.**

- [ ] Deploy with RBAC disabled
- [ ] Run Phase 1 Admin + allowlist smoke
- [ ] Confirm legacy/Phase 1 admin path still works
- [ ] Confirm no RBAC-only behavior is active

## Seed / assignment

- [ ] Seed/update roles
- [ ] Assign initial users
- [ ] Confirm sensitive permissions require explicit grants
- [ ] Confirm sensitive grant seed/update writes `hot_sales_rbac_audit`

## Pre-enable matrix

Verify **UI and action-level** access (UI hiding alone is not enough):

- [ ] `/trade/[locale]/admin/rbac` loads for intended admin
- [ ] `/trade/[locale]/admin/rbac` denies unauthorized user
- [ ] `/trade/[locale]/admin/events/new` loads for authorized user
- [ ] Event create action allows authorized user
- [ ] Event create action denies unauthorized user
- [ ] Unknown team denies with `team_scope_unresolved`
- [ ] Unknown BU denies with `bu_scope_unresolved`
- [ ] Sensitive permission without explicit grant denies
- [ ] Sensitive permission with explicit grant allows
- [ ] Action guards verified independently of UI visibility

## Controlled enable

- [ ] Set `HOT_SALES_RBAC_ENABLED=true`
- [ ] Run `npm run env:compose`
- [ ] Deploy controlled environment
- [ ] Re-run UI + action matrix
- [ ] Capture evidence

## Production enable

- [ ] Confirm controlled environment evidence is clean
- [ ] Enable production flag
- [ ] Run smoke
- [ ] Monitor denial reasons
- [ ] Confirm rollback path remains available

## Rollback

Primary lever (not DB rollback):

- [ ] Set `HOT_SALES_RBAC_ENABLED=false`
- [ ] Run `npm run env:compose`
- [ ] Redeploy
- [ ] Confirm Phase 1 Admin + allowlist behavior resumes

---

## Rollout sequence (do not compress)

```text
014 migrate
→ flag=false
→ deploy
→ Phase 1 smoke          ← critical checkpoint
→ seed/assign
→ matrix: UI + actions
→ flag=true in controlled env
→ evidence
→ production enable
```

---

## Still out of scope

| Not allowed | Reason |
|-------------|--------|
| 2B–2D | Product scope closed |
| New permissions | Reopens RBAC design |
| New RBAC UI | Reopens surface area |
| New schema (non-emergency) | Breaks migration freeze |
| Layout / `lib/` / components cleanup | Separate normalization campaign |

---

## Bottom line

**Ship the approved RBAC capability operationally; do not keep building it.**
