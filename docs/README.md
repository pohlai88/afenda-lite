# Documentation trunk

Repo-root `docs/` is the live documentation trunk marker. `docs-V2/` is retired and must not be recreated (`pnpm check:docs-trunk-ban`).

## Present on disk

| Path | Role |
| --- | --- |
| [`template/`](template/README.md) | Markdown-only README + AGENTS hand-copy kits |
| [`template/readme/`](template/readme/README.md) | Package and folder README templates |
| [`template/agents/`](template/agents/README.md) | Root-shape and package AGENTS stubs |

Forward product/kernel authority lives beside owners:

| Surface | Authority |
| --- | --- |
| Kernel package register | `governance/kernel/` + `pnpm check:kernel-governance` |
| Kernel doctrine projections | `packages/KERNEL-GOVERNANCE.md` · `packages/KERNEL-PRD-INDEX.md` |
| Per-package kernel PRDs | Owning package `docs/` (for example `packages/foundation/errors/docs/`) |
| ERP scaffolding | `packages/erp/ERP-SCAFFOLDING.md` |
| Module product PRDs | Owning ERP package `docs/` |
| Official human docs site | `apps/docs` (`@afenda/docs`) — not DOC-001 register SSOT |
| Living ARCH / ADR bodies | Absent until an explicit Docs-lane reopen |

## Retired / banned under `docs/`

Do not recreate:

- `docs/erp/**`
- `docs/_scratch/**`
- `docs/template/**` except `docs/template/readme/**` and `docs/template/agents/**`
- `docs/kernel/**`
- Nested architecture trunks listed by `pnpm check:docs-trunk-ban`
