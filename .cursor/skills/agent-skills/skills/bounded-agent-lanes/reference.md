# Bounded Agent Lanes — Repo reference

Updatable defaults for this repository. The skill core in [SKILL.md](SKILL.md) stays lane-generic; edit this file when the active lane or rollout context changes.

---

## Current active lane

**Feed Farm Trade Ops — closed** (2026-07-10)

Default agent mission is **not** Feed Farm Trade. See [deprecation register — Closed product phases](../deprecation-and-migration/reference.md) · [doc/architecture/DOC-004-skills-architecture.md](../../../../doc/architecture/DOC-004-skills-architecture.md).

---

## Feed Farm Trade — agent entry (when trade work is explicitly requested)

| Doc type | Path |
|----------|------|
| **RUNTIME** (read first) | [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Index + doc types | [docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |
| OPS gates (historical) | [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| OPS rollout | [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| OPS release readiness | [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| SPEC 2A (frozen) | [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| ARCHITECTURE S19 | [docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |

### Frozen decisions (do not rename / redesign)

| Area | Decision |
|------|----------|
| Feature flag | `FFT_RBAC_ENABLED` |
| Production | `true` on Vercel (Gate 7) |
| Local dev default | `false` |
| Rollback | Set flag false → `npm run env:compose` → `npm run sync:vercel` → redeploy |
| Migration | `013_hot_sales.sql` + `014_fft_rbac.sql` |
| Admin RBAC UI | `/fft/[locale]/admin/rbac` |
| Event create UI | `/fft/[locale]/admin/events/new` |

### Forbidden without explicit approval

- Phase 2B–2D, new permissions/UI/schema
- Repo normalization mixed into Feed Farm Trade commits

---

## Typical Feed Farm Trade checks

| Check | Command |
|-------|---------|
| Trade unit tests | `npm run test:unit -- modules/fft` |
| Trade smoke e2e | `npm run test:e2e:smoke` |
| Gate 7 prod smoke | `node scripts/gate-7-production-smoke.mjs` |
| Env compose | `npm run env:compose` |

Pre-enable matrix: [release-readiness.md § Pre-enable verification matrix](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md#pre-enable-verification-matrix).

Evidence template: [rollout.md § Evidence report template](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md#evidence-report-template).

---

## Docs lane (fft doc updates)

| Field | Value |
|-------|-------|
| **Lane** | Docs |
| **Target files** | `docs/modules/feed-farm-trade/**`, this `reference.md` (cross-links only) |
| **Forbidden** | Code, schema, permissions, UI |

---

## Other program lanes

| Lane | Entry |
|------|-------|
| Remaining development | [remaining-development.md](../../../../docs/architecture/remaining-development.md) |
| Guardian Auth closeout | [pa-guardian-module-remaining.md](../../../../docs/architecture/slices/portal-atmosphere/pa-guardian-module-remaining.md) |
| Program tracking | [gate-register.md](../../../../docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · [deprecation register — Closed product phases](../deprecation-and-migration/reference.md) |
