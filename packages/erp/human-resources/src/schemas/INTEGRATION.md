# Schema refactor — integration slice plan

Authority: `afenda-elite-monorepo-refactor` · ARCH-024 · [README.md](./README.md)

## Current state (Slices A–E complete)

```text
PRODUCTION (SSOT)
  src/schemas/index.ts        composed schema barrel
  src/schemas/compliance.ts   compliance schemas
  src/schemas/**              domain Zod modules

  src/store/index.ts          composed store contract
  src/store/**                domain persistence contracts
```

`src/adapters/schema/` shim removed in Slice D. `src/adapters/store/` shim removed in Slice E. Root compatibility re-export files removed — package subpaths point at `schemas/index.ts` and `store/index.ts`.

## Slice history

| Slice | Status | Summary |
|-------|--------|---------|
| A | Done | Materialized `src/schemas/**`; composed barrel at `schemas/index.ts` |
| B | Done | Monolith replaced by domain barrels (merged with A) |
| C | Done | Domain commands use `../schemas/<domain>` |
| D | Done | Removed `adapters/schema/` shim |
| E | Done | Materialized `src/store/**`; composed barrel at `store/index.ts`; removed `adapters/store/` shim |

## Verification

| Check | Command |
|-------|---------|
| Typecheck | `pnpm --filter @afenda/human-resources typecheck` |
| Full package tests | `pnpm --filter @afenda/human-resources test` |
| Kernel strict schemas | `__tests__/human-resources.kernel.test.ts` |
