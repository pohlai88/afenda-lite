# `@afenda/db` kernel contract

The canonical semantic owner for shared-schema database infrastructure is `packages/data-plane/db`. Runtime consumers use the single frozen `database` facade from `@afenda/db`.

## Permanent surface

- `database.client`: lazy typed Drizzle client.
- `database.transaction`: governed Neon HTTP transaction batch.
- `database.tenancy`: canonical predicates, full-table tenant reads, and the derived hard-tenant-root projection.
- `database.permissions`: permission definitions, derived codes and roles, validation, and reconciliation.
- Root schema tables, Drizzle operators, transaction types, and `PlatformPermissionCode` remain structural declarations required to compose typed SQL.
- `@afenda/db/module-manifest` remains the sole published subpath.

## Boundary

Consumers may compose typed, explicitly tenant-scoped SQL and invoke the facade. They must not deep-import DB internals or import the deleted runtime names `db`, `runNeonHttpTransaction`, `orgWhere`, `tenantEntityPredicate`, `withOrg`, permission registries/functions, or hard-tenant-root registries.

The permission code projection and tenant-root projections derive from their package-owned registries. Business mutation ownership stays with the package named in `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml`; this package is not a repository layer.

## Cutover enforcement

`pnpm check:db-boundary` rejects legacy named imports and unpublished subpaths. `pnpm test:db-boundary` proves the gate. DB lint, typecheck, tests, tenant SQL safety, module governance, and affected consumer typechecks provide behavioral evidence.
