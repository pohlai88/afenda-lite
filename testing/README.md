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
| Database test resolution | `@afenda/testing/require-database-for-ci` |
| Shared setup functions | `@afenda/testing/setups/database` and `@afenda/testing/setups/required-database` |
| Vitest config shape | `@afenda/testing/vitest` |
| Playwright config shape | `@afenda/testing/playwright` |
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
| `packages/foundation/testing/src/lanes.ts` | Active registry; legacy `allowedGlobs` / `forbiddenGlobs` remain as compatibility aliases while `include` / `exclude` are canonical. |
| `packages/foundation/testing/src/testing-control-plane.ts` | Compatibility re-export for older imports. New code should consume `@afenda/testing` or `@afenda/testing/lanes`. |
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
`@afenda/testing/require-database-for-ci`.

- CI requires an injected `DATABASE_URL`.
- CI never loads `.env.local`.
- Local runs may load the repository-root `.env.local`.
- `REQUIRE_DATABASE_TESTS=1` applies the same fail-closed rule locally.
- A missing local database may skip a suite only when the lane is not being used
  as release evidence.
- A skipped DB suite is not passing production evidence.

Use:

```ts
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";

const database = resolveDatabaseUrlForTests();

describe.runIf(database.hasDatabase)("database contract", () => {
	// tests
});
```

Do not read `process.env.DATABASE_URL` directly in product package tests unless
the file is explicitly approved by `@afenda/testing` policy.

## Refactor Plan

### Phase 1 - Consolidate Package Authority

Status: complete for the current compatibility slice.

1. Split the public model into `contracts.ts`.
2. Make lane policy expose canonical `include` and `exclude` fields.
3. Keep legacy `allowedGlobs` and `forbiddenGlobs` only as temporary
   compatibility aliases.
4. Add `@afenda/testing/vitest` and `@afenda/testing/playwright` factories.
5. Add package-owned database setup under `@afenda/testing/setups/database`
   and `@afenda/testing/setups/required-database`.
6. Prove package exports with package tests.

### Phase 2 - Collapse Root Configuration

Status: complete for DB setup wrappers; broader config collapse remains in progress.

1. Replace manual include/exclude declarations in root Vitest configs with
   package lane helpers.
2. Keep only root-specific aliasing and project fan-out in root files.
3. Remove repeated timeouts where the package lane already owns them.
4. Verify lane collection with `vitest list` for unit, interaction,
   web-scenario, HR parity, and master-data parity.

### Phase 3 - Delete Duplicate Setup

Status: in progress.

1. Replace repo-root DB bootstrap implementations with calls to
   package setup subpaths.
2. Delete setup files that Vitest can resolve through package subpaths.
3. Keep root DB probes only where they check repository schema state, not where
   they duplicate DB bootstrap.

### Phase 4 - Simplify Governance

Status: complete for the current lane/file coverage slice.

1. Keep `scripts/check-testing-governance.mts` as a structural checker.
2. Remove any policy ownership from the checker.
3. Verify no test file falls outside every declared lane.
4. Verify mutually exclusive lanes do not overlap.
5. Verify no direct relative imports into package source remain outside approved
   temporary wrappers.

### Phase 5 - Stabilize Release Evidence

Status: planned.

1. Run `pnpm check:testing-governance`.
2. Run `pnpm --filter @afenda/testing lint`.
3. Run `pnpm --filter @afenda/testing typecheck`.
4. Run `pnpm --filter @afenda/testing test`.
5. Run relevant collection checks after config collapse.
6. Treat DB and browser lanes as release evidence only when their required
   external resources are present.

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

## Known Gaps

| Gap | Severity | Required action |
| --- | -------- | --------------- |
| Root Vitest configs still own project fan-out and aliasing. | Major | Continue reducing each root config toward a thin entrypoint without losing repo-specific project roots. |
| Full `web` unit collection was too broad. | Review needed | Scenario tests now have a dedicated lane; remeasure plain web unit collection before raising the score. |

## References

- [`@afenda/testing`](../packages/foundation/testing/README.md)
- [`packages/foundation/testing/src/testing-control-plane.ts`](../packages/foundation/testing/src/testing-control-plane.ts)
- [`scripts/check-testing-governance.mts`](../scripts/check-testing-governance.mts)
- [`docs-V2/monorepo`](../docs-V2/monorepo/README.md)
- [`docs-V2/pnpm`](../docs-V2/pnpm/README.md)

### README Score: 95% / 100%

| Dimension | Score | Note |
| --------- | ----- | ---- |
| AUTHORITY | 20/20 | Testing ownership points to `@afenda/testing`; monorepo authority linked. |
| ACCURACY | 24/25 | Commands and paths match disk; root config collapse remains partial by design. |
| DIATAXIS | 15/15 | Mixed internal guide/reference with actionable phase plan; no empty scaffolding. |
| AUDIENCE | 15/15 | Written for engineers and operators maintaining the testing plane. |
| BREVITY | 9/10 | Phase detail is concise and tied to open controls. |
| VERIFY | 14/15 | Engines, links, lane coverage governance, and scoped gates verified; web scenario split still needs final unit remeasurement. |

**Path to 100%:** Remeasure plain `web` unit collection after the scenario split
and tighten the lane again if any non-unit suites remain.
