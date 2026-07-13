# architecture

Living and Target architecture SSOTs for this Afenda-Lite (beta) checkout. Afenda-Elite (battle-proven) shares the same [DOC-001](../_control/DOC-001-documentation-control-standard.md) documentation control and similar infra aliasing. Material decisions live in Living/Target ARCH docs here — **do not create `docs/adr/`**. When an ADR is warranted (see [ARCH-029](system/ARCH-029-interface-api-architecture.md) §6), place it under `architecture/decisions/` after explicit ID approval. Product-module spines stay under [`docs/modules/`](../modules/).

## How to read

1. **[system/ARCH-022](system/ARCH-022-system-overview.md)** — system overview (Modular Monolith + Hexagonal + monorepo Target)
2. **[system/ARCH-023](system/ARCH-023-multi-tenancy.md)** — **sole** Living SSOT for multi-tenancy + platform RBAC + Decision lock
3. Use **[tech-stack/ARCH-031](tech-stack/ARCH-031-technology-stack-catalogue.md)** to distinguish current, Target, conditional, and rejected technologies; then follow its owning authority links

## Layout

| Path | Job |
|------|-----|
| [`system/`](system/) | Target system architecture — ARCH-022…028 (workspace, tenancy+RBAC, packages, data, auth, env, slices) |
| [`backend/`](backend/) | Hexagon / modules / conventions — ARCH-001, 004…010 |
| [`frontend/`](frontend/) | Routes, BFF, UI, AdminCN — ARCH-002, 012…016, 029 |
| [`tech-stack/`](tech-stack/) | Technology Stack Catalogue + AdminCN customization/preflight — ARCH-031, 018, 019 |
| [`archive/`](archive/) | Superseded stubs — ARCH-003, 020, 021 |

Subfolder indexes: [system/README](system/README.md) · [backend/README](backend/README.md) · [frontend/README](frontend/README.md) · [tech-stack/README](tech-stack/README.md)

## Root artifacts

| Artifact | Role |
|----------|------|
| `*.snapshot.json` | Generated / snapshot artifacts (reliance, route coverage) — not Living prose |

## Related

| Need | Doc |
|------|-----|
| Docs index | [../README.md](../README.md) |
| Modules (FFT spine) | [../modules/MOD-002-modules-index.md](../modules/MOD-002-modules-index.md) |
| Runbooks | [../runbooks/README.md](../runbooks/README.md) |
| Guides | [../guides/README.md](../guides/README.md) |

## Rules

1. Prefer Living/Target ARCH docs over archive stubs.
2. Do **not** create `docs/adr/`. Put material decisions in the owning Living/Target ARCH.
3. Do not reopen ARCH-023 Rejected (R*) / Deferred (D*) without explicit user approval.
4. Do not recreate a separate platform-IAM ARCH file — IAM lives in [ARCH-023](system/ARCH-023-multi-tenancy.md).
5. FFT product locks / roadmap: [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md).
