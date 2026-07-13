# architecture

Living and Target architecture SSOTs for Afenda-Lite. Decisions formerly under `docs/adr/` live here (absorbed into ARCH docs). Product-module spines stay under [`docs/modules/`](../modules/).

## How to read

1. **[turborepo/ARCH-022](turborepo/ARCH-022-system-overview.md)** — system overview (Modular Monolith + Hexagonal + Turborepo Target)
2. **[turborepo/ARCH-023](turborepo/ARCH-023-multi-tenancy.md)** — multi-tenancy Living SSOT + Decision lock
3. **[ARCH-011](ARCH-011-platform-tenancy-rbac.md)** — platform IAM / hard tenancy rules
4. Then backend, frontend, or tech-stack maps as needed

## Layout

| Path | Job |
|------|-----|
| [`turborepo/`](turborepo/) | Target system — ARCH-022…028 (workspace, tenancy, packages, data, auth, env, slices) |
| [`backend/`](backend/) | Hexagon / modules / conventions — ARCH-001, 004…010 |
| [`frontend/`](frontend/) | Routes, BFF, UI, AdminCN — ARCH-002, 012…016, 029 |
| [`tech-stack/`](tech-stack/) | AdminCN customization + FE preflight — ARCH-018, 019 |
| [`archive/`](archive/) | Superseded stubs — ARCH-003, 020, 021 |
| [ARCH-011](ARCH-011-platform-tenancy-rbac.md) | Platform tenancy + RBAC (Living; former ADR-002) |

Subfolder indexes: [turborepo/README](turborepo/README.md) · [backend/README](backend/README.md) · [frontend/README](frontend/README.md)

## Root catalog

| Doc | Role |
|-----|------|
| [ARCH-011-platform-tenancy-rbac.md](ARCH-011-platform-tenancy-rbac.md) | Three-tier IAM, hard `organization_id`, seed catalogs |
| `*.snapshot.json` | Generated / snapshot artifacts (reliance, route coverage) — not Living prose |

## Related

| Need | Doc |
|------|-----|
| Docs index | [../README.md](../README.md) |
| Modules (FFT spine) | [../modules/MOD-002-modules-index.md](../modules/MOD-002-modules-index.md) |
| Runbooks | [../runbooks/README.md](../runbooks/README.md) |
| Guides | [../guides/GUIDE-006-guides-index.md](../guides/GUIDE-006-guides-index.md) |

## Rules

1. Prefer Living/Target ARCH docs over archive stubs.
2. Do not recreate `docs/adr/` — absorb new material decisions into the owning ARCH.
3. Do not reopen ARCH-023 Rejected (R*) / Deferred (D*) without explicit user approval.
4. FFT product locks / roadmap: [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) — not under this folder.
