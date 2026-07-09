# Hot Sales Phase 2A RBAC — Ops Rollout Checklist

| Field | Value |
|-------|-------|
| **Status** | **Closed** — Gate 7 complete; issue #1 closed 2026-07-10 |
| **Date** | 2026-07-10 (Gate 7 production RBAC enable) |
| **GitHub issue** | [#1](https://github.com/pohlai88/iam-check/issues/1) — **closed** |
| **Product boundary** | Tag `hot-sales-phase-2a` → `8e650ff` (**immutable**) |
| **Readiness docs** | Commit `0fd22f4` · [./release-readiness.md](./release-readiness.md) |
| **Gate SSOT** | [./gate-register.md](./gate-register.md) — **read first** |

## Scope statement

This tracker covers **operational rollout** of Phase 2A RBAC after the product boundary tag `hot-sales-phase-2a`.

**Gate status and drift rules:** [./gate-register.md](./gate-register.md) (canonical).

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

- [x] Product boundary confirmed: `hot-sales-phase-2a` → `8e650ff`
- [x] Readiness docs confirmed: `0fd22f4`
- [x] [./release-readiness.md](./release-readiness.md) reviewed
- [x] Cross-links verified from slices / PRD-V2 / feedback / S19

## Migration

- [x] Apply `014_hot_sales_rbac.sql`
- [x] Confirm migration applied successfully
- [x] Confirm app still runs with `HOT_SALES_RBAC_ENABLED=false`

## Flag=false smoke

**Critical checkpoint — do not skip or compress.**

- [x] Deploy with RBAC disabled
- [x] Admin matrix passed (Gate 4 admin) — see [gate register](./gate-register.md)
- [x] **Gate 4B:** Sales allowlist matrix — **closed as data/setup** (see [gate register](./gate-register.md#gate-4b--sales-allowlist-matrix-closed--datasetup))
- [x] Confirm legacy/Phase 1 admin path still works (Gate 4 admin)
- [x] Confirm no RBAC-only behavior is active (production `HOT_SALES_RBAC_ENABLED=false`)

### Gate 4B — sales allowlist (flag off)

See [./gate-register.md § Gate 4B](./gate-register.md#gate-4b--sales-allowlist-matrix-active-work).

- [x] Production DB checked (`br-tiny-hill-ao82jp6f`): allowlist row added (data-ops)
- [x] Sales test account allowlisted on live deploy DB (`br-super-hill-aojc9a4p`) for matrix
- [x] Open event + product exists for order-create test — live + production branch
- [x] Rows 6–10 re-run (2026-07-10) — **5/5 pass** — see [gate register](./gate-register.md#production-evidence-2026-07-09-data-setup--2026-07-10-matrix)

## Seed / assignment

- [x] Seed/update roles (Gate 6 controlled local run on `dev-spec-b`)
- [x] Assign initial users (platform `sales_executive` for matrix)
- [x] Confirm sensitive permissions require explicit grants (`rbac.test.ts`)
- [x] Confirm sensitive grant seed/update writes `hot_sales_rbac_audit`

## Pre-enable matrix

Verify **UI and action-level** access (UI hiding alone is not enough):

- [x] `/trade/[locale]/admin/rbac` loads for intended admin
- [x] `/trade/[locale]/admin/rbac` denies unauthorized user
- [x] `/trade/[locale]/admin/events/new` loads for authorized user
- [x] Event create action allows authorized user
- [x] Event create action denies unauthorized user
- [x] Unknown team denies with `team_scope_unresolved`
- [x] Unknown BU denies with `bu_scope_unresolved`
- [x] Sensitive permission without explicit grant denies
- [x] Sensitive permission with explicit grant allows
- [x] Action guards verified independently of UI visibility

## Controlled enable

- [x] Set `HOT_SALES_RBAC_ENABLED=true` (local controlled run only)
- [x] Run `npm run env:compose`
- [x] Deploy controlled environment (`localhost:3000` dev server)
- [x] Re-run UI + action matrix — **17/17 PASS** (2026-07-10)
- [x] Capture evidence — [gate register § Gate 6](./gate-register.md#gate-6--controlled-rbac-matrix-local-only); code under test `51e9a5b`; register closeout `25c3891`; local `.env` restored to `HOT_SALES_RBAC_ENABLED=false`

## Production enable

- [x] Confirm controlled environment evidence is clean (Gate 6)
- [x] Enable production flag — **done** (Gate 7 · 2026-07-10 · `HOT_SALES_RBAC_ENABLED=true` on Vercel)
- [ ] Run smoke (production, `flag=true`)
- [ ] Monitor denial reasons
- [ ] Confirm rollback path remains available (production drill)

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
→ Phase 1 smoke (admin ✅ · sales Gate 4B closed — data/setup)
→ merge hotfix 4d203a7 to main ✅
→ operator: production allowlist + event data
→ re-run sales matrix rows 6–10
→ matrix: UI + actions ✅ (Gate 6 local 17/17 · `51e9a5b`)
→ flag=true in controlled env ✅ (local only; production flag stays false)
→ evidence ✅ (`25c3891` gate register)
→ DB cutover (Vercel `dev-spec-b` → `br-tiny-hill-ao82jp6f`) ✅ (2026-07-10 · `d05eae2` + `dpl_8btf19EFofKLQmcswLJQWNXfGEVV`)
→ production enable ✅ Gate 7 PASS (2026-07-10)
```

Post-tag hotfix `4d203a7` (TradeShell next-intl) must be on `main` before the next production deploy — see [gate register](./gate-register.md#hotfix-merge-requirement).

---

## Gate 7 — complete (2026-07-10)

**DB cutover:** ✅ `br-tiny-hill-ao82jp6f` live on Vercel.  
**Auth hygiene:** ✅ `allow_localhost: false` on production branch.  
**Production RBAC:** ✅ `HOT_SALES_RBAC_ENABLED=true`; compact smoke **17/17 PASS**.  
Evidence: [gate register § Gate 7](./gate-register.md#gate-7--production-rbac-enable-complete).

**Rollback:** `HOT_SALES_RBAC_ENABLED=false` → `env:compose` → `sync:vercel` → `vercel deploy --prod`.

| Branch | Role |
|--------|------|
| `br-super-hill-aojc9a4p` (`dev-spec-b`) | Local dev / Gate 6 matrix DB |
| `br-tiny-hill-ao82jp6f` | **Live** Vercel production DB (gate SSOT) |

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
