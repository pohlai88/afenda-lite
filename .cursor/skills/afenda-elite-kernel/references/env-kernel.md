# `@afenda/env` kernel

Use this reference when changing `packages/foundation/env` or designing a
configuration registry whose runtime values must remain typed and isolated.

## Authority and permanent surface

| Field | Contract |
|-------|----------|
| Package | `@afenda/env` |
| Target | `packages/foundation/env` |
| Layer | Rank-1 foundation leaf; no `@afenda/*` runtime dependencies |
| Product facade | `env` from `@afenda/env` |
| Docs facade | `docsEnv` from `@afenda/env/docs` |
| Product registry | `src/product-registry.ts` |
| Docs registry | `src/docs-registry.ts` |
| Runtime projection | `src/runtime-projection.ts` |
| Integrity record | `.protected.sha256` |

The docs subpath is a deployment isolation boundary: importing product config
would eagerly validate Neon/product secrets that the docs site neither owns nor
may access. It is not a versioned or competing product facade.

## Invariants

1. Declare each variable and its validation schema once in its deployment
   registry.
2. Derive runtime reads from registry keys. Never recreate a manual
   `KEY: process.env.KEY` map.
3. Keep the product registry compile-time exhaustive with the governed
   classification ledger.
4. Derive local-only key sets from classification; do not maintain a second
   allowlist.
5. Read only registered keys into a frozen runtime projection. Unknown source
   keys, including secrets, must not be projected.
6. Keep cross-key policy inside `@afenda/env` refinements. Consumers receive
   typed values and must not interpret deployment classification or rebuild
   validation.
7. Keep `env` and `docsEnv` stable for internal representation changes. A
   registry refactor should require zero consumer edits.
8. Keep `.env.local` as the only local runtime file and `.env.example` as the
   committed key template without values.
9. Keep the package a runtime leaf; no database, auth, UI, or business logic.

## Upgrade method

1. Inventory schema declarations, runtime reads, classification maps,
   allowlists, documentation keys, and consumer imports.
2. Select the existing consumer facade before editing. Do not invent a new
   capability object when typed configuration values already form the stable
   contract.
3. Move schema definitions into the canonical registry and derive the strict
   runtime record from its keys.
4. Derive metadata subsets such as local-only keys from their classification
   owner.
5. Prove registry/classification parity, deployment isolation, frozen
   projections, and rejection of unregistered source keys.
6. Keep consumer code unchanged unless the public configuration contract
   deliberately changes.

Do not use a library's experimental automatic environment mode merely to avoid
a repeated map when a small owned projection can provide the same behavior with
an explicit stable contract.

## Verification

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/foundation/env
pnpm --filter @afenda/env lint
pnpm --filter @afenda/env typecheck
pnpm --filter @afenda/env test
pnpm run check:env-consumers
pnpm run test:env-consumers
```

Then typecheck the direct product and docs consumers affected by the inferred
types. Run consumers independently if a combined parallel invocation times out;
record the combined timeout as degraded execution, not `PASS`.

Run `protect:update` only after package, consumer, documentation, and boundary
evidence is final, then run `protect:check` and the final inspector snapshot.
