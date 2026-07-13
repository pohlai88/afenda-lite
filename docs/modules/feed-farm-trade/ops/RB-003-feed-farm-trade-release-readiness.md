# RB-003 Feed Farm Trade Release Readiness

| Field | Value |
|-------|-------|
| ID | RB-003 |
| Category | Runbook |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| **Status** | **Active** — operational rollout lane (not a product phase) |
| **Date** | 2026-07-09 |
| **Scope** | Phase 2A only. **No 2B / 2C / 2D.** No new permissions, roles, UI surfaces, or schema expansion except emergency fixes. |
| **Contract** | [../spec/phase-2a-prd.md](../spec/GUIDE-016-feed-farm-trade-phase-2a-prd.md) · [../adr/001-rbac.md](../adr/ADR-006-feed-farm-trade-rbac.md) · [../spec/phase-2a-slices.md](../spec/GUIDE-017-feed-farm-trade-phase-2a-slices.md) |

## Related

- Ops checklist: [./rollout.md](./RB-004-feed-farm-trade-ops-rollout.md)
- **Gate SSOT:** [./gate-register.md](./RB-002-feed-farm-trade-gate-register.md)
- Product boundary: tag `fft-phase-2a` → `8e650ff`
- Post-tag hotfix: `4d203a7` on `fix/fft-next-intl-trade-shell` — merge to `main` before next deploy
- Readiness docs commit: `0fd22f4`

---

## Purpose

Validate and safely enable the **already-shipped** Phase 2A RBAC capability.

```text
Freeze scope → protect the tag → promote migration 014 with RBAC dark →
verify Phase 1 path → seed/assign → enable flag only with evidence →
flag=false as primary rollback
```

Do **not** mix this lane with `lib/` / `components/` repo normalization or layout migration WIP.

---

## Fixed refs (canonical boundary)

| Item | Value |
|------|--------|
| Docs approval | `967cf74` |
| Implementation 2A-1–4 | `a49e68a` |
| Implementation 2A-5–9 | `8e650ff` |
| Tag | `fft-phase-2a` → `8e650ff` |
| Post-tag hotfix (Fix lane) | `4d203a7` — merge to `main`; no new tag |
| Phase 1 baseline | tag `fft-phase-1` → `1bc1294` |

Suggested branch names if further commits are needed: `release/fft-phase-2a` or `hardening/fft-phase-2a`.  
Avoid: `phase-2b`, `phase-2-followup`, `phase-2-rbac-more`.

---

## Frozen decisions (do not rename / redesign)

| Area | Decision |
|------|----------|
| Feature flag | `FFT_RBAC_ENABLED` |
| Default | Off (`false` / unset) |
| Rollback | Set flag false → `npm run env:compose` → redeploy |
| Unknown team | Deny (`team_scope_unresolved`) |
| Unknown BU | Deny (`bu_scope_unresolved`) |
| Sensitive permissions | Explicit grant only |
| Sensitive changes | Audit → `fft_rbac_audit` |
| Admin RBAC UI | `/fft/[locale]/admin/rbac` |
| Event create UI | `/fft/[locale]/admin/events/new` |
| Migration | `014_fft_rbac.sql` |

No renaming. No “while we’re here” permission cleanup. No additional roles unless a production blocker.

---

## Safe promotion order

```text
1. Deploy/apply migration 014
2. Keep FFT_RBAC_ENABLED=false
3. Deploy app code (tag fft-phase-2a or equivalent)
4. Verify Phase 1 Admin + allowlist still works
5. Seed/assign roles carefully (admin UI or bootstrap)
6. Enable flag only after verification matrix passes
```

Migration present ≠ RBAC active. The **flag** is the activation switch.

---

## Pre-enable verification matrix

Before `FFT_RBAC_ENABLED=true`, verify **UI and action-level** access:

| Scenario | Expected |
|----------|----------|
| Phase 1 admin, flag off | Works as before |
| Non-admin allowlisted user, flag off | Works as before |
| Unknown team scope | Denied (`team_scope_unresolved`) |
| Unknown BU scope | Denied (`bu_scope_unresolved`) |
| Missing sensitive permission | Denied |
| Explicit sensitive grant | Allowed |
| Sensitive grant create/update | Audit row written |
| `/fft/[locale]/admin/rbac` | Loads for authorized admin |
| `/fft/[locale]/admin/events/new` | Loads; create action guarded |
| Locale routes under `/fft/[locale]/…` | Correct |

Automated baseline (already recorded at closure):

- Unit: 35 trade tests pass (`modules/fft/domain/`)
- Smoke e2e: Trade Feed Farm Trade auth redirect
- `tsc` clean for Phase 2A surfaces

---

## Controlled enable

```text
FFT_RBAC_ENABLED=true
npm run env:compose
deploy
smoke UI + action guards
```

Watch:

| Signal | Want |
|--------|------|
| Unexpected denials | Low / explainable |
| `team_scope_unresolved` / `bu_scope_unresolved` | Zero unless intentional test data |
| Sensitive permission audit | Present for seed/update |
| Create wizard | Completes for intended roles |
| Existing admin flows | No regression |

Production enable only after clean evidence in a controlled environment.

---

## Rollback

### Primary (authorization / behavior)

```text
FFT_RBAC_ENABLED=false
npm run env:compose
redeploy
```

Expected: Phase 1 Admin + allowlist resumes.

### Not the default

| Lever | Use when |
|-------|----------|
| Flag | RBAC logic / access mistakes |
| Code rollback | Deploy/runtime breakage |
| DB rollback of `014` | Migration itself breaks reads/writes |

Do **not** plan migration rollback for RBAC logic mistakes.

---

## Explicit non-goals (this lane)

- Phase 2B–2D
- New permissions or role redesign
- Renaming roles / flag / env keys
- Second RBAC flag
- Schema shape changes unless broken
- `lib/` / `components/` / layout / declaration refactors in the same commits

---

## Operator checklist

- [ ] Tag `fft-phase-2a` protected as approved boundary
- [ ] Migration `014` applied in target env; flag still **false**
- [ ] App deployed; Phase 1 admin smoke OK; **sales allowlist Gate 4B** — see [gate register](./RB-002-feed-farm-trade-gate-register.md)
- [ ] Pre-enable matrix completed (UI + actions)
- [ ] Roles seeded/assigned for pilot users
- [ ] Flag enabled in controlled env; smoke clean
- [ ] Production enable only after controlled evidence
- [ ] Rollback path rehearsed (`flag=false` + compose + redeploy)

---

## Bottom line

**Phase 2A is an operational rollout, not a development phase.**

Protect the tag, keep RBAC dark by default, promote `014` safely, verify action-level authorization, enable by env flag only when ready, and keep unrelated architecture work out of this lane.
