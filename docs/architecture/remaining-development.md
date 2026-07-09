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

**Decision rule:** Finish **acceptance proof** (S17, Guardian closeout, PA visual gates) before **new product** (S12 tenancy, Hot Sales 2B–2D, repo normalization).

---

## Closed lanes (do not reopen without explicit approval)

| Lane | Closed | Evidence |
|------|--------|----------|
| Hot Sales Phase 2A ops | 2026-07-10 | Gates 1–7 ✅ · [hot-sales/ops/gate-register.md](../hot-sales/ops/gate-register.md) · GitHub [#1](https://github.com/pohlai88/iam-check/issues/1) closed |
| Hot Sales Phase 2A implementation | Tag `hot-sales-phase-2a` → `8e650ff` | [hot-sales/README.md](../hot-sales/README.md) |
| Guardian Auth functional ship | 2026-07-10 | Merge to `main` · `GUARDIAN_AUTH_SHELL=true` on prod · [ADR-Auth-UI-001](./adr/ADR-Auth-UI-001-guardian-shell-neon-form.md) |
| Architecture automated gates | Ongoing green | `npm run checks` · reliance drift · portal-atmosphere unit/interaction |

**Production Hot Sales state:** `HOT_SALES_RBAC_ENABLED=true` · DB `br-tiny-hill-ao82jp6f` · deploy verified Gate 7 smoke 17/17.

---

## Active lanes — execute in this order

### Lane 1 — S17 production acceptance (blocks S12)

**Authority:** [s17-production-acceptance-closure.md](./slices/s17-production-acceptance-closure.md)

Close operational and cross-surface **acceptance proof** before tenancy or SaaS expansion. No new routes or schema in this lane.

| Priority | Gap | Owner | Next step |
|----------|-----|-------|-----------|
| P0 | Branch protection on `main` | Repo admin | GitHub Settings → required checks; or `npm run gh -- api repos/pohlai88/iam-check/branches/main/protection` |
| P0 | `verify:production` evidence on current deploy | Ops | `npm run verify:production` after each prod promotion |
| P0 | Readiness + liveness monitors | Ops | Vercel monitor → `/api/health/liveness`; curl `/api/health/readiness` |
| P0 | Operator detail ↔ client submission parity | Engineering | `@journey` or manual cross-surface verify (S4, S7, S8) |
| P1 | Auth ingress matrix (operator, client, deny) | Engineering | `npm run test:e2e:smoke` + spot manual |
| P2 | CI journey green on `main` | Engineering | GitHub Actions `journey` job |

**Release authority:** `npm run test:e2e:journey` on `main` push.

**Completion:** S17 acceptance proof checked · statuses copied to source slice specs · [TRACKING.md](../TRACKING.md) P0 table cleared.

---

### Lane 2 — Guardian Auth module closeout (visual + tests)

**Authority:** [pa-guardian-module-remaining.md](./slices/portal-atmosphere/pa-guardian-module-remaining.md) · [pa-guardian-auth-reference-gaps.md](./slices/portal-atmosphere/pa-guardian-auth-reference-gaps.md)

Functional shell is shipped; **module complete** requires design sign-off and green CSS contract tests.

| # | Task | Owner | Pass criterion |
|---|------|-------|----------------|
| 2a | Design sign-off @ 1024px | Design | `ReferenceComparisonNight` / `ReferenceComparisonDay` match `public/brand/heroes/auth-hero-*.png` |
| 2b | Viewport containment | Design + eng | `guardian-auth-viewport-containment.stories.tsx` — 100svh, no scroll |
| 2c | Viewport unit tests | Engineering | **4 failing** / 14 total in `lib/guardian-auth-facade.viewport.test.ts` (2026-07-10) — align CSS or test contracts |
| 2d | Lane C stash hygiene | Engineering | `git stash list` → drop or branch `ui/guardian-lane-c-cleanup` |

```bash
npm run test:interaction -- components/auth/guardian-auth-facade.interaction.test.tsx   # 4/4 pass
npm run test:unit -- lib/guardian-auth-facade.viewport.test.ts                        # fix 4 failures
npm run storybook
# stories/ui-evaluation/guardian-auth-facade.stories.tsx
```

**Completion label:** **Guardian Auth module complete** when sign-off recorded + viewport tests green + Lane C resolved. Until then: **Functional ship ✅ · Visual closeout ⏳**

---

### Lane 3 — Portal Atmosphere acceptance (parallel to Lane 2)

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
| Phase 1 | BL-02 operator invite · BL-03 preview | Pending prod verify |
| Phase 2 | BL-06 client join | Pending prod verify |
| Phase 3 | BL-05 email branding · BL-07 account | Manual / console |

**Completion:** Backlog-01 closed when Phase 4 passes and [TRACKING.md](../TRACKING.md) BL table shows all prod verify **Closed**.

---

## Deferred lanes — blocked until active lanes close

### Hot Sales Phase 2B–2D

**Authority:** [PHASE-2-FEEDBACK.md](../hot-sales/archive/phase-2-feedback.md) (planning only) · [phase-2a-prd.md](../hot-sales/spec/phase-2a-prd.md)

Finance, pickup, Excel, notifications, ERP — **no implementation** without new ADR and slice approval. Phase 2A RBAC is live; expanding permissions/UI/schema is a **new program**, not ops rollout.

### S12 — Tenancy / multi-operator SaaS

**Authority:** [s12-tenancy.md](./slices/s12-tenancy.md)

**Blocked on S17** acceptance closure and explicit multi-operator SaaS decision ([iam-check-doctrine.md §10](./iam-check-doctrine.md#10-phase-c-execution-playbook)).

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
| Local dev auth | Documented | `npm run dev:spec-b` · [local-dev-auth runbook](../runbooks/local-dev-auth.md) |

---

## Suggested sprint sequence (engineering)

```txt
Sprint A — Acceptance proof (no product features)
  1. S17 P0 gaps (branch protection, monitors, verify:production)
  2. post-deploy-verification Phases 1–2 on current prod
  3. E2E journey green on main

Sprint B — Guardian module complete
  4. Fix 4 viewport unit tests (single Guardian branch)
  5. Design sign-off @ 1024px → record in gap register
  6. Resolve Lane C stashes

Sprint C — Portal Atmosphere closure (can overlap B after WP-0)
  7. WP-1 visual baseline capture
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
| GitHub ops | `npm run gh -- issue list` |

---

## Completion definitions

| Milestone | All of |
|-----------|--------|
| **Program acceptance-ready** | S17 P0 closed · Backlog-01 Phase 4 · CI journey green |
| **Guardian module complete** | Lane 2 checklist in [pa-guardian-module-remaining.md](./slices/portal-atmosphere/pa-guardian-module-remaining.md) |
| **PA system accepted** | WP-1 + WP-2 done · slice statuses → **accepted** in [portal-atmosphere/README.md](./slices/portal-atmosphere/README.md) |
| **Hot Sales 2B kickoff** | New ADR + slice approval · explicit user/program reopen |

---

## Assumptions and gaps

| Assumption | Risk if wrong |
|------------|---------------|
| `main` @ `18a037a` includes Guardian merge + Gate 7 docs | Re-verify `git log -1` before sprint planning |
| Hero PNGs remain visual SSOT | Supersession requires design ADR addendum |
| `TRACKING.md` may lag this doc on gate counts | Prefer lane SSOT + this file for 2026-07-10 state |

**Unknowns (label only):** S17 branch protection may already be configured — verify live GitHub settings before scheduling repo-admin work.

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
