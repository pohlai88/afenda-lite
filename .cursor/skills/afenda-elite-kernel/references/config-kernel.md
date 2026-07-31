# `@afenda/config` kernel

## Identity

| Field | Contract |
|-------|----------|
| Package | `@afenda/config` |
| Target | `packages/foundation/config` |
| Kind | Dev-time tooling kernel; never a runtime module |
| Registry | `package.json#exports` |
| Projections | Exported Biome and TypeScript JSON artifacts |

## Permanent surface

- `@afenda/config/biome.json`
- `@afenda/config/tsconfig/base.json`
- `@afenda/config/tsconfig/node-library.json`
- `@afenda/config/tsconfig/react-library.json`
- `@afenda/config/tsconfig/nextjs.json`

The package has no root export or JavaScript capability object. Consumers use
these JSON specifiers only through tool `extends` fields and declare the package
as a `devDependency`.

## Ownership

The package owns shared compiler strictness and Afenda Biome policy. The root
Biome config owns vendor-preset composition and repository-only overrides.
Individual consumers own their include/exclude scope, paths, aliases, root
directories, ambient types required by their runtime, and build-info location.
Test-runner policy remains with `@afenda/testing`.

`package.json#exports` is the machine registry. Governance derives approved
TypeScript and Biome specifiers from it; do not maintain a second consumer
allowlist or publish extensionless aliases.

## Allowed and rejected use

Allowed:

- TypeScript or Biome `extends` through an exported JSON path;
- package-specific compiler deltas outside centrally governed options;
- `@afenda/config` in `devDependencies` with `workspace:*`.

Rejected:

- runtime import, export, `require`, or dynamic import;
- a root/default/JavaScript export;
- `@afenda/config` in runtime dependencies;
- consumer-owned copies of centrally governed compiler options;
- ESLint/Prettier or test-runner policy added as a parallel owner;
- `@afenda/config/biome` or any unpublished profile path.

## Cutover and verification

The final config cutover deletes the extensionless Biome alias and retains the
explicit `.json` contract. Run from the repository root:

```bash
pnpm --filter @afenda/config lint
pnpm --filter @afenda/config test
pnpm check:config-boundary
pnpm test:config-boundary
pnpm check:tsconfig-governance
pnpm test:tsconfig-governance
pnpm check:biome-governance
pnpm exec turbo run typecheck --filter="...@afenda/config" --concurrency=4
pnpm --filter @afenda/config protect:check
```

Refresh `.protected.sha256` only after every applicable gate and consumer check
passes.
