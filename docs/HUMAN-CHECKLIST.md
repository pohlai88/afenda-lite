# Human checklist — what's done vs remaining

**Updated:** 2026-07-10  
**For:** You (human reader) — not agents.  
**Evidence log:** [runbooks/s17-production-signoff.md](./runbooks/s17-production-signoff.md)  
**Agent docs:** [TRACKING.md](./TRACKING.md) · [architecture/remaining-development.md](./architecture/remaining-development.md)

Tick boxes as you complete items.

---

## ✅ Done (no action needed)

### Hot Sales / Trade

- [x] Phase 1 trade engine shipped (`hot-sales-phase-1`)
- [x] Phase 2A RBAC code shipped (`hot-sales-phase-2a`)
- [x] Ops Gates 1–7 complete (production RBAC on, DB cutover done)
- [x] GitHub issue [#1](https://github.com/pohlai88/iam-check/issues/1) closed
- [x] Hot Sales docs under `docs/hot-sales/` ([RUNTIME.md](./hot-sales/RUNTIME.md))
- [x] **Hot Sales sidebar entry** — operator + client sidebars → `/trade/vi/events` (2026-07-10)
- [x] **Trade reliance registry** — 9 surfaces, 33 actions, snapshots green (2026-07-10)

### Guardian Auth

- [x] Guardian shell live on `/auth/*` and `/join` (functional)
- [x] Guardian PR merged to `main`
- [x] Interaction tests passing (4/4)
- [x] Design sign-off @ 1024px vs hero PNGs (Storybook) — **approved 2026-07-10**
  - `ReferenceComparisonNight` / `ReferenceComparisonDay` @ Laptop 1024
- [x] Viewport containment — no scroll @ 100svh (`100svh` + `100dvh` stack)
- [x] Viewport unit tests — **14/14 pass**
- [x] Lane C git stashes dropped (superseded by `main` merge)

### Platform / S17 (Backlog-01) — closed 2026-07-10

- [x] Production liveness + readiness (`/api/health/*`)
- [x] `npm run verify:production` exit 0
- [x] Join OTP step visible on prod (`check-production-join-ui.mjs`)
- [x] Branch protection on `main` (requires `quality` + `journey`)
- [x] GitHub CI secrets synced · CI Neon branch (`ci`)
- [x] CI **quality** + **journey** green on `main` ([run #29062884834](https://github.com/pohlai88/iam-check/actions/runs/29062884834))
- [x] Checkly liveness monitor on `/api/health/liveness`
- [x] Post-deploy Phases 0–3 — [sign-off](./backlogs/post-deploy-verification.md#sign-off)
- [x] Neon Auth app name **iam-check** (production branch)

---

## ☐ Remaining — do these next (priority order)

### Portal Atmosphere — design acceptance (parallel)

- [ ] Visual baseline captures (Storybook → `docs/ui-evaluation/portal-atmosphere/`)
- [ ] Manual viewport matrix + contrast
- [ ] Legacy CSS purge after parity

---

## 🚫 Blocked / later

| Item | Why |
|------|-----|
| Hot Sales 2B–2D | New ADR required |
| S12 tenancy | Unblocked — needs explicit ADR / program approval |
| Repo normalization | Separate lane |

---

## Quick “where am I?”

| Area | One line |
|------|----------|
| **Hot Sales** | **Done** — live with RBAC |
| **Guardian** | **Module complete** — signed off @1024 (2026-07-10) |
| **S17 / Backlog-01** | **Closed** 2026-07-10 |
| **New product** | S12 / 2B–2D need explicit ADR — S17 gate cleared |

---

## Handy commands

```bash
npm run verify:production
npm run check:production:post-deploy  # BL-02, BL-03, BL-07 surfaces
npm run audit:github-actions-secrets
npm run check:production:join-ui
npm run test:e2e:journey          # after CI secrets + local creds
npm run gh -- run list -b main -L 3
```

---

## If you only have 30 minutes

1. **Portal Atmosphere WP-1** — Storybook baseline capture (next parallel lane).
