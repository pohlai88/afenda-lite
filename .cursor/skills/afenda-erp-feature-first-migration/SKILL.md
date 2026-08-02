---
name: afenda-erp-feature-first-migration
description: >
  Guide and conduct the migration of any packages/erp/<module> package from
  historical-root layout (monolithic drizzle-store.ts/memory-store.ts + root
  layer files) to the canonical feature-first + registry-first architecture,
  with zero public-API drift and doctor-gated verification. Use this skill
  whenever the user asks to migrate, refactor, restructure, standardize, or
  "feature-first" an ERP package; mentions splitting a root store, adding an
  operation registry, deriving a module manifest, wave W1/W2/W3/W4 work, or
  converging packages/erp to the payroll/human-resources pattern — even if
  they only name the package (e.g. "do payables next"). Also use it to audit
  how far a package has drifted from the standard.
disable-model-invocation: false
---

# Afenda — ERP feature-first migration

Migrates one `packages/erp/<module>` package at a time to the repo standard:
**feature-first layout** (payroll exemplar) + **registry-first semantics**
(human-resources exemplar). Proven end-to-end on `payments` (W0 + W0.5).

**Why this exists:** the flat packages hand-maintain the same facts in 3–5
places (manifest strings, permission catalogs, ops code, stores). Drift is
invisible until production. Feature capsules + a fail-closed operation
registry make every omission either a compile error, a thrown duplicate, or
a red test — that is the entire point; layout is only the vehicle.

**Two modes — pick one per package with the user before starting:**

- **Mode A — Migrate (verbatim):** existing behavior is trusted; SQL and
  domain logic are *extracted*, never rewritten. Defects found along the way
  are recorded as findings, not fixed. Right for packages with proven
  behavior or parity suites (master-data).
- **Mode B — Rebuild behind the frozen facade:** existing internals are
  scaffold-grade (audit found behavioral defects: missing authorization,
  non-atomic commits, drizzle/memory asymmetry). Throw the internals away and
  reimplement each capsule to the payroll/payments standard — atomic
  state+audit+outbox SQL, permission enforced on every operation, paired
  adapters — while the public doorway stays untouched. Every behavior change
  is deliberate and listed in the report (fixes, not drift). Existing tests
  are updated intentionally where they encoded the defective behavior.

**Non-negotiable invariants in BOTH modes (violating any = failed run):**

1. **Public API frozen.** Consumers import only the root facade. `src/index.ts`
   export names must be byte-identical before/after (snapshot + diff, below).
   `package.json` `exports` **keys** never change — only their targets move.
   Manifest operation ids, permission codes, and event ids are part of the
   frozen surface (platform seeds and registers depend on them).
2. **Behavior discipline per mode.** Mode A: verbatim, semantic changes out
   of scope. Mode B: changes allowed but each one named in the final report
   with its defect justification — silent divergence is failure in both modes.
3. **No consumer edits.** apps/web and sibling packages compile untouched.
4. **Features never import** `composition/`, `facade/`, or `testing/`.
   Cross-feature needs are met by kernel primitives or narrow capabilities
   injected at composition (e.g. payments injects `getPaymentById` into the
   instructions drizzle slice).
5. **No `shared/` dumps.** Every file gets one named feature or kernel owner.
   Ambiguous ownership = stop and ask; high fan-out is an ownership finding.

## Target shape

`src/` roots exactly: `index.ts, features/, kernel/, composition/, facade/, testing/`.

- **features/<f>/** — `<f>.schema.ts` (zod) · `<f>.store.ts` (narrow port) ·
  `<f>.drizzle.ts` + `<f>.memory.ts` (paired adapters) · `<f>.operations.ts`
  (parse → permit → store call) · `operation-registry.ts` (declarations)
- **kernel/** — `contracts/` (shared domain types — Payment-style mutually
  referential types live here, payroll's projected-types precedent),
  `execution/` (permissions, authorization port), `validation/` (zod
  primitives, parse helper), `operations/` (define-registry + composed
  registry + projections), `emissions/` (aggregates, mutation tables), money.
- **composition/** — `store/contract.ts` (composite = intersection of slice
  ports), `store/compose-slices.ts` (duplicate-method-safe merge),
  `store/resolve-store.ts` (cached drizzle default), `adapters/drizzle.ts`,
  `module.manifest.ts` (**a projection, not a source** — spreads
  `[...IDS]` / `AUTHORIZATION` from the registry), CLIs if any.
- **facade/** — public wrappers with original signatures; `contracts.ts`
  for `<Module>CommandOptions`.
- **testing/** — memory store composition (drizzle ships, memory is
  test-only; keep an existing `./testing` exports subpath byte-stable).

Copy per package (each package owns its copy — no shared runtime package):
`compose-slices.ts`, the export-surface test, the registry-projection test.
Templates and the full payments worked example: [reference.md](reference.md).

## Procedure

Work from repo root. Read [reference.md](reference.md) before the first
package in a session; it holds templates, the file-mapping method, and the
pitfall catalog.

1. **Snapshot the public surface** (before touching anything):
   run the TS export-lister from reference.md §1 against `src/index.ts`;
   save the sorted name list. Also record `package.json` exports keys and
   grep consumers: `grep -rhoE "from \"@afenda/<m>[^\"]*\"" apps packages`
   — confirms root-facade-only reality and any live subpaths.
2. **Semantic inventory + completeness matrix** from
   `composition/module.manifest.ts` (operation ids, permissions, mutation
   tables, events) mapped onto existing code. Empty cells are findings —
   record them; they are the omission report the user wants.
3. **Carve features by aggregate**, not by verb. Keep all writers of one
   table family in one capsule (payments kept transfer/refund inside
   payment-lifecycle because they write payment rows). 3–5 capsules for a
   small package; do not fragment.
4. **Split the stores verbatim.** Class methods become slice objects
   (drizzle) or state-taking factories (memory). Shared memory state is a
   plain object; each feature's memory file declares only the *structural
   subset* it needs, so testing/ can compose one state object without
   features importing testing. Mappers/helpers move with their owning slice.
5. **Registry-first (step the generator can't do for you):** per-feature
   `operation-registry.ts` via the package's `define*Registry` (fail-closed:
   key≠publicName, duplicate id, duplicate publicName all throw); kernel
   composes and projects ids + authorization; **rewrite the manifest to
   spread the projections**. Where code enforces more permissions than the
   manifest declares, model it as `permission` (manifest) +
   `additionalPermissions` (code) — make drift explicit, don't change
   behavior.
6. **Facade + index.** Move command bodies into feature operations taking
   `{ store: <Slice>, authorization }` deps; facade wraps with original
   signatures resolving the store; `index.ts` becomes pure re-exports with
   `import "server-only"` first.
7. **Guards.** Add the export-surface test (root allowlist + frozen runtime
   export names) and the registry-projection test (pinned reviewed fixture
   of the authorization maps). Update any test importing deleted paths
   (`../src/model` → new homes).
8. **Delete** emptied root files; retarget `exports` values and scripts
   (e.g. `reconcile` CLIs) to their new paths.

## Gates (all must pass; run in this order)

```bash
pnpm --filter @afenda/<m> lint       # expect the pitfall trio — see reference.md §5
pnpm --filter @afenda/<m> typecheck
pnpm --filter @afenda/<m> test
# export-surface diff: after-list must equal the step-1 snapshot exactly
pnpm validate:modules                # register drift? → pnpm validate:modules:write
                                     # (order-only changes in *.generated.yaml are sanctioned)
pnpm --filter @afenda/web typecheck  # proves zero consumer edits
pnpm gen:doctor:erp                  # package line flips to |feature-first|, root-stores=0
pnpm generator:check                 # 0 issues, 0 blocked
```

`AFG-ERP-104` (upward-imports) fires on the exemplars too — it is **not** a
success criterion. `AFG-ERP-201` (projection lock) is closed at program end
via `pnpm turbo gen erp-generator-reconcile-projection-locks`, not per package.

## Per-package sizing notes

- **Flat small (accounting, payables, payments…):** full recipe, one sitting.
- **`shared/` dirs (fulfillment, receivables, purchasing…):** dissolve with
  named owners; unmapped file = stop and decide.
- **sales:** its `capabilities/` dirs are empty shells — delete them, build
  real `features/` from root files + `adapters/drizzle/store.ts`.
- **master-data (47k LOC):** `git mv src/capabilities src/features` first
  (dirs are already capsule-shaped), then split the 5,730-line root
  drizzle-store one feature at a time, **committing per feature**, with the
  parity suites (`pnpm test:master-data:parity`, `:core`, `:memory`) green
  at every sub-step.

## Findings protocol

Never *silently* change semantics. In Mode A, findings (unused permissions,
unregistered operations, missing authorization, non-atomic commits) are
recorded and surfaced, not fixed. In Mode B, behavioral defects become the
rebuild's explicit fix list — but governance-surface changes (permission
catalogs, manifest ids, event ids) still have blast radius beyond the
package (platform seeds, registers, docs) and remain frozen in both modes;
propose those separately.

Audit-first rule: when the user hasn't chosen a mode, run the drift audit
(root files, store atomicity, per-operation authorization, adapter
symmetry) and recommend: behavioral defects found → Mode B; behavior clean
or parity-protected → Mode A.

## Done means

Gates green + matrix delivered (complete or with explicit findings) + diff
reviewed for intentional deletions only. Report faithfully: name what was
extracted verbatim, what findings remain, and what was NOT done.
