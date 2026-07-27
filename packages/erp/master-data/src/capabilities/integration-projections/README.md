# Integration Projections

## Responsibility

This capability group owns integration side effects emitted from master-data mutations:

- audit facts
- `master_data.*` domain events
- outbox behavior
- search indexing and rebuild helpers

These projections make master-data changes observable and consumable while keeping master mutation authority inside this package.

## Boundaries

- Production mutation atomicity is a store contract: master row changes, audit facts, and outbox events must commit together where required.
- Search projectors may index master roots after writes; search does not authorize or mutate masters.
- Domain events describe master-data changes; they do not authorize peer ERP writes.
- This package must not import NATS, Redis buses, Next.js, surfaces, or `apps/*`.

## Related Source

- `ports.ts`
- `production-ports.ts`
- `search-projectors.ts`
- `drizzle-store.ts`
- `store.ts`
- `module.manifest.ts`

