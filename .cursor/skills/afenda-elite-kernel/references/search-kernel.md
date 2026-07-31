# `@afenda/search` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/search` |
| Target | `packages/data-plane/search` |
| Kind | Rank-1 data-plane semantic kernel |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `search`; isolated `/testing` capability |

## Ownership

Search owns product search-document entities, validation, normalization, sensitive metadata filtering, PostgreSQL vector construction, ranking weights/dictionary/method, deterministic ordering, and derived-projection lifecycle. DB owns the structural table. Errors owns failures. Domain packages own source facts and decide when their authoritative lifecycle requires upsert, rebuild, or deletion; they do not interpret search mechanics.

## Cutover rules

- Register entity names once; producers select `search.entities` values and never invent strings.
- Normalize NFKC and whitespace, nullable empty text/URLs, and sensitive metadata before persistence.
- Keep ranking policy in the registry and apply it consistently to PostgreSQL and memory tests.
- Use weighted vectors (title A, description B), the canonical dictionary/rank method, and a stable tie-break.
- Expose one root `search` capability; delete standalone operations, stores, Drizzle constructors/classes, sanitizers, and operational subpaths.
- Accept `SearchCapability` for test/composition injection, never a persistence store.
- Retain `/testing` only as `searchTesting.createMemory()` returning the durable capability. Never export the memory class.
- Reject production `/testing` imports, direct table access, consumer entity literals, ranking interpretation, unauthorized subpaths, and deleted surfaces with mutation-tested checks.
- Treat rows as derived projections; source packages remain authoritative and rebuild/prune through capabilities.
- Add historical entity aliases only as ingress normalization data, never new construction values.

## Verification

```bash
pnpm --filter @afenda/search lint
pnpm --filter @afenda/search typecheck
pnpm --filter @afenda/search typecheck:contract
pnpm --filter @afenda/search test
pnpm check:search-boundary
pnpm test:search-boundary
pnpm --filter @afenda/master-data typecheck
```

At seal, record entity-registry parity, normalization and sensitive-data tests, PostgreSQL/memory ranking parity, exact consumers, test-subpath isolation, boundary mutations, digest, and dirty-worktree posture.
