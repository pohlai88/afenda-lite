# HR Drizzle adapter validation record

| Field | Value |
| ----- | ----- |
| Surface | `docs-V2/_scratch/erp/human-resources-drizzle-adapter-validation.md` |
| Package | `@afenda/human-resources` |

- TypeScript: `pnpm --filter @afenda/human-resources typecheck` — composed store `satisfies HumanResourcesStore`.
- Coverage: `MissingDrizzleHumanResourcesMethods` is `never` (time + identity included in `coverage.ts`).
- Composition: `composeStoreSlices` throws on duplicate method ownership.
- Naming: `compensation-benefits.ts` aligns with domain directory; store/schema use `compensation` stem.
- Memory: parity harness lives at `__tests__/helpers/hr-parity-harness.ts`.
- Parity: domain memory↔Drizzle suites under `__tests__/human-resources.*.parity.test.ts`.

## Validation boundary

Neon Drizzle parity suites require `DATABASE_URL` in CI/local. Memory suites run without a database.
