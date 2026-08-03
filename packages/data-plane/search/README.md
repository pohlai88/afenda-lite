# `@afenda/search`

Canonical tenant-scoped product-search kernel backed by PostgreSQL full-text search. It owns registered search entities, document validation, normalization, metadata filtering, ranking, stable ordering, and derived-projection lifecycle.

## Use

```ts
import { search } from "@afenda/search";

await search.documents.upsert({
  organizationId,
  entity: search.entities.masterData.party,
  documentId: party.id,
  title: party.name,
  description: party.code,
});

const results = await search.query({
  organizationId,
  query: "Acme",
  entity: search.entities.masterData.party,
});
```

Use `documents.upsertMany` for rebuilds, `documents.listIds` to identify stale projections, and `documents.delete` to prune them. Search rows are rebuildable projections; source domain records remain authoritative.

## Canonical semantics

- `SEARCH_ENTITY_REGISTRY` owns every allowed entity and its lifecycle/ranking policy.
- Input normalization applies Unicode NFKC, collapsed whitespace, nullable empty descriptions/URLs, and sensitive metadata removal.
- PostgreSQL weights title terms as A and descriptions as B.
- Queries use the registry-owned English dictionary and `ts_rank_cd`; score ties order by `documentId`.
- Every operation requires `organizationId`; consumers never receive a persistence store.
- Master-data derives its projection entity constants from `search.entities.masterData`.

## Testing capability

```ts
import { searchTesting } from "@afenda/search/testing";

const testSearch = searchTesting.createMemory();
```

`./testing` remains an authorized test-only subpath because consumers need deterministic isolated search behavior. It now returns the durable `SearchCapability`; the concrete memory store and store injection are private. Repository checks reject production imports of this subpath.

## Public contract

| Export | Role |
|---|---|
| `@afenda/search` | Server-only `search` capability and durable document/result types |
| `@afenda/search/testing` | Test-only `searchTesting.createMemory()` capability |

Deleted public surfaces include standalone upsert/query/list/delete functions, Drizzle constructors/classes, `SearchStore`, metadata sanitizers, and the concrete memory store. See [CONTRACT.md](./CONTRACT.md).

## Verify

```bash
pnpm --filter @afenda/search lint
pnpm --filter @afenda/search typecheck
pnpm --filter @afenda/search typecheck:contract
pnpm --filter @afenda/search test
pnpm check:search-boundary
pnpm test:search-boundary
```

No Next.js, docs Orama, external search SaaS, application imports, or direct consumer access to `platform_search_document` belongs here. Runtime workspace dependencies remain `@afenda/db` and `@afenda/errors`.

Authority: [AGENTS.md](../../../AGENTS.md).
