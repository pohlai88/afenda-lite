# `@afenda/db` kernel

Use this reference when changing `packages/data-plane/db` or a consumer of its shared-schema runtime capabilities.

## Authority and permanent surface

| Field | Contract |
|-------|----------|
| Package | `@afenda/db` |
| Target | `packages/data-plane/db` |
| Layer | Rank-1 data-plane schema and migration host |
| Runtime facade | `database` from `@afenda/db` |
| Structural declarations | Root Drizzle operators, schema tables, transaction types, `PlatformPermissionCode` |
| Published subpath | `@afenda/db/module-manifest` only |
| Tenant registry | `src/hard-tenant-roots.ts` |
| Permission registry | `src/platform-permission-catalog.ts` |
| Business write owners | `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml` |

## Invariants

1. Runtime consumers call `database.client`, `database.transaction`, `database.tenancy`, or `database.permissions`; do not multiply named runtime exports.
2. Keep schema tables and Drizzle operators as structural root declarations because owning packages must compose typed SQL.
3. Derive permission codes, role templates, validation, and reconciliation from the canonical permission registry.
4. Derive hard-tenant names, table objects, and executable tenancy audit inputs from the canonical tenant-root registry.
5. Every tenant-owned statement remains explicitly organization-scoped. The guarded driver and repository scanner complement explicit predicates; neither replaces them.
6. Keep transaction builders synchronous and fixed-batch. Intermediate results cannot control later statements.
7. `@afenda/db` hosts schema and migrations but does not acquire business mutation ownership. Domain packages named by the schema ownership manifest retain their ports and adapters.
8. Keep product configuration owned by `@afenda/env`; DB may read `DATABASE_URL` internally to preserve the dependency rank and must not import higher layers.
9. Never publish implementation subpaths or retain the deleted named runtime exports as compatibility paths.
10. A schema migration is a separate operator-controlled capability. A facade refactor must not generate or apply SQL unless the mission explicitly names a schema change.

## Cutover method

1. Inventory root imports, subpaths, schema-table consumers, transaction calls, tenancy predicates, permission catalog use, and hard-root projections.
2. Freeze `database` as the one runtime facade while retaining only structurally necessary root declarations.
3. Codemod symbol-bound references to the facade, preserving local aliases to avoid collisions with consumer variables named `database`.
4. Update source-evidence tests to assert the capability call shape rather than deleted implementation names.
5. Delete replaced root exports in the same cutover and add a repository boundary gate forbidding their return.
6. Run DB package gates, boundary tests, tenant SQL safety, tenancy audit tests, module governance, and affected consumer typechecks.
7. Do not run `db:migrate`, change production data, or claim a schema cutover when no DDL changed.

## Verification

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/data-plane/db
pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test
pnpm check:db-boundary
pnpm test:db-boundary
pnpm check:tenant-sql-safety
pnpm test:tenant-sql-safety
pnpm validate:modules
pnpm typecheck
```

Run `pnpm audit:tenancy-nulls` only when configured database access is intentionally in scope; it is an operational database audit, not a substitute for deterministic registry and SQL-safety tests.
