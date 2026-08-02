# Turbo generators

**What it is** — the local code-generation and package-governance engine for this monorepo, built on Turborepo's [`turbo gen`](https://turborepo.dev/docs/guides/generating-code) ([`config.ts`](config.ts) registers everything).

**What it does** — scaffolds ERP packages and features, runs read-only diagnostics ("doctor") and upgrade plans, applies reconciliations through a transactional writer, and enforces per-family contract governance.

**When you need it** — adding an ERP package/feature, checking whether a workspace conforms to its family contract, or reconciling projection-lock / kernel-adoption surfaces.

**Who it's for** — engineers extending `packages/*`. Contract authority (the `g1`…`g17` slice roadmap) lives in Scratch [docs-V2/monorepo](../../docs-V2/monorepo/generator-architecture-prd.md); this README orients and links — it is not the contract SSOT.

> **Local-only by contract.** Generator governance declares `ciRequired: false` and lists `.github/workflows/*` as *excluded* paths (slice **G15**). Run it on developer machines — never wire `generator:check` or `turbo gen` into CI. See [g15](../../docs-V2/monorepo/g15-local-generator-closure-governance-contract.md) · [g17 stop boundary](../../docs-V2/monorepo/g17-generator-stop-boundary-contract.md).

## Families

| Family | Workspace roots | Release | Write generators |
|--------|-----------------|---------|------------------|
| `kernel` | `packages/foundation`, `packages/runtime`, `packages/data-plane`, `packages/control-plane` | internal | `apply-adoption` |
| `erp` | `packages/erp` | internal | `create-package`, `add-feature`, `reconcile-projection-locks` |

## Commands

**Prerequisites:** Node.js `24.x` · pnpm `>=10.33.4` (root [`package.json`](../../package.json) engines). Run from the repository root.

Read-only — inspect and plan (no writes):

```bash
pnpm gen                  # interactive picker (all generators)
pnpm gen:doctor:kernel    # kernel discovery + contract diagnostics
pnpm gen:doctor:erp       # erp diagnostics: manifest / layout / projection authority
pnpm gen:plan:kernel      # read-only kernel upgrade plan
pnpm gen:plan:erp         # read-only erp upgrade plan
pnpm generator:check      # governance gate (also runs inside `pnpm checks`)
```

Write — scaffold and reconcile (prompts for ids; transactional, refuses to clobber):

```bash
pnpm turbo gen erp-generator-create-package             # new ERP package (moduleId, category)
pnpm turbo gen erp-generator-add-feature                # feature into a package (moduleId, featureId)
pnpm turbo gen erp-generator-reconcile-projection-locks # write missing projection-lock files
pnpm turbo gen kernel-generator-apply-adoption          # reconcile kernel adoption surfaces
```

Append `--args <answer> …` to any `turbo gen` command to bypass prompts.

## How writes stay safe

Every write goes through [`engine/file-transaction.ts`](engine/file-transaction.ts), not raw templates:

- Three policies — `create` (fail if present), `create-or-same` (idempotent), `replace-if-current` (optimistic-lock on expected contents).
- All-or-nothing: a failed write rolls the batch back to its pre-run snapshot.
- Discovery is contract-scoped and path-hardened ([`engine/workspace-discovery.ts`](engine/workspace-discovery.ts)): symlink-escape, case-collision, nested-workspace, and ambiguous-family inputs are rejected before any write.

## Governance gate

`pnpm generator:check` ([`engine/generator-check.ts`](engine/generator-check.ts)) discovers workspaces, runs phase-exit convergence, and emits an `afenda.generator-check/v1` report; it exits non-zero on any governance issue. It is wired into the local `pnpm checks` orchestrator ([`scripts/run-checks.mjs`](../../scripts/run-checks.mjs)) and self-skips if this engine is absent.

## Layout

| Path | Role |
|------|------|
| [`config.ts`](config.ts) · [`contracts.ts`](contracts.ts) | `turbo gen` registration · contract registry |
| [`engine/`](engine) | discovery, file transactions, reconciliation, governance |
| [`erp-generator/`](erp-generator) · [`kernel-generator/`](kernel-generator) | per-family contracts, doctors, scaffolds |
| [`__tests__/`](__tests__) | engine unit tests — run in CI via the `repo-tooling` Vitest project |
| [`evidence/`](evidence) | per-slice closure artifacts |

## Authority

- Contract SSOT + slice roadmap — [docs-V2/monorepo](../../docs-V2/monorepo/generator-architecture-prd.md) (`g1`…`g17`)
- Package governance — [docs-V2/modules/PACKAGE-GOVERNANCE.md](../../docs-V2/modules/PACKAGE-GOVERNANCE.md)
- Turbo task wiring — [`//#generator:check`](../../turbo.json)
