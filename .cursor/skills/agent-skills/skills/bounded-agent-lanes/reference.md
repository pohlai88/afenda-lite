# Bounded Agent Lanes — Repo reference

Updatable defaults for this repository. The skill core in [SKILL.md](SKILL.md) stays lane-generic; edit this file when the active lane or rollout context changes.

---

## Current active lane

**Hot Sales Ops — closed** (2026-07-10)

Default agent mission is **not** Hot Sales. See [docs/architecture/remaining-development.md](../../../../docs/architecture/remaining-development.md).

---

## Hot Sales — agent entry (when trade work is explicitly requested)

| Doc type | Path |
|----------|------|
| **RUNTIME** (read first) | [docs/hot-sales/RUNTIME.md](../../../../docs/hot-sales/RUNTIME.md) |
| Index + doc types | [docs/hot-sales/README.md](../../../../docs/hot-sales/README.md) |
| OPS gates (historical) | [docs/hot-sales/ops/gate-register.md](../../../../docs/hot-sales/ops/gate-register.md) |
| OPS rollout | [docs/hot-sales/ops/rollout.md](../../../../docs/hot-sales/ops/rollout.md) |
| OPS release readiness | [docs/hot-sales/ops/release-readiness.md](../../../../docs/hot-sales/ops/release-readiness.md) |
| SPEC 2A (frozen) | [docs/hot-sales/spec/phase-2a-slices.md](../../../../docs/hot-sales/spec/phase-2a-slices.md) |
| ARCHITECTURE S19 | [docs/hot-sales/architecture/s19-trade-slice.md](../../../../docs/hot-sales/architecture/s19-trade-slice.md) |

### Frozen decisions (do not rename / redesign)

| Area | Decision |
|------|----------|
| Feature flag | `HOT_SALES_RBAC_ENABLED` |
| Production | `true` on Vercel (Gate 7) |
| Local dev default | `false` |
| Rollback | Set flag false → `npm run env:compose` → `npm run sync:vercel` → redeploy |
| Migration | `013_hot_sales.sql` + `014_hot_sales_rbac.sql` |
| Admin RBAC UI | `/trade/[locale]/admin/rbac` |
| Event create UI | `/trade/[locale]/admin/events/new` |

### Forbidden without explicit approval

- Phase 2B–2D, new permissions/UI/schema
- Repo normalization mixed into Hot Sales commits

---

## Typical Hot Sales checks

| Check | Command |
|-------|---------|
| Trade unit tests | `npm run test:unit -- lib/domain/trade lib/auth/trade-session` |
| Trade smoke e2e | `npm run test:e2e:smoke` |
| Gate 7 prod smoke | `node scripts/gate-7-production-smoke.mjs` |
| Env compose | `npm run env:compose` |

Pre-enable matrix: [release-readiness.md § Pre-enable verification matrix](../../../../docs/hot-sales/ops/release-readiness.md#pre-enable-verification-matrix).

Evidence template: [rollout.md § Evidence report template](../../../../docs/hot-sales/ops/rollout.md#evidence-report-template).

---

## Docs lane (hot-sales doc updates)

| Field | Value |
|-------|-------|
| **Lane** | Docs |
| **Target files** | `docs/hot-sales/**`, this `reference.md` (cross-links only) |
| **Forbidden** | Code, schema, permissions, UI |

---

## Other program lanes

| Lane | Entry |
|------|-------|
| Remaining development | [remaining-development.md](../../../../docs/architecture/remaining-development.md) |
| Guardian Auth closeout | [pa-guardian-module-remaining.md](../../../../docs/architecture/slices/portal-atmosphere/pa-guardian-module-remaining.md) |
| Program tracking | [TRACKING.md](../../../../docs/TRACKING.md) |
