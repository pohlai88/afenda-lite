# `@afenda/config` contract

## Canonical owner

`@afenda/config` owns repository-wide Biome policy and TypeScript compiler
profiles. `package.json#exports` is the machine-readable registry; the exported
JSON files are the compiler/tool-required projections.

## Permanent consumer surface

- `@afenda/config/biome.json`
- `@afenda/config/tsconfig/base.json`
- `@afenda/config/tsconfig/node-library.json`
- `@afenda/config/tsconfig/react-library.json`
- `@afenda/config/tsconfig/nextjs.json`

These specifiers are consumed only through Biome or TypeScript `extends`.
`@afenda/config` has no root export, JavaScript API, runtime dependency, default
export, or runtime import contract.

## Ownership boundary

Shared compiler strictness and formatter/linter policy belong here. Consumers
retain package-specific `rootDir`, `types`, paths, aliases, and include/exclude
scope. Vitest and Playwright policy belongs to `@afenda/testing`.

## Final cutover

The extensionless `@afenda/config/biome` alias is deleted. The permanent
specifier is `@afenda/config/biome.json`; no compatibility alias remains.

Repository enforcement must reject:

- runtime import, export, `require`, or dynamic import of `@afenda/config`;
- `@afenda/config` in runtime `dependencies` rather than `devDependencies`;
- unpublished or extensionless configuration specifiers;
- consumer-owned copies of centrally governed compiler options;
- exports whose target is not the identically named JSON artifact.
