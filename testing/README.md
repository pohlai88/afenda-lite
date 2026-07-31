# Testing Control Plane

Repo-root `testing/` is the runner entrypoint home for Vitest and Playwright.
It exists so runner configs can see repo-root aliases, workspace paths, and app
startup. It is not the policy source.

`@afenda/testing` owns the canonical testing policy: lane identity, include and
exclude patterns, database requirements, browser requirements, cache class,
shared setup helpers, runner config factories, and structural validation inputs.
Root files under `testing/` should stay thin consumers of that package.

Audience: engineers maintaining tests, package owners adding suites, and
operators running release gates.

## Ownership

| Concern | Owner |
| ------- | ----- |
| Test lane identity | `@afenda/testing` |
| Include and exclude patterns | `@afenda/testing` |
| Runner policy | `@afenda/testing` |
| Database test resolution | `testingDatabase` from `@afenda/testing` |
| Shared setup execution | `@afenda/testing/setup/database` and `@afenda/testing/setup/required-database` |
| Vitest config shape | `testingVitest` from `@afenda/testing` |
| Playwright config shape | `testingPlaywright` from `@afenda/testing` |
| Named runner entry files | `testing/` |
| E2E scenario implementation | `testing/e2e/` |
| Structural anti-drift scan | `scripts/check-testing-governance.mts` |

The target flow is:

```text
@afenda/testing policy
  -> config factory
  -> thin root config
  -> runner
```

Do not add a parallel registry or a second validation manifest. If a rule
describes how tests are selected or bootstrapped, it belongs in
`packages/foundation/testing`.

## Current State

| Surface | State |
| ------- | ----- |
| `packages/foundation/testing/src/lanes.ts` | Canonical registry; `include` / `exclude` are the sole selection fields. |
| `packages/foundation/testing/src/capabilities/*` | Frozen root capabilities; no policy or resolver consumer subpaths. |
| `testing/vitest.*.config.ts` | Active runner configs; lane names, includes, excludes, and timeouts come from `@afenda/testing`, while repo-root aliasing and project fan-out remain here. |
| `testing/verify-master-data-*-schema.ts` | Root release probes that delegate DB gating to `@afenda/testing` before checking applied schema shape. |
| `scripts/check-testing-governance.mts` | Structural checker; consumes package policy and rejects source imports into `packages/foundation/testing/src`. |

## Commands

```bash
pnpm test
pnpm test:unit
pnpm test:interaction
pnpm test:web:scenario
pnpm test:hr:parity
pnpm test:master-data:parity
pnpm test:master-data:parity:core
pnpm test:master-data:parity:memory
pnpm test:e2e:smoke
pnpm test:e2e:journey
pnpm test:e2e:adverse
pnpm check:testing-governance
```

Package maintainers use filters for local loops:

```bash
pnpm --filter @afenda/testing lint
pnpm --filter @afenda/testing typecheck
pnpm --filter @afenda/testing test
```

The root workspace requires Node `24.x` and pnpm `>=10.33.4` from
`package.json`.

## Lane Contract

Commands select lanes. Environment variables may require evidence, but they must
not silently change what a generic command runs.

| Lane | Runner | Evidence boundary |
| ---- | ------ | ----------------- |
| `unit` | Vitest | Package and app `__tests__/**/*.test.ts`; no DB parity. |
| `interaction` | Vitest jsdom | `*.interaction.test.tsx` under approved app and UI-system paths. |
| `web-scenario` | Vitest | Web journey and inventory suites that are heavier than ordinary unit contracts. |
| `human-resources-parity` | Vitest | HR shared-branch parity and named concurrency/failure suites; DB required for release evidence. |
| `master-data-parity` | Vitest | Master-data memory/Drizzle parity plus integration; DB required. |
| `master-data-core-parity` | Vitest | Core master-data parity without import recovery gate; DB required. |
| `master-data-memory-parity` | Vitest | Memory-only master-data parity; no DB. |
| `e2e-smoke` | Playwright | Smoke scenarios; DB and browser required. |
| `e2e-journey` | Playwright | Journey scenarios; DB and browser required. |
| `e2e-all` | Playwright | Full E2E suite; DB and browser required. |
| `e2e-adverse` | Playwright | Anonymous, wrong-role, and two-org denial checks. |
| `storybook-unit` | Vitest | Storybook package unit tests. |
| `storybook-stories` | Vitest browser-backed | Story files as executable evidence. |
| `storybook-visual` | Playwright | Storybook visual specs. |

`passWithNoTests: false` remains the default. Optional empty suites require an
explicit local exception.

## Database Evidence

DB-backed suites resolve `DATABASE_URL` through
`testingDatabase` from the `@afenda/testing` root.

- CI requires an injected `DATABASE_URL`.
- CI never loads `.env.local`.
- Local runs may load the repository-root `.env.local`.
- `REQUIRE_DATABASE_TESTS=1` applies the same fail-closed rule locally.
- A missing local database may skip a suite only when the lane is not being used
  as release evidence.
- A skipped DB suite is not passing production evidence.

Use:

```ts
import { testingDatabase } from "@afenda/testing";

const database = testingDatabase.resolve();

describe.runIf(database.hasDatabase)("database contract", () => {
	// tests
});
```

Do not read `process.env.DATABASE_URL` directly in product package tests unless
the file is explicitly approved by `@afenda/testing` policy.

## Final Cutover

The testing control plane exposes one root capability style:

- `testingPolicy`
- `testingVitest`
- `testingPlaywright`
- `testingDatabase`

Historical policy, Vitest, Playwright, database, E2E, and lane subpaths are
deleted. The two `@afenda/testing/setup/*` entrypoints are side-effect adapters
for runner loading, not consumer APIs. Lane selection uses only `include` and
`exclude`; compatibility glob aliases no longer exist.

Root runner files may own repository paths, aliases, project fan-out, and
browser startup. They must request all reusable selection, timeout, runner, and
database behavior from the package capabilities.

## Ship Criteria

Do not claim the testing plane is fully stabilized until:

- no lane glob is declared twice as policy;
- no DB bootstrap is implemented twice;
- no root config manually recreates package-owned lane policy;
- no setup file imports `packages/foundation/testing/src/*` relatively;
- no test helper reads `DATABASE_URL` directly without an approved exception;
- root runner files are thin package consumers;
- package tests prove lane definitions, config factories, and setup helpers;
- governance checks pass from the root command.

## References

- [`@afenda/testing`](../packages/foundation/testing/README.md)
- [`packages/foundation/testing/src/index.ts`](../packages/foundation/testing/src/index.ts)
- [`scripts/check-testing-governance.mts`](../scripts/check-testing-governance.mts)
- [`docs-V2/monorepo`](../docs-V2/monorepo/README.md)
- [`docs-V2/pnpm`](../docs-V2/pnpm/README.md)
