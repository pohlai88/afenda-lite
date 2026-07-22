# Validation report

- Original `schemas.ts` direct exports: **411** (246 runtime values + 165 `export type`)
- Refactored main schema exports: **411** (parity via `__tests__/schema-staging-export-parity.test.ts`)
- Missing main exports: **0**
- Unexpected main exports: **0**
- Original `schemas-compliance.ts` direct exports: **29**
- Refactored compliance exports: **29**
- Missing compliance exports: **0**
- Unexpected compliance exports: **0**
- TypeScript syntax diagnostics: **0** (`pnpm --filter @afenda/human-resources typecheck`)
- Automated export parity test: **`__tests__/schema-staging-export-parity.test.ts`** — root barrels vs `src/schemas/**`

Cutover procedure: [INTEGRATION.md](./INTEGRATION.md).
