# `@afenda/testing`

Canonical workspace testing control plane. It owns lane identity, selection
policy, runner projections, database-evidence resolution, and reusable setup
behavior. Repo-root [`testing/`](../../../testing/README.md) remains the runner
entrypoint and repository-composition home, not a second policy owner.

## Permanent consumer surface

Import four frozen capabilities from the package root:

```ts
import {
	testingDatabase,
	testingPlaywright,
	testingPolicy,
	testingVitest,
} from "@afenda/testing";
```

| Capability | Owns |
|------------|------|
| `testingPolicy` | Lane registry, control files, runner bans, database-read exceptions, lane lookup |
| `testingVitest` | Vitest configuration and include/exclude projections |
| `testingPlaywright` | Playwright lane configuration projection |
| `testingDatabase` | Database evidence resolution, E2E requirements, and setup operations |

The only subpaths are executable runner setup entrypoints:

- `@afenda/testing/setup/database`
- `@afenda/testing/setup/required-database`

They perform setup when loaded by Vitest. They are not alternative consumer
APIs. All former policy, resolver, runner, and compatibility subpaths are
deleted and must not be restored.

## Semantic ownership

`TESTING_LANES` is the canonical registry. Types and Vitest/Playwright
projections derive from it. `include` and `exclude` are the only selection
fields; historical `allowedGlobs` and `forbiddenGlobs` aliases are removed.

The database capability is the only test-evidence ingress for `DATABASE_URL`:

```ts
import { testingDatabase } from "@afenda/testing";

const database = testingDatabase.resolve();

describe.runIf(database.hasDatabase)("database contract", () => {
	// tests
});
```

- CI requires an injected `DATABASE_URL` and never loads `.env.local`.
- Local runs may load the repository-root `.env.local`.
- `REQUIRE_DATABASE_TESTS=1` applies the same fail-closed rule locally.
- A skipped database suite is not passing release evidence.
- Blank values are missing; unexpected file I/O failures surface.

## Boundaries

Do not:

- declare lane globs, runner policy, or DB bootstrap outside this package;
- import `@afenda/testing/*` except the two setup entrypoints in runner config;
- read `DATABASE_URL` independently in product tests;
- import repo-root `testing/` helpers from product packages;
- import `@afenda/testing` from runtime product code;
- add Jest or Cypress as another runner stack.

The package is an R1-A dev/test leaf with no runtime dependencies or workspace
runtime edges.

## Verification

```bash
pnpm --filter @afenda/testing lint
pnpm --filter @afenda/testing typecheck
pnpm --filter @afenda/testing test
pnpm check:testing-governance
```
