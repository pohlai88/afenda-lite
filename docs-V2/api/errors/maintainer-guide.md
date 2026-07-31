# Error kernel maintainer guide

Before changing shared semantics:

1. Confirm the decision belongs to the canonical registry.
2. Count affected consumers and distinguish semantic change from internal
   representation change.
3. Change the registry or owning normalizer once.
4. Derive types and projections; do not add a parallel map.
5. Add contract and hostile-input evidence.
6. Run focused package gates.
7. Run both repository error gates.
8. Generate package documentation and OpenAPI.
9. Run repository lint, typecheck, and tests.
10. Refresh package protection last.

Commands:

```bash
pnpm --filter @afenda/errors lint
pnpm --filter @afenda/errors typecheck
pnpm --filter @afenda/errors test
pnpm check:errors-boundary
pnpm check:errors-semantics
pnpm --filter @afenda/docs generate:package-docs
pnpm openapi:generate
pnpm check:openapi
pnpm lint
pnpm typecheck
pnpm test
```

Do not add compatibility subpaths, deprecated facades, public constructors,
temporary adapters, or a second wire implementation. Historical input belongs
in the alias ledger and current consumers remain on the single root facade.
