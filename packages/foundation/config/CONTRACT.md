# `@afenda/config` contract

## Canonical owner

`@afenda/config` owns repository-wide Biome policy and TypeScript compiler
profiles. `package.json#exports` is the machine-readable registry; the exported
JSON files are the tool-required projections of that registry.

## Precedence

This file is exhaustive. Every rule repository governance enforces appears below
as a numbered invariant. `README.md` is explanatory only; where the two disagree,
this file wins.

Each invariant maps to exactly one named assertion in
`scripts/check-config-boundary.mjs` (package-local, beside this file), and every
failure cites its invariant ID. A rule that cannot be stated as an invariant does
not belong in this contract.

That correspondence is itself enforced: INV-10 compares the IDs written here
against the IDs the checker implements and fails on either direction. A rule
cannot be documented into existence without an executing assertion, nor enforced
without being written down.

## Consumer surface

- `@afenda/config/biome.json`
- `@afenda/config/tsconfig/base.json`
- `@afenda/config/tsconfig/node-library.json`
- `@afenda/config/tsconfig/react-library.json`
- `@afenda/config/tsconfig/nextjs.json`

These specifiers are consumed only through Biome or TypeScript `extends`.
`@afenda/config` has no root export, JavaScript API, default export, runtime
dependency, or runtime import contract.

## Ownership boundary

**Governed here:** every `compilerOptions` key set by any profile, plus all
formatter and linter policy that applies repository-wide.

**Governed per profile, not globally.** A key is governed for a consumer only if
the profile that consumer extends sets it somewhere on its own chain. `allowJs`
is governed for a `nextjs.json` consumer and simply unset for a
`node-library.json` one; forbidding it in the latter would be an invariant
nobody wrote.

**Consumer-owned:** `rootDir`, `paths`, `include`, and — subject to INV-6 —
`lib` and `types`.

Vitest and Playwright policy belongs to `@afenda/testing`, not here.

### Why `lib`, `types`, and `exclude` need special rules

Under TypeScript `extends`, `lib`, `types`, `include`, `exclude`, and `files` are
**replaced, not merged**, and relative paths resolve against the directory of the
config file they were written in — not the consumer's directory. Three
consequences are load-bearing:

- A consumer that sets `lib` or `types` silently discards the profile's entries.
  INV-6 therefore permits both only as a superset.
- `lib` names are hierarchical — `lib.es2023.d.ts` references `lib.es2022.d.ts`,
  so `["ES2023"]` genuinely contains `ES2022`. INV-6 compares ES-year entries by
  ordinal and every other entry (`DOM`, `DOM.Iterable`, `WebWorker`) literally.
  Comparing them all as opaque strings would demand `["ES2022", "ES2023"]` and
  turn a real rule into noise.
- A bare `"node_modules"` in `base.json#exclude` would resolve inside this
  package and, by virtue of being specified at all, would suppress TypeScript's
  default exclude in every consumer. INV-7 therefore requires glob form.

## Invariants

| ID | Invariant |
|----|-----------|
| **INV-1** | `package.json#exports` contains no `"."` key, no export target outside this package, and the package has no `src/` tree. |
| **INV-2** | Every `#exports` key maps to the identically named `.json` file, and that file exists on disk. |
| **INV-3** | No package declares `@afenda/config` in `dependencies`, `peerDependencies`, or `optionalDependencies`. `devDependencies` only. |
| **INV-4** | No file in the runtime set imports, re-exports, `require`s, or dynamically imports `@afenda/config`. Runtime set: `apps/**`, `packages/**/src/**`, `testing/**`, `e2e/**`, excluding `*.config.*`, `*.test.*`, `*.spec.*`. |
| **INV-5** | Every `@afenda/config/*` specifier appearing in any `extends` field is a declared `#exports` key. Extensionless specifiers are rejected. |
| **INV-6** | No consumer `tsconfig.json` redeclares a `compilerOptions` key governed by the profile it extends. Exempt: `rootDir`, `paths`. Conditionally exempt: `lib` and `types`, permitted only as a superset of the extended profile's effective value. |
| **INV-7** | Every entry in `base.json#exclude` is glob-form (`**/`-prefixed). |
| **INV-8** | No consumer `tsconfig.json` sets `baseUrl`. |
| **INV-9** | Every workspace package extends exactly one profile, matching the zone map in `scripts/check-config-boundary.mjs#PROFILE_ZONES` or a named entry in `#PROFILE_EXCEPTIONS`. |
| **INV-10** | The set of `INV-n` identifiers in this file equals the set the checker implements. Documented-but-unasserted and asserted-but-undocumented both fail. |

## Amendment

Changing a governed option here upgrades every matching consumer by definition;
that is the point of the package. Adding, removing, or renaming an export is a
contract change and requires editing this file and the corresponding assertion in
the same commit.

Edits require the local-only `AFENDA_PROTECTED_EDIT_TOKEN` unlock before
refreshing `.protected.sha256`. The hash lock detects drift, not intent —
`CODEOWNERS` on this path with required review is the binding control.
