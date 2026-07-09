# Program tracking — Client Declaration Portal

**Updated:** 2026-07-10  
**Program:** Backlog-01 **not closed** · S17 **in progress** · S12 **planned** (blocked on S17) · Hot Sales Phase 2A **closed** · Guardian **functional ship / visual closeout**

**Remaining work SSOT:** [architecture/remaining-development.md](./architecture/remaining-development.md)  
**Human checklist:** [HUMAN-CHECKLIST.md](./HUMAN-CHECKLIST.md) ← start here if unsure what's left

---

## How to use this doc

| Need | Read | Edit when |
| --- | --- | --- |
| **Status / what's left** | This file | Any slice or BL status changes |
| **Prod sign-off steps** | [post-deploy-verification.md](./backlogs/post-deploy-verification.md) | Never duplicate checklists here |
| **BL problem context + code map** | [bl-slices.md](./backlogs/bl-slices.md) | Root cause or owned files change |
| **Implementation spec** | [architecture/slices/](./architecture/slices/README.md) | Behaviour or acceptance proof changes |
| **Repo folder rules** | [architecture/repo-layout.md](./architecture/repo-layout.md) | L1/L2 layout or migration status changes |
| **Test factory / pyramid** | [testing/README.md](../testing/README.md) | Factory layout or gate commands change |

**Rule:** One status table per dimension (gates, S-slices, BL, journeys). Checklists live in **post-deploy** only.

---

## Quality gates (local)

Re-run after meaningful changes. CI runs the same on PR + `main`.

| Gate | Command | Last known |
| --- | --- | --- |
| Architecture bundle | `npm run checks` | **Pass** (12 gates) |
| Unit (L0) | `npm run test:unit` | **391** pass |
| Interaction (L2) | `npm run test:interaction` | **58** pass |
| Production build | `npm run build` | Pass |
| E2E smoke | `npm run test:e2e:smoke` | CI authority |
| E2E journey | `npm run test:e2e:journey` | CI `main` job authority |
| Production probe | `npm run verify:production` | Pass (2026-07-08) |

Registry drift: `npm run check:reliance-mapping-drift` · `check:reliance-coverage` · `check:reliance-graph-drift`.

---

## Architecture slices (S0–S18)

Structural index: [iam-check-doctrine §3](./architecture/iam-check-doctrine.md#3-slice-index). Specs: [slices/](./architecture/slices/README.md).

| ID | Name | Code | Acceptance | Notes |
| --- | --- | --- | --- | --- |
| S0–S11 | Foundation → audit | Shipped | Closed | — |
| S12 | Tenancy | **Not built** | — | After S17 |
| S13–S16 | CI → preview | Shipped | S17 defers branch protection | — |
| S17 | Prod acceptance | N/A | **Open** | [s17 spec](./architecture/slices/s17-production-acceptance-closure.md) |
| S18 | Playground harness | Shipped | Closed | Local only |

---

## Backlog-01 (Neon Auth closure)

Master brief: [backlog-01-neon-auth-closure.md](./backlogs/backlog-01-neon-auth-closure.md) · Context: [bl-slices.md](./backlogs/bl-slices.md)

| ID | Title | Code | Prod verify | Status |
| --- | --- | --- | --- | --- |
| BL-01 | Config truth & audit | Done | MCP synced | **Closed** |
| BL-02 | Operator invite email | Done | Pending | [Phase 1](./backlogs/post-deploy-verification.md#phase-1--operator-flows-bl-02-bl-03) |
| BL-03 | Operator preview | Done | Pending | [Phase 1](./backlogs/post-deploy-verification.md#phase-1--operator-flows-bl-02-bl-03) |
| BL-04 | Production cutover | Done | Live | **Closed** |
| BL-05 | Email branding | Console | Manual | [Phase 3](./backlogs/post-deploy-verification.md#bl-05--email-branding-console-not-deploy) |
| BL-06 | Client join journey | Done | Pending | [Phase 2](./backlogs/post-deploy-verification.md#phase-2--client-invitation-join-bl-06) |
| BL-07 | Account self-service | Done | Manual | [Phase 3](./backlogs/post-deploy-verification.md#bl-07--account--credential-self-service-j3-j5-j7) |
| BL-08 | Surface registry | Done | — | **Closed** |
| BL-09 | Local dev auth | Done | Dev branch | **Closed** |

---

## Journeys (J1–J8)

| Journey | Actor | Code | Verified prod |
| --- | --- | --- | --- |
| J1 | Operator invite → email | Yes | Phase 1 |
| J2 | Client join → onboarding | Yes | Phase 2 |
| J3 | Password reset | Yes | Phase 3 |
| J4 | OTP at sign-up / join | Yes | Phase 2 |
| J5 | Magic link sign-in | Yes | Phase 3 |
| J6 | Operator preview client | Yes | Phase 1 |
| J7 | Account settings / security | Yes | Phase 3 |
| J8 | Config ↔ manifest ↔ UI | Yes | Audit pass |

---

## Hot Sales Phase 2A (ops rollout)

**Index:** [hot-sales/README.md](./hot-sales/README.md) · **Runtime:** [hot-sales/RUNTIME.md](./hot-sales/RUNTIME.md) · **Gates:** [hot-sales/ops/gate-register.md](./hot-sales/ops/gate-register.md)

| Item | Status |
| --- | --- |
| Phase 1 (`hot-sales-phase-1` → `1bc1294`) | **Closed** |
| Phase 2A implementation (`hot-sales-phase-2a` → `8e650ff`) | **Closed** |
| Post-tag hotfix (`4d203a7` TradeShell) | **Merged** to `main` |
| Gates 1–7 (allowlist, transfer, RBAC enable) | **Closed** 2026-07-10 |
| GitHub issue [#1](https://github.com/pohlai88/iam-check/issues/1) | **Closed** |
| Phase 2B–2D | **Blocked** — separate ADR/slice approval |

**Production:** `HOT_SALES_RBAC_ENABLED=true` · DB `br-tiny-hill-ao82jp6f`.

---

## Open gaps (P0)

| Gap | Owner | Evidence / next step |
| --- | --- | --- |
| Guardian viewport unit tests (4 failing) | Engineering | [remaining-development.md](./architecture/remaining-development.md) Lane 2 · `lib/guardian-auth-facade.viewport.test.ts` |
| Post-deploy Phases 1–3 | Release owner | [post-deploy-verification.md](./backlogs/post-deploy-verification.md) |
| S17 branch protection on `main` | Repo admin | GitHub Settings → Branches |
| S17 Vercel liveness monitor | Ops | Dashboard → `/api/health/liveness` |
| S1 operator login → dashboard (prod) | Engineering | `@journey` or manual after deploy |
| CI journey green on `main` | Engineering | GitHub Actions `journey` job |

---

## Code anchors (join + invite)

| Area | Location |
| --- | --- |
| Join route | `app/join/page.tsx` |
| Join entry / redirects | `lib/client-invitation-entry.ts` |
| Auth step machine | `lib/client-invitation-join-auth.ts`, `components/use-join-invitation-auth-view.ts` |
| Join UI | `components/portal-invitation-join-page.tsx`, `portal-invitation-join-panel.tsx`, `guardian-invitation-join-page.tsx` |
| Org invite 401 fix | `lib/auth/neon-auth-request.ts` |
| Operator invite email | `lib/email/send-client-onboarding-email.ts`, `lib/email/client-email-delivery.ts` |
| Preview session | `app/actions/admin.ts` |

---

## Next action

Deploy → run **[post-deploy-verification.md](./backlogs/post-deploy-verification.md)** → update statuses in **this file** → close Backlog-01 when Phase 4 passes.
