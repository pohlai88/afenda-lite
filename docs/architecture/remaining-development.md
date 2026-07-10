# Remaining development — program inventory (internal guide)

| Field | Value |
|-------|-------|
| **Status** | Active — program-level SSOT for open work |
| **Date** | 2026-07-10 |
| **Audience** | Engineers, operators, design reviewers |
| **Mode** | Internal guide (implementation + acceptance handoff) |
| **Program status board** | [TRACKING.md](../TRACKING.md) |

---

## What this document enables

Choose the **next PR or verification sprint** without re-deriving scope from partial checklists. This doc **indexes** lane-specific SSOTs; it does not replace them.

**Decision rule:** Finish **acceptance proof** (S17, PA visual gates) before **new product** (S12 tenancy, Hot Sales 2B–2D, repo normalization).

---

## Closed lanes (do not reopen without explicit approval)

| Lane | Closed | Evidence |
|------|--------|----------|
| Hot Sales Phase 2A ops | 2026-07-10 | Gates 1–7 ✅ · [hot-sales/ops/gate-register.md](../hot-sales/ops/gate-register.md) · GitHub [#1](https://github.com/pohlai88/iam-check/issues/1) closed |
| Hot Sales Phase 2A implementation | Tag `hot-sales-phase-2a` → `8e650ff` | [hot-sales/README.md](../hot-sales/README.md) |
| Guardian Auth functional ship | 2026-07-10 | Merge to `main` · `GUARDIAN_AUTH_SHELL=true` on prod · [ADR-Auth-UI-001](./adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) |
| Guardian Auth module closeout | 2026-07-10 | Design sign-off @1024 · viewport tests 14/14 · [pa-guardian-module-remaining.md](./slices/portal-atmosphere/pa-guardian-module-remaining.md) |
| Architecture automated gates | Ongoing green | `npm run checks` · reliance drift · portal-atmosphere unit/interaction |

**Production Hot Sales state:** `HOT_SALES_RBAC_ENABLED=true` · DB `br-tiny-hill-ao82jp6f` · deploy verified Gate 7 smoke 17/17.

---

## Active lanes — execute in this order

### Lane 1 — S17 production acceptance — **CLOSED 2026-07-10**

**Authority:** [s17-production-acceptance-closure.md](./slices/s17-production-acceptance-closure.md) · [post-deploy sign-off](../backlogs/post-deploy-verification.md#sign-off)

**Completion:** S17 acceptance proof checked · Backlog-01 closed · [TRACKING.md](../TRACKING.md) updated.

---

### Lane 3 — Portal Atmosphere acceptance (parallel)

**Authority:** [pa-closure-register.md](./slices/portal-atmosphere/pa-closure-register.md) · [portal-atmosphere/README.md](./slices/portal-atmosphere/README.md)

Code for PA-P1–P10 is largely delivered; **acceptance proof** (visual baselines, manual matrix, legacy CSS purge) remains.

| Work package | Closes | Prerequisite |
|--------------|--------|--------------|
| **WP-0** Doc truth | G-DOC-* checklist drift | None — doc-only |
| **WP-1** Visual baseline campaign | G-VIS-01–12 | Storybook capture → `docs/ui-evaluation/portal-atmosphere/` |
| **WP-2** Manual matrix + a11y | G-MAN-01–05 | WP-1 or explicit risk acceptance |
| **WP-3** Legacy CSS purge + E2E visual | G-MIG-09–10 | WP-1 complete (Stability-First rule) |
| **WP-4** DX hygiene | G-DX-* | Optional after WP-1 |

**Note:** Guardian Auth (`GuardianAuthFacade`) and `PortalAtmosphere` adapter are **separate production paths**. Lane 2 closes ADR-Auth-UI-001; Lane 3 closes ADR-Portal-BG-001. Do not merge acceptance criteria across them.

---

### Lane 4 — Backlog-01 post-deploy verification

**Authority:** [backlog-01-neon-auth-closure.md](../backlogs/backlog-01-neon-auth-closure.md) · [post-deploy-verification.md](../backlogs/post-deploy-verification.md)

Code complete; **production journey proof** for operator invite, client join, account self-service, and email branding remains.

| Phase | Journeys | Status |
|-------|----------|--------|
| Phase 1 | BL-02 operator invite · BL-03 preview | **Closed** 2026-07-10 |
| Phase 2 | BL-06 client join | **Closed** 2026-07-10 |
| Phase 3 | BL-05 email branding · BL-07 account | **Closed** 2026-07-10 |
| Phase 4 | Program closure | **Closed** 2026-07-10 |

---

## Deferred lanes — blocked until active lanes close

### Hot Sales Phase 2B–2D

**Authority:** [adr/002](../hot-sales/adr/002-finance-deposit-pickup-ops.md) · [003](../hot-sales/adr/003-imports-notifications.md) · [004](../hot-sales/adr/004-erp-sync.md) · [phase-2bcd-slices.md](../hot-sales/spec/phase-2bcd-slices.md)

**2B + 2C implemented** (flags default off). **2D-1** ERP sync framework in progress. Vendor adapter (2D-3) per customer contract.

### S12 — Tenancy / multi-operator SaaS

**Authority:** [s12-tenancy.md](./slices/s12-tenancy.md)

**Unblocked** after S17 closure (2026-07-10). Requires explicit multi-operator SaaS decision + new ADR before implementation ([iam-check-doctrine.md §10](./iam-check-doctrine.md#10-phase-c-execution-playbook)).

### Repo normalization (`lib/`, `components/` layout)

**Authority:** [repo-migration-map.md](./repo-migration-map.md) · [repo-layout.md](./repo-layout.md)

Migration map is **closed** for the initial move; further cleanup is **out of band** — do not mix into Guardian, PA, or Hot Sales lanes.

### Guardian deferred experiments (not module blockers)

Per [pa-guardian-auth-reference-gaps.md](./slices/portal-atmosphere/pa-guardian-auth-reference-gaps.md):

- Dual owl cross-fade, texture/emblem atmosphere, Fade Owl / Comp Laptop prod wiring
- Google SSO (`manifest.ui.features.social` remains `false`)

---

## Tooling and operator hygiene

| Item | Status | Command / doc |
|------|--------|---------------|
| GitHub CLI auth (issues/PRs) | Fixed 2026-07-10 | `npm run gh -- …` — [AGENTS.md](../../AGENTS.md) § GitHub CLI |
| Vercel env pull guard | Active | Use `npm run audit:vercel` — never `vercel env pull` |
| Local dev auth | Documented | `npm run dev` · [local-dev-auth runbook](../runbooks/local-dev-auth.md) |

---

## Suggested sprint sequence (engineering)

```txt
Sprint A — Acceptance proof (no product features)
  1. ~~S17 P0 gaps (branch protection, monitors, verify:production)~~ — done 2026-07-10
  2. post-deploy-verification Phases 1–3 on current prod — IN PROGRESS (human inbox)
  3. ~~E2E journey green on main~~ — done 2026-07-10

Sprint B — Guardian module complete — DONE 2026-07-10

Sprint C — Portal Atmosphere closure (parallel with Sprint A phase 2)
  7. WP-1 visual baseline capture  ← next engineering lane
  8. WP-2 manual matrix
  9. WP-3 legacy `.portal-auth-*` purge when parity proven

Future — New ADR required
  · S12 tenancy
  · Hot Sales 2B–2D
  · Repo normalization PRs
```

---

## Validation commands (quick reference)

| Lane | Command |
|------|---------|
| Architecture bundle | `npm run checks` |
| Guardian interaction | `npm run test:interaction -- components/auth/guardian-auth-facade.interaction.test.tsx` |
| Guardian viewport contracts | `npm run test:unit -- lib/guardian-auth-facade.viewport.test.ts` |
| Portal atmosphere | `npm run test:portal-atmosphere` |
| E2E smoke | `npm run test:e2e:smoke` |
| E2E journey | `npm run test:e2e:journey` |
| Production probe | `npm run verify:production` |
| Operator prod login | `npm run check:production:operator` |
| Join OTP UI (prod) | `npm run check:production:join-ui` |
| GitHub ops | `npm run gh -- issue list` |

---

## Completion definitions

| Milestone | All of |
|-----------|--------|
| **Program acceptance-ready** | S17 P0 closed · Backlog-01 Phase 4 · CI journey green |
| **Guardian module complete** | Lane 2 checklist in [pa-guardian-module-remaining.md](./slices/portal-atmosphere/pa-guardian-module-remaining.md) |
| **PA system accepted** | WP-1 + WP-2 done · slice statuses → **accepted** in [portal-atmosphere/README.md](./slices/portal-atmosphere/README.md) |
| **Hot Sales 2B kickoff** | Approve 2B slices in [phase-2bcd-slices.md](../hot-sales/spec/phase-2bcd-slices.md) · ADRs 002–004 Accepted |

---

## Assumptions and gaps

| Assumption | Risk if wrong |
|------------|---------------|
| `main` @ `fc2a883` includes production-only Neon consolidation | Re-verify `git log -1` before sprint planning |
| Hero PNGs remain visual SSOT | Supersession requires design ADR addendum |
| `TRACKING.md` may lag this doc on gate counts | Prefer lane SSOT + this file for 2026-07-10 state |

**Unknowns (label only):** S17 branch protection is **verified configured** on `main` (2026-07-10) — strict required checks `quality` + `journey`, force-push/deletion disabled (`npm run gh -- api repos/pohlai88/iam-check/branches/main/protection`). No repo-admin work required.

---

## Related documents (do not duplicate)

| Doc | Role |
|-----|------|
| [TRACKING.md](../TRACKING.md) | Live status tables — update when lanes close |
| [pa-guardian-module-remaining.md](./slices/portal-atmosphere/pa-guardian-module-remaining.md) | Guardian-only checklist |
| [pa-closure-register.md](./slices/portal-atmosphere/pa-closure-register.md) | PA gap IDs + work packages |
| [s17-production-acceptance-closure.md](./slices/s17-production-acceptance-closure.md) | S17 evidence matrix |
| [hot-sales/RUNTIME.md](../hot-sales/RUNTIME.md) | Hot Sales agent entry (2A closed) |
| [hot-sales/README.md](../hot-sales/README.md) | Hot Sales doc index + types |
| [SPEC-B](./specs/SPEC-B-guardian-auth-canonical-refactor.md) | Guardian functional spec |
