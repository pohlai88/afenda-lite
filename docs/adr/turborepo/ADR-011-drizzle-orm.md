# ADR-011 Drizzle ORM

| Field | Value |
|-------|-------|
| ID | ADR-011 |
| Category | ADR |
| Version | 1.1.0 |
| Status | Accepted |
| Owner | Backend |
| Updated | 2026-07-13 |

> **Forward-writing.** Accepted target decision for the Turborepo rebuild. Ignore legacy flat-monolith residue.


## Decision Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Deciders** | Platform / Backend |
| **Scope** | Database access layer in `@afenda/db` |

## Context

We store relational, multi-tenant data in Neon Postgres. The data access layer must produce TypeScript types from the schema (no hand-written row interfaces), track schema changes through versioned migration files, and enforce the `organization_id` tenancy predicate at the package boundary rather than by caller convention. We also target Vercel's serverless and Edge runtimes, which require HTTP-compatible Postgres clients — native TCP drivers do not work on Edge.

## Decision

Use **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) with **`@neondatabase/serverless`** as the transport.

Schema is defined in TypeScript in `packages/db/src/schema/`. `drizzle-kit generate` produces SQL migration files. `drizzle-kit migrate` applies them. The `withOrg(orgId)` helper in `@afenda/db` is the only authorised path to tenant-scoped reads.

## Consequences

### Positive

- TypeScript types are generated from the schema — no drift between schema and application types
- Migration files are version-controlled SQL — auditable, reviewable, and reversible via a new forward migration
- `@neondatabase/serverless` HTTP transport works on Vercel Edge and serverless without Node TCP
- `withOrg(orgId)` makes the tenancy predicate impossible to forget — it is the only select entry point

### Negative / accepted costs

- Drizzle does not generate automatic rollback migrations — rollback requires a new forward migration
- `drizzle-kit generate` must be run after every schema change; forgetting this breaks CI
- Relational joins are more verbose than Prisma's `include` — accepted for the type-safety trade-off

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Raw SQL via `pg` | No generated types; tenancy predicate enforced by convention only; no structured migration tooling |
| Prisma | `schema.prisma` is a separate DSL; generated client is large; cold-start is slower on Vercel Edge; `include` syntax obscures query shape |
| Kysely | Excellent type safety but no built-in migration tooling; a separate runner (e.g., `umzug`) adds complexity |
| TypeORM | Decorator-based; poor Edge runtime compatibility; slower query performance |
| MikroORM | Similar to TypeORM; unnecessary complexity for this use case |

## Constraints that must not be broken

- Every tenant table includes `organization_id text NOT NULL`
- Tenant reads go through `withOrg(orgId)` — direct unscoped `db.select()` on tenant tables is forbidden in app code
- Every schema change ships a Drizzle migration file — no ad-hoc DDL in production
- Only `@afenda/db` imports `drizzle-orm` / `@neondatabase/serverless`

## References

- [ARCH-025 Data Layer](../../architecture/turborepo/ARCH-025-data-layer.md)
- [ARCH-023 Multi-Tenancy Model](../../architecture/turborepo/ARCH-023-multi-tenancy.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Constraints that must not be broken |
| 1.0.0 | 2026-07-13 | Accepted |
