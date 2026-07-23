# Apply the HR Drizzle adapter layout

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/human-resources-drizzle-adapter-migration.md` |
| Package | `@afenda/human-resources` |

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
├── leave-transactions.ts
├── compensation-benefits.ts
├── performance.ts
├── learning.ts
├── talent.ts
├── time.ts
├── time-transactions.ts
├── work-calendar-lookup.ts
├── workforce-planning.ts
├── compliance.ts
├── employee-relations.ts
└── identity.ts
```

`store.ts` composes domain method slices via `composeStoreSlices`.

## Required checks

```powershell
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources lint
```

Also run the repository's Drizzle schema or Neon parity test command when it is separate from the package test suite.

## Expected compiler signal

`MissingDrizzleHumanResourcesMethods` in `coverage.ts` must be `never` (enforced by `__tests__/drizzle-coverage.test.ts`).
