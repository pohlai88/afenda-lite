# Hot Sales — RUNTIME (agent SSOT)

| Field | Value |
|-------|-------|
| **Doc type** | `RUNTIME` — read **first** before any `/trade` or Hot Sales code change |
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
| Phase 1 engine | `hot-sales-phase-1` → `1bc1294` | **Closed** |
| Phase 2A RBAC | `hot-sales-phase-2a` → `8e650ff` | **Closed** (immutable — do not retag) |
| Phase 2A ops Gates 1–7 | — | **Closed** 2026-07-10 |
| Phase 2B–2D | — | **Blocked** — new ADR + slice required |

**GitHub:** [#1](https://github.com/pohlai88/iam-check/issues/1) closed (ops rollout checklist).

---

## Production runtime

| Item | Value |
|------|-------|
| URL | `https://iam-check.vercel.app` |
| Neon branch | `br-tiny-hill-ao82jp6f` only (not `dev-spec-b`) |
| `HOT_SALES_RBAC_ENABLED` | `true` on Vercel production |
| Local dev default | `false` + `dev-spec-b` branch |
| Migrations | `013_hot_sales.sql` + `014_hot_sales_rbac.sql` |
| Last Gate 7 deploy | `dpl_BCqJqHsjQ8z2Tih1684Gp11ThreK` |
| Gate 7 hotfix | `930dde0` — own-scope `resourceOwnerUserId` in `lib/auth/trade-session.ts` |

### Rollback (RBAC only)

```bash
# env.config: HOT_SALES_RBAC_ENABLED=false
npm run env:compose && npm run sync:vercel && vercel deploy --prod --yes
```

Full gate history: [ops/gate-register.md](./ops/gate-register.md).

---

## Env flags

| Variable | Production | Local dev | SSOT |
|----------|------------|-----------|------|
| `HOT_SALES_RBAC_ENABLED` | `true` | `false` | `lib/env/manifest.ts` |
| `DATABASE_URL` | `br-tiny-hill-ao82jp6f` | `dev-spec-b` | `env.secret` → `npm run env:compose` |

Never edit `.env` by hand. Never `vercel env pull`.

---

## Code map

| Area | Path |
|------|------|
| Routes | `app/trade/[locale]/**` |
| Trade shell | `components/trade/trade-shell.tsx` |
| Domain / store | `lib/domain/trade/` (`store.ts`, `rbac.ts`, `access.ts`, `allocation.ts`, …) |
| Session + RBAC gate | `lib/auth/trade-session.ts` |
| Server actions | `app/actions/trade.ts` |
| Schema | `db/migrations/013_hot_sales.sql`, `014_hot_sales_rbac.sql` |
| E2E | `e2e/trade-hot-sales.spec.ts` (`@smoke`, `@journey`) |
| Gate smokes | `scripts/gate-7-cutover-smoke.mjs`, `scripts/gate-7-production-smoke.mjs` |

Architecture slice: [architecture/s19-trade-slice.md](./architecture/s19-trade-slice.md).

---

## Validation commands

```bash
# Unit (domain + RBAC)
npm run test:unit -- lib/domain/trade lib/auth/trade-session

# E2E
npm run test:e2e:smoke          # auth redirect / trade ingress
npm run test:e2e:journey        # full operator flow (needs creds)

# Production gate smoke (operator)
node scripts/gate-7-production-smoke.mjs

# Env / deploy hygiene
npm run audit:vercel
npm run env:compose
```

---

## Test identities (do not conflate)

| Account | Role | Hot Sales use |
|---------|------|---------------|
| `SHARED_ADMIN_EMAIL` | Operator admin | Admin trade matrix — **not** sales allowlist |
| `PREVIEW_CLIENT_EMAIL` | Declaration preview client | **Not** auto in `hot_sales_sales_member` |
| Sales allowlist | `hot_sales_sales_member` row | Required for `/trade` sales path |

**Expected:** signed-in non-allowlisted user → `/trade` → `/auth/sign-in?reason=trade-access-denied` → session exists → `/client`. Not an RBAC regression.

---

## Agent rules

### Allowed without reopening scope

- Production-blocking fixes on frozen boundary (merge to `main`, redeploy)
- Reading / debugging existing trade routes
- Test-lane commits (separate from unrelated refactors)

### Forbidden without explicit user approval

- Phase **2B, 2C, 2D** (finance, pickup, Excel, notifications, ERP)
- New permissions, roles, RBAC UI, schema migrations, trade features
- Disabling production RBAC except documented rollback
- Repo normalization (`lib/`, `components/`, declaration refactors) mixed into Hot Sales commits
- Guardian Auth / portal atmosphere work framed as Hot Sales

### Before coding

1. Read this file.
2. If the task is **2B+** or new product — **stop and ask**.
3. Use depth docs only when behavior detail is needed:

| Need | Doc type | Path |
|------|----------|------|
| Gate evidence / SQL checks | `OPS` | [ops/gate-register.md](./ops/gate-register.md) |
| Rollout checklist | `OPS` | [ops/rollout.md](./ops/rollout.md) |
| Phase 1 behavior | `SPEC` | [spec/phase-1-prd.md](./spec/phase-1-prd.md) |
| Phase 2A behavior | `SPEC` | [spec/phase-2a-prd.md](./spec/phase-2a-prd.md) |
| RBAC decision | `ADR` | [adr/001-rbac.md](./adr/001-rbac.md) |
| Future planning | `ARCHIVE` | [archive/phase-2-feedback.md](./archive/phase-2-feedback.md) |

---

## Assumptions

1. Program cross-status: [docs/TRACKING.md](../TRACKING.md) § Hot Sales.
2. Hot Sales is **not** the default agent mission after 2026-07-10 — see [remaining-development.md](../architecture/remaining-development.md).
