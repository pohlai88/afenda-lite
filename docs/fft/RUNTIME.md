# Feed Farm Trade — RUNTIME (agent SSOT)

| Field | Value |
|-------|-------|
| **Doc type** | `RUNTIME` — read **first** before any `/fft` or Feed Farm Trade code change |
| **Status** | Phase 2A **closed** (implementation + ops) · 2026-07-10 |
| **Audience** | IDE agents, engineers, operators |
| **Depth docs** | [README.md](./README.md) — typed index |

---

## What this enables

Answer in one pass: **Is this change allowed?** **What is production state?** **Where is the code?** **How do I verify?**

---

## Phase state

| Phase | Tag / commit | Status |
|-------|--------------|--------|
| Phase 1 engine | `fft-phase-1` → `1bc1294` | **Closed** |
| Phase 2A RBAC | `fft-phase-2a` → `8e650ff` | **Closed** (immutable — do not retag) |
| Phase 2A ops Gates 1–7 | — | **Closed** 2026-07-10 |
| Phase 2B–2D ADRs | 002 · 003 · 004 | **Accepted** 2026-07-10 |
| Phase 2B implementation | [spec/phase-2bcd-slices.md](./spec/phase-2bcd-slices.md) | **Approved** — tag `fft-phase-2b` → `0c8b76b` (dev sign-off) |
| Phase 2C implementation | [spec/phase-2bcd-slices.md](./spec/phase-2bcd-slices.md) | **Implemented** — tag `fft-phase-2c` → `0c8b76b` (dev sign-off) |
| Phase 2D implementation | [spec/phase-2bcd-slices.md](./spec/phase-2bcd-slices.md) | **2D-1 + 2D-2 landed** — tag `fft-phase-2d` → `0c8b76b` (dev sign-off) |

**GitHub:** [#1](https://github.com/pohlai88/iam-check/issues/1) closed (ops rollout checklist).

---

## Production runtime

| Item | Value |
|------|-------|
| URL | `https://iam-check.vercel.app` |
| Neon branch | `br-tiny-hill-ao82jp6f` only |
| `FFT_RBAC_ENABLED` | `true` on Vercel production |
| Local dev | Same production branch — `npm run dev` |
| Migrations | `013`–`023` Feed Farm Trade lane (`023` deferred notification triggers) |
| `FFT_ERP_SYNC_ENABLED` | `false` | Phase 2D — async ERP push |
| Last Gate 7 deploy | `dpl_BCqJqHsjQ8z2Tih1684Gp11ThreK` |
| Gate 7 hotfix | `930dde0` — own-scope `resourceOwnerUserId` in `lib/auth/trade-session.ts` |

### Rollback (RBAC only)

```bash
# env.config: FFT_RBAC_ENABLED=false
npm run env:compose && npm run sync:vercel && vercel deploy --prod --yes
```

Full gate history: [ops/gate-register.md](./ops/gate-register.md).

---

## Env flags

| Variable | Production | Local dev | SSOT |
|----------|------------|-----------|------|
| `FFT_RBAC_ENABLED` | `true` | `false` | `lib/env/manifest.ts` |
| `FFT_DEPOSIT_ENABLED` | `false` | `false` | Phase 2B — operational deposits |
| `FFT_PICKUP_OPS_ENABLED` | `false` | `false` | Phase 2B — pickup ops workflow |
| `FFT_NOTIFICATIONS_ENABLED` | `true` | `true` | Phase 2C — outbound trade mail |
| `FFT_EMAIL_FROM` | `no-reply@nexuscanon.com` | same | Phase 2C — Resend sender (closed 2026-07-11; bare address) |
| `RESEND_API_KEY` | set (Vercel via `setVercelEnvKey`; not `sync:vercel`) | set | Phase 2C — closed 2026-07-11; XERP Resend key |
| `FFT_ERP_SYNC_ENABLED` | `false` | `false` | Phase 2D — async ERP push |
| `FFT_ERP_VENDOR` | unset | unset | `http-rest` for reference pack |
| `FFT_ERP_BASE_URL` | unset | unset | Customer ERP API base |
| `DATABASE_URL` | `br-tiny-hill-ao82jp6f` | `br-tiny-hill-ao82jp6f` | `env.secret` → `npm run env:compose` |

Never edit `.env` by hand. Never `vercel env pull`.

---

## Code map

Canonical FE / module paths (Feed Farm Trade AdminCN restructure). Legacy `[locale]` / `FftShell` / `lib/domain/fft` trees are **not** product entry points.

| Area | Path |
|------|------|
| Routes | `app/fft/**` (locale-free); legacy bookmarks → `app/fft/[locale]/[[...path]]` redirect shim only |
| UI | `features/fft/*` under `AdminCnShell` (`app/fft/layout.tsx`) — **no** `FftShell` |
| Domain / store | `modules/fft/domain/` |
| Session + RBAC gate | `modules/fft/auth/trade-session.ts` |
| Phase 2B feature gates | `modules/fft/auth/trade-phase2b.ts` |
| Phase 2D ERP gate | `modules/fft/auth/trade-phase2d.ts` |
| ERP sync store | `modules/fft/domain/erp-sync-store.ts` |
| Server actions | `app/actions/fft.ts` |
| Schema | `db/migrations/013_hot_sales.sql`, `014_fft_rbac.sql` |
| E2E | `e2e/trade-fft.spec.ts` (`@smoke`, `@journey`) |
| Gate smokes | `scripts/gate-7-cutover-smoke.mjs`, `scripts/gate-7-production-smoke.mjs` |

Architecture slice: [architecture/s19-trade-slice.md](./architecture/s19-trade-slice.md). FE ADR trio: [001](../../doc/frontend/adr/001-feed-farm-trade.md) · [001A](../../doc/frontend/adr/001A-feed-farm-trade-architecture.md) · [001R](../../doc/frontend/adr/001R-feed-farm-trade-roadmap.md).

---

## Validation commands

```bash
# Unit (domain + RBAC)
npm run test:unit -- modules/fft

# E2E
npm run test:e2e:smoke          # auth redirect / trade ingress
npm run test:e2e:journey        # full operator flow (needs creds)

# Production gate smoke (operator)
node scripts/gate-7-production-smoke.mjs

# Env / deploy hygiene
npm run audit:vercel
npm run env:compose

# Feed Farm Trade 2B–2D ops
npm run audit:fft-promotion
npm run process:erp-sync
npm run process:trade-closing-soon
```

---

## Test identities (do not conflate)

| Account | Role | Feed Farm Trade use |
|---------|------|---------------|
| `SHARED_ADMIN_EMAIL` | Operator admin | Platform Org Admin → `fft.access` (module entry SoT); not sales allowlist |
| `PREVIEW_CLIENT_EMAIL` | Declaration preview client | **Not** auto in `fft_sales_member` |
| Sales allowlist | `fft_sales_member` row | **Bridge** for `/fft` sales path until `fft.access` backfill |

**Module entry (org-scoped):** platform `fft.access` → else allowlist → else FFT role assignment (when `FFT_RBAC_ENABLED`). Do not flip `FFT_RBAC_ENABLED` in control-plane work.

**Expected:** signed-in user without `fft.access` / allowlist / FFT assignment → `/fft` → `/auth/sign-in?reason=fft-access-denied` → session exists → `/client`. Not an RBAC regression.

---

## Agent rules

### Allowed without reopening scope

- Production-blocking fixes on frozen boundary (merge to `main`, redeploy)
- Reading / debugging existing trade routes
- Test-lane commits (separate from unrelated refactors)

### Forbidden without explicit user approval

- Phase **2D-3 vendor adapter** (until customer integration contract)
- Phase **2C notification sends** when `FFT_NOTIFICATIONS_ENABLED` is false (import dry-run/confirm allowed)
- Writes to 2B tables when `FFT_DEPOSIT_ENABLED` / `FFT_PICKUP_OPS_ENABLED` are false (use `trade-phase2b` guards)
- Disabling production RBAC except documented rollback
- Repo normalization (`lib/`, `components/`, declaration refactors) mixed into Feed Farm Trade commits
- Guardian Auth / portal atmosphere work framed as Feed Farm Trade

### Before coding

1. Read this file.
2. If the task is **2C+ implementation** — confirm slice group is **Approved** in phase-2bcd-slices; else **stop and ask**.
3. Use depth docs only when behavior detail is needed:

| Need | Doc type | Path |
|------|----------|------|
| Gate evidence / SQL checks | `OPS` | [ops/gate-register.md](./ops/gate-register.md) |
| Rollout checklist | `OPS` | [ops/rollout.md](./ops/rollout.md) |
| Phase 1 behavior | `SPEC` | [spec/phase-1-prd.md](./spec/phase-1-prd.md) |
| Phase 2A behavior | `SPEC` | [spec/phase-2a-prd.md](./spec/phase-2a-prd.md) |
| 2B–2D slice plan | `SPEC` | [spec/phase-2bcd-slices.md](./spec/phase-2bcd-slices.md) |
| RBAC decision | `ADR` | [adr/001-rbac.md](./adr/001-rbac.md) |
| 2B finance + pickup | `ADR` | [adr/002-finance-deposit-pickup-ops.md](./adr/002-finance-deposit-pickup-ops.md) |
| 2C import + mail | `ADR` | [adr/003-imports-notifications.md](./adr/003-imports-notifications.md) |
| 2D ERP sync | `ADR` | [adr/004-erp-sync.md](./adr/004-erp-sync.md) |
| Planning detail | `ARCHIVE` | [archive/phase-2-feedback.md](./archive/phase-2-feedback.md) |

---

## Assumptions

1. Program cross-status: [docs/TRACKING.md](../TRACKING.md) § Feed Farm Trade.
2. Feed Farm Trade is **not** the default agent mission after 2026-07-10 — see [remaining-development.md](../architecture/remaining-development.md).
