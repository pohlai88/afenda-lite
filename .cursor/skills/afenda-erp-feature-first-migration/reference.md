# ERP feature-first migration — reference

Companion to [SKILL.md](SKILL.md). Sections: §1 surface snapshot · §2 file
mapping method · §3 copy-in templates · §4 payments worked example ·
§5 pitfall catalog · §6 program context.

## §1 Public-surface snapshot (run before and after)

Write to a temp file at repo root (module resolution needs repo
node_modules), run with `pnpm exec tsx`, delete after:

```ts
import ts from "typescript";
const file = process.argv[2];
const program = ts.createProgram([file], {
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext,
	allowImportingTsExtensions: true, noEmit: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(file);
if (!source) throw new Error("no source");
const symbol = checker.getSymbolAtLocation(source);
if (!symbol) throw new Error("no module symbol");
console.log(JSON.stringify(
	checker.getExportsOfModule(symbol).map((s) => s.getName()).sort()));
```

Diff after-list against before-list: **missing must be `[]`**. Additions are
allowed only if deliberate and reported. (Do not `import()` the package at
runtime to list exports — `server-only` throws outside Next.)

## §2 File-mapping method

Classify every `src/*.ts` root file into exactly one destination:

| Root file pattern | Destination |
|---|---|
| `model.ts` / `types.ts` (mutually-referential domain types, enums) | `kernel/contracts/domain.ts` |
| effects/event-port types | `kernel/contracts/effects.ts` |
| `permissions.ts` | `kernel/execution/permissions.ts` (verbatim) |
| `authorization.ts` (port + require helper) | `kernel/execution/authorization.ts` |
| zod primitives shared across features (`identity`, `mutation`, `money`…) | `kernel/validation/common.schema.ts` |
| parse/normalize helpers (often inline in old index.ts) | `kernel/validation/parse-input.ts` |
| decimal/money math used by memory adapters | `kernel/money.ts` |
| `brands.ts`, `pagination.ts`, `module-ids.ts`, `command-options.ts` | `kernel/` (contracts or execution by role) |
| `schemas.ts` | split per feature → `features/<f>/<f>.schema.ts` |
| store interface (in model.ts or `ports.ts`) | split per feature → `<f>.store.ts`; composite = intersection in `composition/store/contract.ts` |
| `drizzle-store.ts` / `memory-store.ts` | split per feature → `<f>.drizzle.ts` / `<f>.memory.ts` |
| command bodies (often in old `index.ts`) | `features/<f>/<f>.operations.ts` + thin `facade/capabilities.ts` wrappers |
| `resolve-store.ts` | `composition/store/resolve-store.ts` |
| `reconcile.ts`-style pure diagnostics | `features/reconciliation/` (pure fn) + `composition/<x>-cli.ts` (needs drizzle) |
| `production-ports.ts` | `composition/production/ports.ts` |
| root `adapters/<x>/index.ts` re-export shims | delete; retarget the `exports` value |

Feature boundaries follow **aggregates** (manifest `owns.aggregates` +
`mutationTables`). All writers of one table family share a capsule.

Store split mechanics:

- **Drizzle class → slice objects.** `this.getById` internal reuse becomes a
  module-level `getById` function referenced by the slice; `reload` keeps
  calling it. A slice needing another slice's read (availability → payment
  read) becomes a factory taking `deps: { getPaymentById }`, wired in
  `composition/adapters/drizzle.ts`.
- **Memory class → state-taking factories.** One plain state object
  (`{ payments: Map, accounts: Map, mutationKeys: Map }`) created in
  `testing/memory-store.ts`. Each `<f>.memory.ts` declares its own
  *structural* state interface covering only the maps it touches —
  TypeScript structural typing lets testing/ compose one object satisfying
  all, and features never import testing/. Tiny helpers (`find`,
  `idempotent`) may be duplicated per slice (~10 lines) — ownership beats DRY.

## §3 Copy-in templates (each package owns its copy)

### compose-slices (rename the error message per module)

```ts
type UnionToIntersection<T> = (
	T extends unknown ? (value: T) => void : never
) extends (value: infer I) => void ? I : never;

export function composeStoreSlices<const T extends readonly object[]>(
	...slices: T
): UnionToIntersection<T[number]> {
	const result: Record<string, unknown> = {};
	for (const slice of slices) {
		for (const [methodName, implementation] of Object.entries(slice)) {
			if (Object.hasOwn(result, methodName)) {
				throw new Error(`Duplicate <Module> store method: ${methodName}`);
			}
			result[methodName] = implementation;
		}
	}
	return result as UnionToIntersection<T[number]>;
}
```

### Operation registry kernel (types + define/compose/project)

Model on `packages/erp/payments/src/kernel/operations/{types,define-registry,registry}.ts`:

- Declaration: `{ id: \`<m>.\${string}\`, kind, owner: <feature-id union>,
  permission, additionalPermissions?, publicName }`.
- `define<M>OperationRegistry` throws on key≠publicName, duplicate id,
  duplicate publicName. `compose…` re-checks across features.
- Projections: `project…OperationIds` (ids array),
  `project…Authorization` (`Record<id, permission>` via
  `as Readonly<Record<TDef["id"], TDef["permission"]>>` — keeps the literal
  types the manifest's `as const satisfies` needs).

### Manifest as projection

```ts
owns: { aggregates: [...<M>_AGGREGATES], commands: [...<M>_COMMAND_IDS], … },
persistence: { mutationTables: [...<M>_MUTATION_TABLES], … },
permissions: { codes: [...<M>_PERMISSION_CODES], … },
authorization: { commands: <M>_COMMAND_AUTHORIZATION, queries: <M>_QUERY_AUTHORIZATION },
```

Hand-written remains: identity fields, `events.emits`, dependencies.

### Export-surface guard test

`__tests__/export-surface.test.ts`: (a) `readdirSync(src)` equals the
allowlist `[composition, facade, features, index.ts, kernel, testing]`;
(b) `Object.keys(await import("../src/index"))` contains every frozen
**runtime** export name (types aren't runtime keys — pin values only).

### Registry-projection guard test

`__tests__/registry-projection.test.ts` pins the **reviewed** authorization
maps as literal fixtures and asserts: manifest command/query authz deep-equal
the fixture; `owns.commands/queries` equal fixture keys as sets; every
registry `permission` + `additionalPermissions` ∈ the permission catalog;
ids unique with a named owner. The fixture is the drift lock — edits to it
are deliberate review events (HR's serialize-fixture principle).

## §4 Worked example — payments (reference migration)

Smallest complete instance of both layout + registry. Study these paths:

- 4 capsules: `payment-accounts` (1 cmd/1 qry) · `payment-lifecycle`
  (5 cmd/2 qry — includes transfer + refund: payment-row writers) ·
  `application-instructions` (3 cmd/1 qry) · `reconciliation` (pure).
- Cross-slice capability injection:
  `features/application-instructions/instructions.drizzle.ts` →
  `createDrizzleApplicationInstructionMethods({ getPaymentById })`.
- Explicit permission drift modeling:
  `features/payment-lifecycle/operation-registry.ts` — transfer/refund carry
  `permission` (manifest) + `additionalPermissions` (code-enforced create).
- Subpath retargeting: `./adapters/drizzle` key kept, value →
  `./src/composition/adapters/drizzle.ts`; `DrizzlePaymentsStore` /
  `MemoryPaymentsStore` became **type aliases + factories** (classes had zero
  consumers — verify with repo grep before doing the same).

Findings that stay findings (do not auto-fix): unused
`payments.payment.update` permission; `reconcilePayments` exported but not a
manifest operation (offline diagnostic, kept out of the registry by design).

## §5 Pitfall catalog (each cost real time once)

1. **Biome trio** on freshly written files — fix by construction:
   - `useAwait`: facade wrappers that only `return op(...)` must not be
     `async` (return type stays `Promise<…>`).
   - `noUnsafeDeclarationMerging`: never `interface X extends Store {}` +
     `class X {}`. Export `type X = Store` + `createX(): X` factory instead
     (only after confirming zero `new X()` consumers repo-wide).
   - `noExcessiveCognitiveComplexity`: long guard chains inside store
     methods → extract a `validate…()` helper returning `Result<void>`.
   Always finish with `pnpm exec biome check --write .` then a clean check.
2. **Register order sensitivity**: `docs-V2/modules/*-REGISTER.generated.yaml`
   preserves per-module command order. Registry composition order becomes
   canonical → run `pnpm validate:modules:write` once; order-only diffs in
   `.generated.yaml` are sanctioned; id/permission set changes are NOT.
3. **Old test imports** of `../src/model` / `../src/reconcile` break —
   retarget to `../src` (if publicly exported) or the new internal home.
4. **`exports` values vs keys**: keys frozen; a key's target file may move.
   Root `src/adapters/` and `src/testing/index.ts` shims are common targets.
5. **Scripts referencing moved files**: package.json `reconcile`-style CLIs,
   and repo scripts (`scripts/check-env-consumers.mjs` pins some
   `reconcile-cli.ts` paths — check before moving inventory/receivables CLIs).
6. **Don't runtime-import the package** to inspect exports (`server-only`).
   Use the TS checker script (§1).
7. **kebab-case everywhere** (dirs + files) — generator naming policy.
8. **Manifest `satisfies` breaks** if projections lose literal types — use
   the `as Readonly<Record<TDef["id"], …>>` projection pattern (§3).

## §6 Program context

- Wave order: W1 payables→accounting→fulfillment→receivables · W2
  purchasing→receiving→inventory · W3 sales · W4 master-data
  (feature-at-a-time, parity-gated) · W5 closure (projection locks via
  `pnpm turbo gen erp-generator-reconcile-projection-locks`; remove the three
  superseded `scripts/feature-first-layout.mjs`; final doctor
  `historical-root=0, feature-first=13`).
- Generator governance is **local-only by contract** (G15/G17): never wire
  these checks into CI. `g18` (generator authoritative over
  registry→manifest projections) is authored only after all packages
  converge.
- Doctrine SSOT: `packages/erp/ERP-SCAFFOLDING.md` · exemplars:
  `packages/erp/payroll` (layout/composition), `packages/erp/human-resources`
  (registry), `packages/erp/payments` (complete reference migration).
