# ARCH-025 Data Layer

| Field | Value |
|-------|-------|
| ID | ARCH-025 |
| Category | Architecture |
| Version | 1.1.0 |
| Status | Target |
| Owner | Backend |
| Updated | 2026-07-13 |

> **Forward-writing / Target.** Describes the intended Turborepo system. Authoritative for new work. Missing `apps/` or `packages/` on disk is expected until implementation.

## Context

All product data lives in Neon Postgres. The data layer is owned by `@afenda/db`. It uses Drizzle ORM for schema definition, type generation, and migration management. This document describes the schema structure, the migration lifecycle, the query contract, and the **Drizzle decision** (former ADR-011).

## Drizzle decision (from ADR-011)

**Decision:** Use **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) with **`@neondatabase/serverless`** as the transport. Schema in `packages/db/src/schema/`. `drizzle-kit generate` / `migrate`. `withOrg(orgId)` is the only authorised path to tenant-scoped reads.

| Positive | Accepted cost |
|----------|---------------|
| Types generated from schema — no hand-written row drift | No auto rollback migrations — forward-only |
| Versioned SQL migrations — auditable | Must run `generate` after every schema change |
| HTTP transport works on Vercel Edge/serverless | Joins more verbose than Prisma `include` |
| `withOrg` makes tenancy hard to forget | |

| Alternative | Why rejected |
|-------------|--------------|
| Raw SQL via `pg` | No generated types; tenancy by convention; weak migration tooling |
| Prisma | Separate DSL; large client; slower Edge cold-start |
| Kysely | No built-in migrations — extra runner |
| TypeORM / MikroORM | Poor Edge fit / unnecessary complexity |

**Constraints that must not be broken:**

- Every tenant table includes `organization_id … NOT NULL`
- Tenant reads go through `withOrg(orgId)` — unscoped `db.select()` on tenant tables forbidden in app code
- Every schema change ships a Drizzle migration — no ad-hoc DDL in production
- Only `@afenda/db` imports `drizzle-orm` / `@neondatabase/serverless`

Tenancy model: [ARCH-023](ARCH-023-multi-tenancy.md).

## Responsibilities and boundaries

`@afenda/db` owns:
- Schema definitions (TypeScript, in `src/schema/`)
- The Drizzle client instance (`src/client.ts`)
- The `withOrg(orgId)` tenancy helper
- All migration files (`drizzle/`)

`@afenda/db` does **not** own:
- Business rules or domain logic (those live in `apps/web/modules/*/domain`)
- Session or auth context (owned by `@afenda/auth`)
- HTTP request handling

## Components

### Schema — bounded context split

One Drizzle schema file per bounded context. Tables do not cross file boundaries.

```
packages/db/src/schema/
├── platform.ts      ← organizations, users, platform_roles, platform_permissions
├── declarations.ts  ← declarations, declaration_items, declaration_statuses
└── fft.ts           ← fft_orders, fft_items, fft_pickups, fft_access
```

Every tenant table in every file includes `organizationId: text('organization_id').notNull()`.

### Client

```typescript
// packages/db/src/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(env.DATABASE_URL)
export const db = drizzle(sql, { schema })
```

`@neondatabase/serverless` uses the HTTP transport — compatible with Vercel serverless and Edge runtimes. Connection pooling is handled by the Neon pooler endpoint (`-pooler` suffix in `DATABASE_URL`).

### `withOrg` — tenancy helper

```typescript
// packages/db/src/client.ts
import { eq } from 'drizzle-orm'

export function withOrg<T extends { organizationId: string }>(
  table: T,
  orgId: string,
) {
  return db.select().from(table).where(eq(table.organizationId, orgId))
}
```

This is the **only** authorised path to tenant-scoped reads. App code must not call `db.select()` directly on tenant tables.

## Data / request flow

### Migration lifecycle

```
1. Edit schema file (packages/db/src/schema/*.ts)
2. pnpm --filter @afenda/db db:generate
   → drizzle-kit generate → writes drizzle/<timestamp>_<name>.sql
3. Review generated SQL
4. pnpm --filter @afenda/db db:migrate
   → drizzle-kit migrate → applies to DATABASE_URL
5. Commit schema file + migration file together
```

No ad-hoc `ALTER TABLE` in production. Every schema change goes through this lifecycle.

### Read path

```
RSC
 └── modules/declarations/domain/list.ts
       └── withOrg(schema.declarations, orgId)
             .orderBy(desc(schema.declarations.createdAt))
             .limit(20)
```

### Write path

```
Server Action
 └── modules/declarations/domain/create.ts
       └── db.insert(schema.declarations).values({ organizationId: orgId, ... })
```

Writes use `db` directly (not `withOrg`, which is select-only). The `organizationId` field is always required — TypeScript enforces this via the Drizzle schema type.

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Drizzle ORM over raw SQL, Prisma, Kysely | This doc § Drizzle decision |
| `@neondatabase/serverless` over `pg` | This doc § Drizzle decision |
| `withOrg` as the mandatory read entry point | [ARCH-023](ARCH-023-multi-tenancy.md) |

## Failure modes

| Failure | Impact | Detection |
|---------|--------|-----------|
| `DATABASE_URL` missing or wrong | Startup Zod error from `@afenda/env` | App refuses to start |
| Migration applied to wrong branch | Schema mismatch | `drizzle-kit check` in CI |
| `organization_id` missing from new table | Potential cross-tenant leak | `npm run audit:tenancy-nulls` |
| Neon pooler unavailable | All DB calls fail | Neon status page; app returns 500 |

## Operational considerations

- **Generate:** `pnpm --filter @afenda/db db:generate` after schema change.
- **Migrate:** `pnpm --filter @afenda/db db:migrate` to apply to `DATABASE_URL`.
- **Check:** `pnpm --filter @afenda/db db:check` verifies local schema matches migration history.
- **Introspect:** `pnpm --filter @afenda/db db:introspect` pulls current DB schema as Drizzle types (for auditing only — do not commit introspected output as the schema source of truth).
- Production branch: `br-tiny-hill-ao82jp6f`. PITR 7 days.

## Known limits / future changes

- Drizzle does not support automatic rollback migrations. Rollback requires a new forward migration that reverts the change.
- If a second Postgres store is added (e.g., a read replica or separate analytics DB), a new `client-analytics.ts` is created alongside the existing client — not a new package.
