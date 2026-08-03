# `@afenda/db`

Rank-1 Platform database infrastructure for Afenda-Lite. It hosts the shared Drizzle schema and migration journal, exposes the lazy Neon HTTP client and tenant-predicate helpers, governs non-interactive transaction batches, and reconciles the platform permission catalog.

Use this package from server-side Platform and ERP adapters that need typed schema access. Afenda uses one shared PostgreSQL schema with organization-scoped rows: `organization_id` predicates are mandatory, and this package does not provide project-per-tenant or multi-database isolation.

`@afenda/db` is the schema and migration host, not a repository mega-package. Mutation ownership remains with the package that owns the table.

## Consume

Import runtime and schema APIs from the root barrel:

```ts
import {
  and,
  database,
  eq,
  platformRoleAssignment,
} from "@afenda/db";

const assignments = await database.tenancy.readAll(
  platformRoleAssignment,
  organizationId,
);

const assignment = await database.client
  .select()
  .from(platformRoleAssignment)
  .where(
    and(
      database.tenancy.where(
        platformRoleAssignment.organizationId,
        organizationId,
      ),
      eq(platformRoleAssignment.id, assignmentId),
    ),
  );
```

`database.tenancy.readAll(table, organizationId)` is a convenience for full-table tenant reads. Use `database.tenancy.where` or `database.tenancy.entity` when composing joins, entity lookups, updates, and deletes. Every organization-owned table participating in a statement still needs an explicit ownership predicate.

Empty organization IDs fail closed. The Neon SQL driver also rejects unowned raw statements that mention registered hard-tenant roots; this runtime policy complements rather than replaces explicit query predicates and repository checks.

## Connections and transactions

| Operation | `DATABASE_URL` requirement |
|-----------|----------------------------|
| Product `database.client` and `database.transaction` | Neon `-pooler` endpoint |
| Drizzle Kit generation, checks, and inspection | PostgreSQL endpoint; pooled or direct |
| Guarded migration execution | Direct endpoint; pooler prohibited |

All connection classes use `DATABASE_URL`; do not invent a second direct-URL product variable. Product configuration remains owned by `@afenda/env` and `.env.local`. This lower-layer package reads the process environment internally and must not import `@afenda/env`.

The product client is initialized lazily on first database access. For atomic multi-statement writes over Neon HTTP, `database.transaction` accepts a synchronous builder that returns a fixed query array. Statements execute in order and commit or roll back together; application code cannot branch on intermediate results. Use it inside the package that owns the mutation, keep every tenant predicate explicit, and prefer owning-package helpers—such as `@afenda/audit` transaction-write preparation—over hand-building shared infrastructure records.

## Schema ownership

| Surface | Location or owner |
|---------|-------------------|
| Schema barrel | [`src/schema/index.ts`](./src/schema/index.ts) |
| Platform schema | [`src/schema/platform.ts`](./src/schema/platform.ts) |
| ERP schemas | `src/schema/{master-data,sales,purchasing,inventory,receiving,fulfillment,receivables,payables,payments,accounting,payroll,human-resources,corporate-administration}.ts` |
| Drizzle configuration | [`drizzle.config.ts`](./drizzle.config.ts) |
| Generated SQL and migration journal | `drizzle/` |
| Hard-tenant root registry | [`src/hard-tenant-roots.ts`](./src/hard-tenant-roots.ts) |

Schema DDL and migrations live here. Business writes belong to their owning Platform or ERP packages; hosting a table does not grant `@afenda/db` mutation ownership.

## Migrations

Use the guarded migration workflow:

```bash
pnpm --filter @afenda/db db:generate
pnpm --filter @afenda/db db:check
pnpm --filter @afenda/db db:migration-status
pnpm --filter @afenda/db db:migrate
```

The canonical funnel is `db:generate` → `db:check` → operator-approved `db:migrate`. The migrate command requires `AFENDA_ALLOW_DB_MIGRATE=1` and a direct `DATABASE_URL`. A sole baseline or destructive migration requires its additional explicit guard flag. Do not use `db:push`, raw `drizzle-kit migrate`, ad hoc apply scripts, or Neon MCP DDL as alternate migration paths.

Additional operator commands:

| Command | Purpose |
|---------|---------|
| `db:sync-migration-ledger` | Reconcile the tracked migration ledger through the governed script |
| `db:verify-migrate-ban` | Verify migration bypass controls |
| `db:introspect` | Inspect a configured PostgreSQL database with Drizzle Kit |

## Permission catalog

The typed platform permission catalog and system role templates live in `src/platform-permission-catalog*`. Reconciliation atomically upserts current permissions, migrates grants, removes retired codes, and aligns role templates through one Neon HTTP transaction batch.

Catalog reconciliation is an explicit release operation, not part of baseline migration:

```bash
pnpm --filter @afenda/db db:ensure-permission-catalog
```

## Export surface

| Import path | Role |
|-------------|------|
| `@afenda/db` | Permanent `database` runtime facade; Drizzle operators; schema tables; transaction types; `PlatformPermissionCode` |
| `@afenda/db/module-manifest` | Type-only ERP module manifest contract |

See [`src/index.ts`](./src/index.ts) for the exact root barrel. Runtime consumers use `database.client`, `database.transaction`, `database.tenancy`, and `database.permissions`; the replaced named runtime exports are intentionally absent. Do not deep-import package internals.

## Maintain

Requires the repository engines: Node `24.x` and pnpm `>=10.33.4`.

```bash
pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test
```

Repository-level tenancy verification is available through `pnpm audit:tenancy-nulls`; its table inventory derives from the hard-tenant root registry.

## Boundaries

`@afenda/db` may depend on Neon and Drizzle infrastructure. It must not import `@afenda/auth`, `@afenda/env`, Surfaces, or `apps/*`, and it does not own Neon Auth sessions, HTTP or `ActionResult` adapters, UI, OpenAPI, or business repositories.

Do not add a second tenancy model, ambient organization stamping, ORM auto-interception, or cross-domain mutation services here.

## Authority

| Topic | Link |
|-------|------|
| Data plane package index | [packages/data-plane](../README.md) |
| Package DAG and layer rules | [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Test strategy | [testing](../../../testing/README.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
