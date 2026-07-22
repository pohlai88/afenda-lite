# Schema refactor — integration slice plan

Authority: `afenda-elite-monorepo-refactor` · ARCH-024 · [README.md](./README.md)

## Current state (Slices A–E complete)

```text
PRODUCTION (SSOT)
  src/schemas.ts              → src/schemas/index.ts
  src/schemas-compliance.ts   → src/schemas/compliance.ts
  src/schemas/**              domain Zod modules

  src/store.ts                → src/store/index.ts
  src/store/**                domain persistence contracts
```

`src/adapters/schema/` shim removed in Slice D. `src/adapters/store/` shim removed in Slice E.

## Slice history

| Slice | Status | Summary |
|-------|--------|---------|
| A | Done | Materialized `src/schemas/**`; root barrels |
| B | Done | Monolith replaced by barrels (merged with A) |
| C | Done | Domain commands use `../schemas/<domain>` |
| D | Done | Removed `adapters/schema/` shim |
| E | Done | Materialized `src/store/**`; root barrel; removed `adapters/store/` shim |

## Verification

| Check | Command |
|-------|---------|
| Typecheck | `pnpm --filter @afenda/human-resources typecheck` |
| Schema export parity | `pnpm --filter @afenda/human-resources test -- __tests__/schema-staging-export-parity.test.ts` |
| Store export parity | `pnpm --filter @afenda/human-resources test -- __tests__/store-export-parity.test.ts` |
| Full package tests | `pnpm --filter @afenda/human-resources test` |
| Kernel strict schemas | `__tests__/human-resources.kernel.test.ts` |
