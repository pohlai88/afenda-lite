# Testing Kernel

Use this contract for `@afenda/testing` and for missions that change shared test
lane policy, runner projections, or database-evidence setup.

## Semantic owner and consumer facade

- `TESTING_LANES` is the canonical lane registry. Lane identity, runner,
  ownership, control file, include, exclude, and cache policy live there once.
- Consumers import the frozen `testingPolicy`, `testingVitest`,
  `testingPlaywright`, and `testingDatabase` capabilities from the package root.
- Runner config may load only the executable side-effect entrypoints
  `@afenda/testing/setup/database` and
  `@afenda/testing/setup/required-database`. They are load boundaries, not a
  second capability style.
- Do not expose lane, resolver, Vitest, Playwright, setup-helper, or
  compatibility implementation subpaths.

## Derivation and ingress

- Derive Vitest include/exclude and Playwright match projections from the lane
  registry. Do not maintain `allowedGlobs` / `forbiddenGlobs` aliases or parallel
  runner maps.
- `testingDatabase` owns test `DATABASE_URL` resolution, local `.env.local`
  ingress, CI fail-closed behavior, E2E requirements, and setup operations.
  Product tests must not recreate that policy.
- Repository runner files compose the package projections; they do not become a
  second policy owner.

## Source-exported ESM resolution

The package is consumed while still exporting TypeScript source, including from
native Vitest/Vite config loading. Verify both package runtime loading and a
downstream consumer typecheck.

If relative `.ts` specifiers trigger downstream `TS5097`, while extensionless
or `.js` specifiers fail native resolution because no built JavaScript exists,
use a package-private `imports` mapping such as `#testing/*` to the real source.
Keep this mapping under `imports`, never `exports`: it is an internal resolution
boundary, not public API.

## Final cutover

1. Inventory every `@afenda/testing/*` import, runner setup string, direct
   database resolver, and locally declared lane map.
2. Freeze the root capability names and the exact executable setup entrypoints.
3. Migrate capability consumers to the package root and runner setup strings to
   the two approved entrypoints.
4. Delete the superseded exports, compatibility fields, barrels, and setup
   modules in the same mission.
5. Regenerate the official package documentation from package metadata and the
   README; do not hand-edit generated MDX.
6. Extend `check:testing-governance` to reject public implementation subpaths,
   alternate runner systems, policy drift, and unauthorized database ingress.

## Focused evidence

Run in this order:

```bash
pnpm --filter @afenda/testing lint
pnpm --filter @afenda/testing typecheck
pnpm --filter @afenda/testing test
pnpm check:testing-governance
```

Then independently typecheck each directly changed config or product package.
The package test must load the root facade through the real runner config so
native ESM resolution is exercised. Refresh package protection only after code,
tests, consumer checks, generated documentation, and governance are final.
