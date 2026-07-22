# Apply the HR Drizzle adapter layout

## Target layout

```text
src/adapters/drizzle/
├── index.ts
├── store.ts
├── compose.ts
├── coverage.ts
├── core.ts
├── organization.ts
├── recruitment.ts
├── lifecycle.ts
├── leave.ts
├── compensation-benefits.ts
├── performance.ts
├── learning.ts
├── talent.ts
├── workforce-planning.ts
├── compliance.ts
└── employee-relations.ts
```

`store.ts` composes domain method slices via `composeStoreSlices`. Time remains absent until store + DDL land.

## Required checks

```powershell
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources lint
```

Also run the repository's Drizzle schema or Neon parity test command when it is separate from the package test suite.

## Expected compiler signal

`MissingDrizzleHumanResourcesMethods` in `coverage.ts` must be `never` (enforced by `__tests__/drizzle-coverage.test.ts`). Time persistence is intentionally out of scope until store methods and tables exist.
