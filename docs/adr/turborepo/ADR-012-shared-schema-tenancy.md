# ADR-012 Shared-Schema Multi-Tenancy

| Field | Value |
|-------|-------|
| ID | ADR-012 |
| Category | ADR |
| Version | 1.1.0 |
| Status | Accepted |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing.** Accepted target decision for the Turborepo rebuild. Ignore legacy flat-monolith residue.


## Decision Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Deciders** | Platform |
| **Scope** | Tenancy isolation model for all product data |

## Context

Afenda-Lite serves multiple customer organisations. We must choose how to isolate their data. The three standard options are: shared schema (all tenants in one database, filtered by a column), schema-per-tenant (separate Postgres schema per org), and project-per-tenant (separate Neon project per org). The choice affects migration complexity, query patterns, cost, and the ability to run cross-tenant operations.

## Decision

Use **shared schema**. Every tenant table includes `organization_id text NOT NULL`. All reads go through `withOrg(orgId)` in `@afenda/db`. Neon Row-Level Security is not applied on the BFF path — session-based scoping via `withOrg` is sufficient.

## Consequences

### Positive

- Single migration run applies to all tenants simultaneously
- Cross-tenant analytics and backfill operations are straightforward SQL
- Neon connection pool is shared — no per-tenant pool management
- Schema changes are reviewed once, not once per tenant

### Negative / accepted costs

- A bug that omits the `organization_id` predicate could expose cross-tenant data — mitigated by making `withOrg` the only read entry point and running `audit:tenancy-nulls` in CI
- Large tenants cannot be moved to dedicated infrastructure without a migration

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Schema-per-tenant | Migration complexity grows linearly with tenant count; cross-tenant queries require dynamic schema switching; Drizzle does not natively support schema-switching |
| Project-per-tenant (separate Neon project) | Neon project cost and connection pool overhead per tenant; no cross-tenant queries; provisioning a new tenant requires infra automation |
| Neon RLS on the BFF path | RLS enforces predicates at the DB level, which is valuable for direct-DB clients — not needed on the server-side BFF path where `withOrg` already enforces isolation with lower overhead |

## Constraints that must not be broken

- Shared schema only — no project-per-tenant and no schema-per-tenant without a superseding ADR
- `orgId` is resolved from session and passed explicitly — never inferred from ambient globals or URL alone
- Neon RLS stays out of scope on the BFF path until a direct-DB client forces a new ADR

## References

- [ARCH-023 Multi-Tenancy Model](../../architecture/turborepo/ARCH-023-multi-tenancy.md)
- [ARCH-025 Data Layer](../../architecture/turborepo/ARCH-025-data-layer.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Constraints that must not be broken |
| 1.0.0 | 2026-07-13 | Accepted |
