# Testing factory

**Runner/config SSOT** for Vitest / Playwright lanes, gate commands, and e2e helpers. Shared test utility implementation lives in [`@afenda/testing`](../packages/foundation/testing/README.md) (`packages/foundation/testing`) — product tests import `@afenda/testing/*`, not repo-root `testing/` helper paths.

Product packages do **not** own the factory. [`@afenda/config`](../packages/foundation/config) remains Biome + TypeScript config only, with no Vitest scripts or helpers.

## Lane contract

Commands select lanes. Environment variables may enable a lane, but they must not silently change what a generic command runs.

| Lane | Runner | Place tests | Gate | Cache |
|------|--------|-------------|------|-------|
| Unit | Vitest node | `<pkg\|app>/__tests__/**/*.test.ts` | `pnpm test:unit` or `pnpm --filter @afenda/<pkg> test` | Yes |
| Interaction | Vitest jsdom | `apps/web/__tests__/**/*.interaction.test.tsx`; `packages/surfaces/ui-system/__tests__/**/*.interaction.test.tsx` | `pnpm test:interaction` | Yes |
| HR parity | Vitest node + Neon | `packages/erp/human-resources/__tests__/**/*.parity.test.ts` plus named shared-branch suites | `pnpm test:hr:parity` | No |
| Master-data parity | Vitest node + Neon | `packages/erp/master-data/__tests__/{parity,integration}/**/*.{parity,integration}.test.ts` | `pnpm test:master-data:parity` | No |
| Browser smoke/journey | Playwright | `e2e/**` | `pnpm test:e2e:smoke`; `pnpm test:e2e:journey` | Separate |
| Coverage | Vitest/Playwright as needed | Existing lane paths | `pnpm test:coverage` when added | Separate |

`passWithNoTests: false` is the default for Vitest lanes. Optional empty suites require an explicit local exception; do not set pass-with-no-tests globally.

Reject Cypress and Jest as new runners. Prefer the lowest layer that captures the claim.

## Vitest architecture

| File | Owns |
|------|------|
| [`vitest.shared.ts`](vitest.shared.ts) | Repo root, common excludes, `SKIP_ENV_VALIDATION`, `forks`, isolation, mock cleanup, strict no-empty-suite behavior, aliases, project helpers |
| [`vitest.unit.config.ts`](vitest.unit.config.ts) | Unit projects for apps and packages; excludes explicit HR and master-data parity lanes |
| [`vitest.interaction.config.ts`](vitest.interaction.config.ts) | jsdom interaction lane with React plugin and [`setup-interaction.ts`](setup-interaction.ts) |
| [`vitest.hr-parity.config.ts`](vitest.hr-parity.config.ts) | Explicit HR Neon parity lane with [`setup-hr-parity-database.ts`](setup-hr-parity-database.ts), serial files, and parity timeouts |
| [`vitest.master-data-parity.config.ts`](vitest.master-data-parity.config.ts) | Explicit master-data memory/Drizzle parity and Drizzle integration lane with fail-closed database setup |
| [`vitest.config.ts`](vitest.config.ts) | Temporary compatibility wrapper for the unit lane |

L0/L2 Vitest files live in each workspace member’s root `__tests__/` folder. Do **not** co-locate `*.test.ts` under `src/` or feature trees.

## Commands

```bash
pnpm test                         # turbo unit package tests at --concurrency=50%
pnpm test:unit                    # all unit Vitest projects, no DB parity
pnpm test:interaction             # jsdom interaction lane
pnpm test:hr:unit                 # HR memory/unit only, no Neon
pnpm test:hr:parity               # explicit serial HR Neon parity
pnpm test:master-data:parity      # explicit serial master-data Neon release gate
pnpm test:master-data:parity:core # memory/Drizzle core contracts without import ledger
pnpm test:master-data:parity:memory # same parity contracts against memory only
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources test:parity
pnpm --filter @afenda/master-data test:parity
pnpm exec turbo run lint typecheck test --concurrency=50%

pnpm test:e2e:smoke               # Playwright @smoke
pnpm test:e2e:journey             # Playwright @journey
pnpm test:e2e:adverse             # A1-A3 smoke subset
```

Single-spec example:

```bash
pnpm exec vitest run --config testing/vitest.unit.config.ts --project human-resources-unit -- packages/erp/human-resources/__tests__/human-resources.time.test.ts
```

## HR unit vs parity

`@afenda/human-resources` has two separate contracts:

| Loop | When | Command |
|------|------|---------|
| Inner | HR edits without Neon | `pnpm check:hr` or `pnpm --filter @afenda/human-resources test` |
| Outer | Shared-branch DB parity | `REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity` |

`pnpm --filter @afenda/human-resources test` must never require `DATABASE_URL`. HR parity runs only through `pnpm test:hr:parity` or `pnpm --filter @afenda/human-resources test:parity`.

HR parity includes:

- `packages/erp/human-resources/__tests__/**/*.parity.test.ts`
- `leave-concurrency.test.ts`
- `time-policy-concurrency.test.ts`
- `leave-failure-injection.test.ts`

`DATABASE_URL` resolution is fail-closed through [`setup-hr-parity-database.ts`](setup-hr-parity-database.ts) and [`@afenda/testing/require-database-for-ci`](../packages/foundation/testing/src/require-database-for-ci.ts). Under CI or `REQUIRE_DATABASE_TESTS=1`, a missing URL throws; skip is not PASS.

PowerShell outer loop:

```powershell
$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:hr:parity
```

HR parity remains serial by file (`fileParallelism: false`) on the shared Neon branch. Keep the existing `30s` test timeout and `90s` hook timeout; do not add per-file timeout overrides.

## Master-data unit vs parity

`@afenda/master-data` keeps memory/unit tests separate from its production-adapter gate. The parity harness runs identical public contracts against memory and Drizzle. Drizzle-only integration tests cover SQL concurrency, rollback, import recovery, and sensitive projections.

`pnpm --filter @afenda/master-data test` never requires `DATABASE_URL`. The Neon parity lanes are fail-closed through [`setup-master-data-parity-database.ts`](setup-master-data-parity-database.ts) and the live schema probes in [`verify-master-data-core-parity-schema.ts`](verify-master-data-core-parity-schema.ts) and [`verify-master-data-parity-schema.ts`](verify-master-data-parity-schema.ts). They run serially on the shared Neon branch and require the package's current core schema plus `0029_master_data_import_recovery.sql` for the full gate.

## Turbo and CI

Turbo is the dominant cross-package scheduler. Package Vitest workers stay small and fixed to avoid nested parallelism pressure.

| Task | Behavior |
|------|----------|
| `test` | Unit package tests only; cacheable; includes shared/unit config in inputs |
| `test:interaction` | Interaction lane; cacheable; includes interaction config/setup in inputs |
| `test:parity` | Explicit DB parity task; `cache: false` |

CI runs unit tests through `pnpm exec turbo run typecheck test --concurrency=50%`, then runs the HR and master-data parity gates exactly once.

## Collection checks

Use list checks after changing lane globs or package membership:

```bash
pnpm exec vitest list --config testing/vitest.unit.config.ts --project human-resources-unit
pnpm exec vitest list --config testing/vitest.hr-parity.config.ts --project human-resources-parity
pnpm exec vitest list --config testing/vitest.master-data-parity.config.ts --project master-data-parity
pnpm exec vitest list --config testing/vitest.interaction.config.ts
```

Acceptance:

- HR unit collection contains no `*.parity.test.ts`, `leave-concurrency.test.ts`, `time-policy-concurrency.test.ts`, or `leave-failure-injection.test.ts`.
- HR parity collection contains only the explicit parity set.
- Master-data unit collection contains no `parity/` or `integration/` files; its parity collection contains only those two explicit directories.
- Interaction collection contains only `*.interaction.test.tsx`.
- `pnpm exec turbo run test --filter=@afenda/human-resources` does not run parity.

## L4 authenticated factory

| Module | Role |
|--------|------|
| [`e2e/playwright-base.ts`](e2e/playwright-base.ts) | `test` / `expect` + worker-scoped `workerTenant` and `E2E_REQUIRE_FACTORY` fail-closed behavior |
| [`e2e/tenancy.ts`](e2e/tenancy.ts) | Unique orgs/users per worker, two-org denial, cleanup |
| [`e2e/flows.ts`](e2e/flows.ts) | `signIn`, `loginAsOperator`, `loginAsClient` |
| [`e2e/assertions.ts`](e2e/assertions.ts) | Anonymous redirect, wrong-role `/403`, role homes |
| [`e2e/credentials.ts`](e2e/credentials.ts) | Explicit `E2E_*` overrides for one-off runs |

Authenticated Playwright specs use `workerTenant` first and explicit `E2E_*` pairs only for one-off runs. `SHARED_ADMIN_*` and `PREVIEW_CLIENT_*` are local autofill/seed accounts, never E2E login subjects.

## Imports

| Need | Import |
|------|--------|
| SUT from package tests | `from "../src/..."` |
| DB suite CI fail-closed | `import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci"` |
| L2 interaction | `@testing-library/react` + `@testing-library/user-event` directly in `*.interaction.test.tsx` |
| L4 specs | `import { test, expect } from "@/testing/e2e/playwright-base"` |
| L4 login flows | `from "@/testing/e2e/flows"` |
| L4 assertions | `from "@/testing/e2e/assertions"` |

Path `@/testing/*` resolves from [`../e2e/tsconfig.json`](../e2e/tsconfig.json).
