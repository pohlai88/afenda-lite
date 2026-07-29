# ERP Sales rebuild engineering pack

Status: rebuilt and focused verification completed on 2026-07-28. Repository-wide baseline blockers are recorded below. This Scratch pack is the engineering authority for the greenfield `@afenda/sales` rebuild. It is not a Living DOC-001 controlled-document tree and does not assert module readiness.

## Reading order

1. [Technical specification](technical-specification.md) — ownership, architecture, lifecycles, data flow, controls, migration, and acceptance.
2. [Requirements](requirements.md) — traceable functional, data, security, integration, non-functional, and test requirements.
3. [`@afenda/sales` README](../../../../packages/erp/sales/README.md) — package use and declared exports.
4. [`@afenda/sales` manifest](../../../../packages/erp/sales/src/module.manifest.ts) — machine-readable commands, queries, events, permissions, dependencies, and tables.

## Authority and constraints

- Sales is derived from the package architecture and public read contracts of `@afenda/master-data`. The deleted Sales implementation is not design authority.
- Master Data remains the sole owner of parties, addresses, items, variants, UoMs, payment terms, currencies, tax registrations, and organization dimensions.
- Transactional packages communicate through injected ports or versioned events. Sales has no peer ERP package dependency.
- Same-origin reads use RSC/package queries. Mutations use Server Actions and `ActionResult`. This rebuild adds no Sales REST catalogue.
- Database replacement is destructive for legacy Sales rows. Validation is permitted only on the temporary Neon branch named `sales-rebuild-20260728`; production execution is excluded.

## Implementation status

| Area | Status | Evidence |
| --- | --- | --- |
| Package kernel and capability layout | Implemented | `packages/erp/sales/src` |
| Memory and Drizzle adapters | Implemented; focused Drizzle atomicity/tenancy test verified | `src/testing`, `src/adapters/drizzle`, `drizzle.integration.test.ts` |
| Pricing, quotation, order, holds, returns | Implemented; focused lifecycle suite verified | `packages/erp/sales/__tests__` |
| Sales database replacement | Implemented; destructive migration generated and inspected | `packages/data-plane/db/src/schema/sales.ts`, migration `0041` |
| Event and permission catalogues | Implemented; focused event and module gates verified | Events and DB catalogues |
| Web and Fulfillment composition | Migrated; Sales scaffold verified; full web typecheck blocked by unrelated HR errors | `apps/web/app/actions`, `apps/web/lib/erp`, `apps/web/features/sales` |
| Temporary Neon destructive rehearsal | Verified against final adapter and cleaned up | Final migration, integration, and tenancy checks passed; local production config remained unchanged; temporary branch deleted. |

The migration was applied only to the temporary branch. Production execution remains out of scope. The repository-wide `db:check` remains blocked by pre-existing orphan migration lineage `0034`–`0040`, outside this Sales rebuild.
