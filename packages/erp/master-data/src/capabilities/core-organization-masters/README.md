# Core Organization Masters

## Responsibility

This capability group owns the organization-scoped master roots that transactional ERP modules consume:

- organization dimensions
- parties
- item groups
- items
- warehouses
- payment terms
- tax registrations
- item templates
- item variants

These masters carry organization scope, domain validation, lifecycle state, and version-CAS behavior. They are the authoritative master records for downstream ERP modules.

## Boundaries

- Do not create local customer, supplier, product, warehouse, payment-term, tax, template, or variant shadow tables in transactional packages.
- Do not mutate `md_*` rows directly from `apps/web`; use `@afenda/master-data` commands through app adapters.
- Do not place transactional document state here. Sales, purchasing, inventory, receiving, fulfillment, receivables, payables, payments, and accounting own their own transaction tables.

## Source ownership

The capability is deliberately flat. Each aggregate owns one descriptively named
command/query implementation directly under this directory:

- `organization-dimension.ts`
- `party.ts`
- `item-group.ts`
- `item.ts`
- `warehouse.ts`
- `payment-term.ts`
- `tax-registration.ts`
- `item-template-variant.ts`

Shared contracts and policies also live directly in this directory:

- `schemas.ts` owns command/query validation schemas.
- `store.ts` composes the complete capability persistence port.
- `party-store.ts`, `item-store.ts`, `warehouse-store.ts`,
  `commercial-master-store.ts`, and `organization-dimension-store.ts` expose
  aggregate-sized persistence ports.
- `core-master-policy.ts`, `core-master-events.ts`, `core-master-errors.ts`,
  `normalized-code.ts`, `variant-signature.ts`, `lifecycle.ts`, and
  `version-cas.ts` own cross-aggregate kernel policy.

No aggregate or `shared` bucket directories are permitted here.

## Public contract

Consumers continue to import from `@afenda/master-data`. The package root barrel
re-exports the same aggregate commands and queries from these capability-owned
files. Production Drizzle construction remains isolated to
`@afenda/master-data/adapters/drizzle`; capability code does not export adapters.
