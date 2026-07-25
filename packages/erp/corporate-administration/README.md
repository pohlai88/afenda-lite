# @afenda/corporate-administration

Tenant-scoped **Corporate Administration and Statutory Registers** — legal companies, registration history, governance, ownership, premises, property, licences, and filings.

**Lifecycle:** `scaffolded` after CA-0 governance approval. Promotion to `active`
requires verified CA-1 vertical acceptance.

## Consume

- Import commands/queries from `@afenda/corporate-administration`.
- Wire `CorporateAdministrationCommandOptions` at `apps/web/lib/erp/corporate-administration-command-options.ts`.
- Permissions namespace: `corporate-administration.*`.

## Maintain

- Sole mutator of `ca_*` tables.
- Master lookups via `@afenda/master-data` public API only — no direct `md_*` writes.
- Audit + outbox in the same transaction as mutations.

## Anti-goals

- Not HR, inventory stock, GL depreciation, or payment execution.
- No shadow party/bank tables; no mutable shareholding source table.
