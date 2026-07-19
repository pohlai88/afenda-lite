# Product search (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/search/README.md` |
| Authority | **Scratch** — `@afenda/search` · `@afenda/db` `platform_search_document` |
| Purpose | Free Custom Neon Postgres FTS for product; docs Orama stays separate |
| Updated | 2026-07-20 |

## Split

| Surface | Engine | Package / app |
|---------|--------|---------------|
| Official docs | Orama (bundled Fumadocs) | `@afenda/docs` — [../docs/search-orama.md](../docs/search-orama.md) |
| Product index | Postgres FTS | `@afenda/search` → `platform_search_document` |

## First product consumer

| Field | Value |
|-------|-------|
| Surface | Org-admin Assign-role Combobox on `/admin` |
| Entity | `member` (`documentId` = Neon Auth `userId`) |
| Sync | `syncOrganizationMemberSearchIndex` from Identity on member-directory load |
| Query | `searchOrgMembersAction` → `searchOrganizationMembers` → `searchDocuments` |

## Must not

- Algolia · Orama Cloud · Mixedbread (paid)
- Meilisearch / Typesense / FlexSearch SDKs in `@afenda/search`
- Dual-write `platform_search_document` outside `@afenda/search`
- Treat docs Orama as product search SSOT

## Verify

```bash
pnpm --filter @afenda/search typecheck
pnpm --filter @afenda/search test
pnpm audit:tenancy-nulls
```

DAG: [../monorepo/README.md](../monorepo/README.md). Tenancy: [../data/README.md](../data/README.md).
