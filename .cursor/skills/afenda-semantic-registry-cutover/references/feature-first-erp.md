# Feature-first ERP semantic architecture

Load this reference when creating or restructuring an ERP package, especially when
the existing tree mixes domain folders with root `adapters`, `schemas`, `store`,
`shared`, or generic `types` layers.

## Contents

1. Architectural outcome
2. Uniform feature capsule
3. Ownership decisions
4. Dependency direction and composition
5. Kernel and facade boundary
6. Deterministic refactor method
7. Failure lessons
8. Human Resources exemplar
9. Reuse checklist

## 1. Architectural outcome

Use business meaning as the primary directory axis:

```text
src/
├── index.ts                 # sole production consumer entrypoint
├── facade/                  # permanent, representation-safe capabilities
├── kernel/                  # package-wide semantic composition and primitives
├── composition/             # aggregate wiring and production construction
├── features/                # business capabilities; primary implementation axis
└── testing/                 # isolated test capabilities and verification harnesses
```

The horizontal surfaces are permissions, not mandatory empty folders. Create only
those justified by the package. Never restore root `adapters/`, `schemas/`,
`store/`, `shared/`, `types.ts`, or `ports.ts` as parallel business layers.

An owning ERP farm refines business feature names, invariants, and justified
capsule contents; it does not authorize a competing root topology. If a
package-specific skill and this reference disagree about `facade`, `kernel`,
`composition`, `features`, `testing`, root layer bans, or dependency direction,
synchronize that skill before changing product code. Do not preserve the
conflict as a package-specific architectural variant.

## 2. Uniform feature capsule

Every feature uses the same dispositions. Omit files that have no real semantic
content; do not add placeholders.

```text
features/<feature>/
├── index.ts                  # internal feature projection, if composition needs one
├── definition.ts             # canonical operation/status/policy definitions
├── contract.ts               # feature-owned domain inputs, outputs, and values
├── schema.ts                 # validation derived from the feature contract
├── policy.ts                 # authorization/privacy/workflow policy owned here
├── <use-case>.ts             # commands, queries, and domain behavior
├── store-contract.ts         # smallest feature persistence capability
├── ports.ts                  # explicit cross-feature/external capabilities, if needed
├── adapters/
│   ├── memory.ts             # semantic parity adapter
│   └── drizzle.ts            # production persistence adapter
└── __tests__/                # feature contracts when package tooling supports colocation
```

Large features may contain named subfeatures, but may not recreate generic
`commands/`, `queries/`, `services/`, `models/`, or package-wide layer farms.
Prefer a flat capsule until a real subfeature owns independent vocabulary.

### Required invariants

- One feature owns each business term, status, workflow, operation, and schema.
- `definition.ts` or the feature's named registry is the semantic SSOT.
- Types, validation, authorization, emissions, serialization, manifests, and
  documentation inventories derive from that owner.
- Domain handlers depend on narrow store/port capabilities, never the composite
  package store.
- Memory and production adapters implement the same feature contract.
- Cross-feature workflows depend on explicit capability ports, not peer internals.
- Consumers call the root facade and never import a feature path.

## 3. Ownership decisions

Use this placement test:

| Question | Owner |
|---|---|
| Does only one business capability understand the meaning? | That feature capsule |
| Is it a package-wide registry composition or invariant? | `kernel/` |
| Does it construct multiple features/adapters for runtime? | `composition/` |
| Is it part of the durable consumer API? | `facade/` and root `index.ts` |
| Is it test-only construction or a parity harness? | `testing/` or justified testing export |

Do not place feature-owned contracts in `kernel` merely because many files import
them. First ask whether those consumers need the structure or only a capability.
High fan-out is an ownership finding, not automatic proof of shared semantics.

## 4. Dependency direction and composition

Enforce this package-internal direction:

```text
consumer → index → facade → composition → feature adapters
                              │              │
                              └── kernel ────┘
```

Feature implementations may use feature-owned contracts, explicit peer capability
ports, package-wide kernel primitives, and approved lower-level package dependencies.
They must not import `composition`, `facade`, or `testing`. Apply this rule to every
feature file, including `adapters/` and colocated tests; excluding adapter folders
from an architecture scan hides the most consequential inversions.

The composite package store is a composition result, never a feature dependency.
Each feature adapter implements its own `store-contract.ts`; composition combines
those slices and alone may type-check the aggregate. A feature that needs another
capability receives a narrow port. It must not construct the aggregate store that
contains itself or reach upward through a composition factory.

A technology-named composition directory may contain aggregate construction and
coverage for that technology. It must not become a horizontal re-export barrel for
feature adapters. Put adapter-neutral helpers such as collision-checked slice
composition under `composition/store/` or another neutral composition owner so
memory does not depend on `drizzle`, or the reverse.

## 5. Kernel and facade boundary

Borrow these kernel properties without turning the whole ERP package into a
kernel:

1. One canonical registry composition validates uniqueness and references.
2. One root facade protects consumers from internal moves and adapter changes.
3. Projections derive from canonical feature definitions.
4. Historical input normalizes at ingress and never creates a second API.
5. Internal representation changes require zero production-consumer edits.
6. Architecture guards prevent duplicate interpretation and deep imports.

The kernel may own package-wide authorization resolution, event catalog
composition, emission rules, operation inventory, branded identity primitives,
temporal primitives, and validation mechanics. Feature statuses, schemas, guards,
store contracts, and business policies remain in their feature.

## 6. Deterministic refactor method

Use this order for a layer-first or hybrid cutover:

1. Inventory every source file, root export, auxiliary entrypoint, direct consumer,
   filesystem-reading test, and broad store/context use.
2. Freeze the root facade and classify compatibility. A structural internal
   refactor requires zero production-consumer changes.
3. Assign every file one semantic owner. Stop on ambiguous ownership; never use a
   generic `misc`, `common`, or `shared` destination.
4. Generate an explicit old-to-new manifest and reject destination collisions or
   overwrites before mutation.
5. Scaffold accepted `features`, `kernel`, `composition`, and `testing` roots.
6. Move files first. Do not mix semantic edits into the filesystem move.
7. Rewrite resolvable relative module imports from the manifest, computing paths
   from the old importer/target to the new importer/target.
8. Update filesystem-reading fixtures separately. Preserve `.ts` extensions for
   `readFileSync`; preserve directories for recursive scans instead of resolving
   them to `index.ts`.
9. Scan the rewritten import graph, including feature adapters, and reject every
   feature-to-composition edge and composite-store dependency.
10. Format only the bounded package, then run layout guard, typecheck, lint, focused
   architecture tests, full package tests, and affected-consumer checks.
11. Delete empty superseded roots and add deterministic guards forbidding their
    return.

Use scripts for collision checking, moves, and resolver-aware mechanical rewrites.
Do not use an unbounded regex across the repository, and do not treat a successful
codemod as semantic verification.

## 7. Failure lessons

The Human Resources cutover exposed reusable failure modes:

- Extensionless module imports and filesystem paths are different contracts.
  `readFileSync("x")` does not resolve `x.ts`.
- A directory path used by `readdirSync` must not be rewritten to its `index.ts`.
- Architecture tests that recursively scan a feature must classify colocated
  `adapters/` and `store-contract.ts` instead of assuming adapters live elsewhere.
- A test that skips `features/*/adapters` can report a clean boundary while a
  feature imports the complete composition root.
- Moving a broad store type into `composition/store` does not narrow it. If feature
  adapters still import that aggregate, the refactor is locational rather than
  semantic.
- A feature adapter that constructs the aggregate store creates an upward edge and
  can recursively couple the feature to the adapter set that contains it. Inject a
  narrow port from composition instead.
- A memory composer importing a helper from a `drizzle` folder reveals misplaced
  adapter-neutral ownership even when runtime tests pass.
- A composition `index.ts` that republishes every feature adapter recreates a
  horizontal adapter surface; export constructed capabilities instead.
- Moving only domain folders while retaining root schemas/stores/adapters produces
  a hybrid tree, not feature-first architecture.
- A root `shared/` removal requires tests to assert its absence, not recreate an
  empty directory to satisfy old fixtures.
- PowerShell bulk writes can change line endings; run the repository formatter
  after mechanical rewrites.
- Untracked destinations may appear as deletions in `git diff --stat`; use status
  and staged rename detection before judging whether content was lost.
- Run collision and overwrite checks before the first move so failure remains
  recoverable without reset/restore.

## 8. Human Resources exemplar

Living package: `packages/erp/human-resources`.

```text
src/
├── facade/
├── kernel/
├── composition/
├── features/
│   ├── workforce-records/
│   ├── organization/
│   ├── recruitment/
│   ├── hire-to-employee/
│   ├── employment-lifecycle/
│   ├── leave/
│   ├── compensation-benefits/
│   ├── performance/
│   ├── learning/
│   ├── talent/
│   ├── compliance/
│   ├── employee-relations/
│   ├── workforce-planning/
│   ├── time/
│   ├── payroll-handoff/
│   ├── privacy/
│   ├── reporting/
│   ├── bulk-import/
│   ├── bulk-export/
│   └── bulk-jobs/
└── testing/
```

Reference these artifacts when applying the method to another ERP module:

- `packages/erp/human-resources/README.md` — consumer surface and architecture.
- `packages/erp/human-resources/src/index.ts` — sole production facade export.
- `packages/erp/human-resources/src/facade/` — stable consumer capabilities.
- `packages/erp/human-resources/src/kernel/operations/` — canonical composed
  operation registry.
- `packages/erp/human-resources/src/features/time/` — large feature with nested
  attendance subfeature and colocated adapters.
- `packages/erp/human-resources/src/features/workforce-records/` — bounded
  subfeatures under one semantic owner.
- `packages/erp/human-resources/src/composition/store/` — justified aggregate
  store boundary.
- `packages/erp/human-resources/scripts/feature-first-layout.mjs` — deterministic
  migration and permanent root-layout guard.
- `packages/erp/human-resources/__tests__/public-kernel-cutover.test.ts` and
  capability-boundary tests — facade and narrow-capability enforcement.

These are structural references, not copy targets. A new ERP module must derive
its feature names and registries from its own business vocabulary.

## 9. Reuse checklist

```text
[ ] One permanent root business facade
[ ] Only justified horizontal surfaces at src root
[ ] One semantic owner per feature vocabulary
[ ] Uniform feature capsule dispositions
[ ] No root adapters/schemas/store/shared layers
[ ] Kernel composes; it does not absorb feature meaning
[ ] Narrow store and port capabilities per operation
[ ] No features/** import from composition, facade, or testing
[ ] Feature adapters implement feature store contracts, never the composite store
[ ] Composition exposes constructed capabilities, not a feature-adapter barrel
[ ] Adapter-neutral helpers have a neutral composition owner
[ ] Explicit old-to-new manifest with collision checks
[ ] Move first; resolver-aware rewrite second
[ ] Filesystem fixtures updated separately
[ ] Derived projections and aliases remain canonical
[ ] Architecture scans include colocated adapters and tests
[ ] Layout, facade, registry, adapter-parity, and consumer gates pass
[ ] Superseded paths deleted in the same cutover
```
