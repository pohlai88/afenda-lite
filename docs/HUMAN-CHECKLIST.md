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

### Guardian Auth

- [x] Guardian shell live on `/auth/*` and `/join` (functional)
- [x] Guardian PR merged to `main`
- [x] Interaction tests passing (4/4)

### Platform / automated gates

- [x] Production liveness + readiness (`/api/health/*`)
- [x] `npm run verify:production` exit 0 (2026-07-10)
- [x] Join OTP step visible on prod (`check-production-join-ui.mjs`)
- [x] **Branch protection** on `main` (requires `quality` + `journey`)
- [x] **GitHub CI secrets** synced (was missing 6 keys — fixed 2026-07-10)
- [x] Architecture checks green locally (except `check:ui-sync` sandbox token on dev DB — CI-only concern if DB seeded)

---

## ☐ Remaining — do these next (priority order)

### 1. Production sign-off (S17) — blocks “fully production-ready”

- [x] Branch protection on `main` — **done** 2026-07-10 (`npm run protect:main`)
- [ ] **Vercel liveness monitor** on `/api/health/liveness` — [setup steps](./runbooks/s17-production-signoff.md#vercel-liveness-monitor-manual-setup)
- [ ] Run **[post-deploy-verification.md](./backlogs/post-deploy-verification.md)** Phases 1–3 on live prod (manual)
  - [ ] Phase 1: operator invite email + preview client (BL-02, BL-03)
  - [ ] Phase 2: client join with **real OTP** + full journey (BL-06)
  - [ ] Phase 3: Neon Console app name (BL-05) + account flows (BL-07)
### CI / release authority

- [x] GitHub Actions secrets present (`npm run audit:github-actions-secrets`)
- [x] **CI Neon branch** (`ci`) + E2E secrets (`npm run sync:github-actions-secrets:ci`)
- [x] Branch protection requires `quality` + `journey`
- [x] CI **`quality` job** green on `main` (2026-07-10, after `seed:ci-baseline`)
- [ ] CI **`journey` job** green on `main` (hotfix: acknowledgement refresh + ci baseline)
- [ ] Spot-check operator login → dashboard on prod (manual)

**When all checked:** Backlog-01 closes · S17 acceptance complete.

---

### 2. Guardian Auth — visual closeout (not blocking prod traffic)

- [ ] Design sign-off @ 1024px vs hero PNGs (Storybook)
- [ ] Viewport containment — no scroll @ 100svh
- [ ] Fix **4 failing** viewport unit tests
- [ ] Resolve Lane C git stashes

---

### 3. Portal Atmosphere — design acceptance (parallel)

- [ ] Visual baseline captures (Storybook → `docs/ui-evaluation/portal-atmosphere/`)
- [ ] Manual viewport matrix + contrast
- [ ] Legacy CSS purge after parity

---

## 🚫 Blocked / later

| Item | Why |
|------|-----|
| Hot Sales 2B–2D | New ADR required |
| S12 tenancy | After S17 |
| Repo normalization | Separate lane |

---

## Quick “where am I?”

| Area | One line |
|------|----------|
| **Hot Sales** | **Done** — live with RBAC |
| **Guardian** | **Live** — design + 4 tests remain |
| **S17 / Backlog-01** | **In progress** — CI quality green; journey + manual prod sign-off remain |
| **New product** | **Nothing authorized** until S17 closes |

---

## Handy commands

```bash
npm run verify:production
npm run audit:github-actions-secrets
node scripts/check-production-join-ui.mjs
npm run test:e2e:journey          # after CI secrets + local creds
npm run gh -- run list -b main -L 3
```

---

## If you only have 30 minutes

1. **Vercel Dashboard** → add liveness monitor (link above).
2. **post-deploy Phase 1** — invite a test client on prod, confirm email.
3. **GitHub Actions** — confirm latest `main` CI run is green after push.
