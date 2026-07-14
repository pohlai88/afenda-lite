# ARCH-025 Data Layer

| Field | Value |
|-------|-------|
| ID | ARCH-025 |
| Category | Architecture |
| Version | 1.3.0 |
| Status | Living |
| Control State | Closed |
| Owner | Backend |
| Updated | 2026-07-15 |

> **Living.** Data-layer SSOT after ARCH-028 Checkpoint G (2026-07-15). `@afenda/db` + `withOrg` on disk; baseline `0000` migrate remains banned on production Neon.

## Context

All product data lives in Neon Postgres. The data layer is owned by `@afenda/db`. It uses Drizzle ORM for schema definition, type generation, and migration management. This document describes the schema structure, the migration lifecycle, the query contract, and the **Drizzle decision**.

## Drizzle decision

**Decision:** Use **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) with **`@neondatabase/serverless`** as the transport. Schema in `packages/db/src/schema/`. `drizzle-kit generate` / `migrate`. `withOrg(orgId)` is the only authorised path to tenant-scoped reads.

| Positive | Accepted cost |
|----------|---------------|
| Types generated from schema — no hand-written row drift | No auto rollback migrations — forward-only |
| Versioned SQL migrations — auditable | Must run `generate` after every schema change |
| HTTP transport works on Vercel serverless (Edge only as documented exception) | Joins more verbose than Prisma `include` |
| `withOrg` makes tenancy hard to forget | |

| Alternative | Why rejected |
|-------------|--------------|
| Raw SQL via `pg` | No generated types; tenancy by convention; weak migration tooling |
| Prisma | Separate DSL; large client; slower Edge cold-start |
| Kysely | No built-in migrations — extra runner |
| TypeORM / MikroORM | Poor Edge fit / unnecessary complexity |

**Constraints that must not be broken:**

- Every tenant table includes `organization_id … NOT NULL` matching **shipped migrations** ([ARCH-023](ARCH-023-multi-tenancy.md) — `text` on `br-tiny-hill-ao82jp6f` / Neon Auth org ids)
- Tenant reads go through `withOrg(orgId)` — unscoped `db.select()` on tenant tables forbidden in app code
- Every schema change ships a Drizzle migration — no ad-hoc DDL in production
- Only `@afenda/db` imports `drizzle-orm` / `@neondatabase/serverless`
- Schema table names come from **Living tenant roots** (ARCH-023) or `drizzle-kit introspect` against `br-tiny-hill-ao82jp6f` — do not invent parallel table inventories

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
- Tenancy Decision lock or IAM permission catalogue (owned by [ARCH-023](ARCH-023-multi-tenancy.md))

## Components

### Schema — bounded context split

One Drizzle schema file per bounded context. Tables do not cross file boundaries. Prefer introspecting the live branch before the first Drizzle cutover ([ARCH-028](ARCH-028-implementation-slices.md) S2).

```
packages/db/src/schema/
├── platform.ts      ← organizations, users, platform RBAC tables
├── declarations.ts  ← Living roots: surveys, client_invitations,
│                      client_profiles, client_assignments
└── fft.ts           ← Living roots: fft_event, fft_sales_member,
                       fft_role, fft_role_assignment (+ fft.access entry)
```

Every tenant table includes `organizationId` mapped to `organization_id` **NOT NULL**, with column type matching shipped migrations (`text` today per live introspect / ARCH-023). Do not invent `declarations` / `fft_orders` table names that are not on the Living root inventory.

### Client

```typescript
// packages/db/src/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(env.DATABASE_URL)
export const db = drizzle(sql, { schema })
```

`@neondatabase/serverless` uses the HTTP transport — compatible with Vercel serverless. Edge runtime only when a documented exception allows it. Connection pooling is handled by the Neon pooler endpoint (`-pooler` suffix in `DATABASE_URL`).

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

This is the **only** authorised path to tenant-scoped reads (Target packaging of the Living hard `organization_id = $org` rule in ARCH-023). App code must not call `db.select()` directly on tenant tables.

## Data / request flow

### Migration lifecycle

```
1. Edit schema file (packages/db/src/schema/*.ts)
2. pnpm --filter @afenda/db db:generate
   → drizzle-kit generate → writes drizzle/<timestamp>_<name>.sql
3. Review generated SQL — never treat 0000_living-roots-baseline.sql as apply-to-live
4. Forward migrates only (see Operational ban) — guarded db:migrate; not the baseline CREATE
5. Commit schema file + migration file together
```

No ad-hoc `ALTER TABLE` in production. Every schema change goes through this lifecycle.

### Read path

```
RSC
 └── modules/declarations/domain/list.ts
       └── withOrg(schema.surveys, orgId)
             .orderBy(desc(schema.surveys.createdAt))
             .limit(20)
```

### Write path

```
Server Action
 └── modules/declarations/domain/create.ts
       └── db.insert(schema.surveys).values({ organizationId: orgId, ... })
```

Writes use `db` directly (not `withOrg`, which is select-only). The `organizationId` field is always required — TypeScript enforces this via the Drizzle schema type.

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Drizzle ORM over raw SQL, Prisma, Kysely | This doc § Drizzle decision |
| `@neondatabase/serverless` over `pg` | This doc § Drizzle decision |
| `withOrg` as the mandatory read entry point | [ARCH-023](ARCH-023-multi-tenancy.md) |
| Tenant table inventory / `organization_id` type | [ARCH-023](ARCH-023-multi-tenancy.md) (Living) |

## Failure modes

| Failure | Impact | Detection |
|---------|--------|-----------|
| `DATABASE_URL` missing or wrong | Startup Zod error from `@afenda/env` | App refuses to start |
| Migration applied to wrong branch | Schema mismatch | `drizzle-kit check` in CI |
| `organization_id` missing from new table | Potential cross-tenant leak | `pnpm audit:tenancy-nulls` |
| Neon pooler unavailable | All DB calls fail | Neon status page; app returns 500 |

## Operational considerations

- **Generate:** `pnpm --filter @afenda/db db:generate` after schema change.
- **Check:** `pnpm --filter @afenda/db db:check` verifies local migration journal consistency.
- **Introspect:** `pnpm --filter @afenda/db db:introspect` pulls current DB schema as Drizzle types (for cutover audit — reconcile to Living roots before committing as source of truth).
- Production branch: `br-tiny-hill-ao82jp6f`. PITR 7 days.

### Ban — `0000_living-roots-baseline` migrate

**`packages/db/drizzle/0000_living-roots-baseline.sql` is a journal baseline for forward diffs.** Applying it with `db:migrate` on `br-tiny-hill-ao82jp6f` would try `CREATE` on existing tables — **do not.**

| Control | Path |
|---------|------|
| Package guard | `packages/db/scripts/db-migrate-guard.mjs` (wired as `db:migrate`) |
| Cursor hook | `.cursor/hooks/no-drizzle-baseline-migrate.mjs` |
| Slice evidence | [ARCH-028](ARCH-028-implementation-slices.md) S2.2 Operational ban |

Default: `db:migrate` fails closed. Override `AFENDA_ALLOW_DB_MIGRATE=1` is only for a later **non-baseline** forward migration; the guard still refuses when `0000_…` is the sole SQL file.

## Known limits / future changes

- Drizzle does not support automatic rollback migrations. Rollback requires a new forward migration that reverts the change.
- If a second Postgres store is added (e.g., a read replica or separate analytics DB), a new `client-analytics.ts` is created alongside the existing client — not a new package.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.3.0 | 2026-07-15 | Checkpoint G: Status Target→Living; `@afenda/db` present; migrate ban unchanged. |
| 1.2.4 | 2026-07-14 | Operational ban: do not `db:migrate` `0000_living-roots-baseline` onto live Neon; package guard + Cursor hook. |
| 1.2.3 | 2026-07-14 | Reconcile `organization_id` column type to live `text` (Neon Auth org ids) after S2.1 introspect. |
| 1.2.2 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` in place of `npm run` / `npx` (repo SSOT `packageManager` + lockfile). |
| 1.2.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.0 | 2026-07-14 | Integrity remediation: schema inventory and `organization_id` type defer to ARCH-023 Living roots; Change Log restored; read/write examples use `surveys`. |
| 1.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.0.0 | 2026-07-13 | Initial Target data layer |
