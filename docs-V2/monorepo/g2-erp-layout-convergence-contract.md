# G2 ERP Layout Convergence Contract

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g2-erp-layout-convergence-contract.md` |
| Authority | Scratch pre-implementation contract |
| Owner | Platform Architecture |
| Updated | 2026-08-03 |
| Scope | G2 only: ERP layout convergence |
| Prerequisite | GEN-0.1 through GEN-0.5 sealed; G1 implementation green |

This file freezes the G2 boundary before layout mutation. It is not a second
generator authority. Once implemented, the typed ERP generator contract and tests
own the executable rules.

## G2.1 Entry Slice

G2 begins with read-only layout diagnosis only. The ERP generator must discover
every `packages/erp/*` workspace from disk and report:

- package root name parity with `package.json`;
- current layout class: `feature-first`, `historical-root`, `hybrid`, or `empty`;
- feature directories under `src/features`;
- root-level stores and composite store entrypoints;
- public API inventory paths;
- upward relative imports from feature files;
- package-local layout scripts that must be deleted after generator parity.

G2.1 does not move source files, delete package-local scripts, or expose a write
mode. The purpose is to make the single ERP layout policy observable before any
mechanical migration.

## Canonical Layout Policy

The target ERP package shape is feature-first:

```text
packages/erp/<module-id>/
  src/composition/**
  src/features/<feature-id>/**
  src/kernel/**
  src/testing/**
  src/facade/public-api.ts
  src/index.ts
```

Historical root stores such as `src/drizzle-store.ts`, `src/memory-store.ts`,
`src/store.ts`, and `src/resolve-store.ts` are compatibility inputs only. They
may be diagnosed and later migrated, but they must not become a second permanent
layout policy.

## Mutation Boundary

G2 write slices may mutate only after a read-only plan proves collision safety.
Until then, allowed mutations are limited to:

```text
docs-V2/monorepo/g2-erp-layout-convergence-contract.md
turbo/generators/**
```

Package source movement, package-local layout script deletion, and public API
rewrites require a later explicit G2 migration slice.

## Closure Requirements

G2.1 closes when:

- ERP layout diagnostics are emitted by `erp-generator doctor`;
- diagnostics are deterministic in text and JSON;
- all generator tests remain under `turbo/generators/__tests__`;
- `pnpm generator:check`, `pnpm validate:modules`, root `tsc`, and generator
  tests pass;
- no G3 projection, lock, reconciliation, or create/add-feature implementation
  is started.
