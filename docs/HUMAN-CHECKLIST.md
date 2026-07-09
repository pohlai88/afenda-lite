# Human checklist — what's done vs remaining

**Updated:** 2026-07-10  
**For:** You (human reader) — not agents.  
**Agent docs:** [TRACKING.md](./TRACKING.md) · [architecture/remaining-development.md](./architecture/remaining-development.md)

Tick boxes as you complete items. Edit this file when status changes.

---

## ✅ Done (no action needed)

### Hot Sales / Trade

- [x] Phase 1 trade engine shipped (`hot-sales-phase-1`)
- [x] Phase 2A RBAC code shipped (`hot-sales-phase-2a`)
- [x] Ops Gates 1–7 complete (production RBAC on, DB cutover done)
- [x] GitHub issue [#1](https://github.com/pohlai88/iam-check/issues/1) closed
- [x] Hot Sales docs consolidated under `docs/hot-sales/` ([RUNTIME.md](./hot-sales/RUNTIME.md) = agent entry)

### Guardian Auth

- [x] Guardian shell live on `/auth/*` and `/join` (functional)
- [x] Guardian PR merged to `main`
- [x] Interaction tests passing (4/4)

### Platform / code health

- [x] Architecture checks green (`npm run checks`)
- [x] Unit + interaction test suites green (last known: 391 + 58)
- [x] Production build passes
- [x] Neon Auth config synced (Backlog BL-01, BL-04, BL-08, BL-09 closed)

---

## ☐ Remaining — do these next (priority order)

### 1. Production sign-off (S17) — blocks “fully production-ready”

- [ ] **Branch protection** on `main` (required CI checks) — repo admin
- [ ] **Vercel liveness monitor** on `/api/health/liveness` — ops
- [ ] Run **[post-deploy-verification.md](./backlogs/post-deploy-verification.md)** Phases 1–3 on live prod
  - [ ] Phase 1: operator invite email + preview client (BL-02, BL-03)
  - [ ] Phase 2: client join journey (BL-06)
  - [ ] Phase 3: email branding console + account self-service (BL-05, BL-07)
- [ ] Confirm **CI journey** green on `main` (GitHub Actions)
- [ ] Spot-check: operator login → dashboard; client scoped correctly

**When all checked:** Backlog-01 can close · S17 acceptance complete.

---

### 2. Guardian Auth — visual closeout (not blocking prod traffic)

- [ ] **Design sign-off** @ 1024px vs `public/brand/heroes/auth-hero-dark.png` / `auth-hero-light.png` (Storybook)
- [ ] **Viewport containment** — no scroll @ 100svh (Storybook story)
- [ ] Fix **4 failing** viewport unit tests (`lib/guardian-auth-facade.viewport.test.ts`)
- [ ] Resolve **Lane C** git stashes (`git stash list` → drop or cleanup branch)

**When all checked:** Guardian module = **complete** (not just functional).

---

### 3. Portal Atmosphere — design acceptance (parallel, lower urgency)

- [ ] Capture visual baselines in `docs/ui-evaluation/portal-atmosphere/` (Storybook)
- [ ] Manual viewport matrix 320–1920 (overflow, contrast)
- [ ] Legacy `.portal-auth-*` CSS purge (after visual parity)

Detail: [pa-closure-register.md](./architecture/slices/portal-atmosphere/pa-closure-register.md)

---

## 🚫 Blocked / later (do not start without new decision)

| Item | Why blocked |
|------|-------------|
| Hot Sales **2B–2D** (finance, pickup, Excel, ERP) | Needs new ADR + slice approval |
| **S12 tenancy** / multi-operator SaaS | Blocked until S17 closes |
| Repo `lib/` / `components/` normalization | Separate lane — not mixed with above |
| Dual owl / Fade Owl prod experiments | Explicitly deferred per Guardian gap register |

---

## Quick “where am I?” summary

| Area | Status in one line |
|------|-------------------|
| **Hot Sales** | **Done** — live with RBAC; no more ops work unless you reopen scope |
| **Guardian Auth** | **Live but not finished** — works in prod; design + 4 tests remain |
| **Declaration portal core** | **Shipped** — acceptance proof (S17 + post-deploy) still open |
| **Portal Atmosphere** | **Code mostly done** — visual sign-off and cleanup remain |
| **Next product work** | **Nothing authorized** until S17 closes and you approve 2B or S12 |

---

## Handy commands (when you verify)

```bash
npm run test:e2e:smoke          # quick prod-path smoke
npm run test:e2e:journey        # full journeys (needs creds)
npm run verify:production       # production probe
npm run storybook               # Guardian / PA visual review
npm run gh -- issue list        # GitHub (uses keyring auth)
```

---

## If you only have 30 minutes

1. Open [post-deploy-verification.md](./backlogs/post-deploy-verification.md) → run **Phase 1** manually on prod.
2. Open Storybook → Guardian auth stories → compare to hero PNGs @ 1024px.
3. Check GitHub → Settings → Branches → is `main` protected?
