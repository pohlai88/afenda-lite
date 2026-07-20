# `@afenda/search`

Rank-1 Platform product search for Afenda-Lite: org-scoped Postgres full-text search over `platform_search_document`. Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, or Action envelopes.

**Not docs search.** Official docs stay on bundled Orama in `@afenda/docs` ([`docs-V2/docs/search-orama.md`](../../docs-V2/docs/search-orama.md)). Do not wire Algolia, Orama Cloud, Mixedbread, Typesense, Meilisearch, or FlexSearch here.

Use this package from Platform / app server code when a domain entity must be upserted into the shared search index and queried with a hard `organizationId` predicate. Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import from the root barrel:

```ts
import {
  upsertSearchDocument,
  listSearchDocumentIds,
  searchDocuments,
} from "@afenda/search";

const write = await upsertSearchDocument({
  organizationId,
  entity: "member",
  documentId,
  title: "Ada Lovelace",
  description: "Org member",
  url: `/org/members/${documentId}`,
});
if (!write.ok) {
  // map Result at the adapter — do not invent { success, data }
}

const hits = await searchDocuments({
  organizationId,
  query: "ada",
  limit: 20,
});
```

Pass request-scoped `organizationId` on every write and search. Never stamp ambient org. Never index secrets (sensitive metadata keys are stripped before persist).

## Store

| Surface | Backend |
|---------|---------|
| Production default | `DrizzleSearchStore` → `platform_search_document` via `@afenda/db` |
| Vitest injection | helpers pass `store` into upsert / search / delete |

Every read/write predicates `organization_id`. Ranking uses `ts_rank` against `plainto_tsquery('english', …)`.

## Maintain

```bash
pnpm --filter @afenda/search lint
pnpm --filter @afenda/search typecheck
pnpm --filter @afenda/search test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/search` | Store factories, upsert / delete / batch, `listSearchDocumentIds`, `searchDocuments`, schemas, types |

## Out of scope

Do not add to this package: Next.js / Surfaces / `apps/*` imports, dual-write of `platform_search_document` from `apps/web`, paid search SaaS / second search SDKs, or ambient org stamping (always pass `organizationId`). Shared schema · hard `organization_id` only — never multi-DB / project-per-tenant isolation. Docs search stays Orama in `@afenda/docs`.

## Authority

| Topic | Link |
|-------|------|
| Product search Scratch | [docs-V2/search](../../docs-V2/search/README.md) |
| Docs Orama (not this package) | [docs-V2/docs/search-orama.md](../../docs-V2/docs/search-orama.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../docs-V2/tenancy/README.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
