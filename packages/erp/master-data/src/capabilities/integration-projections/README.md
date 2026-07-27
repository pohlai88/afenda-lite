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
- Search projectors are asynchronous, idempotent, and derived from master-data authority. Search projection failure never rolls back an already committed master mutation, and commands may succeed while search remains stale.
- Direct search writes from domain commands are non-authoritative best-effort optimizations only. The committed outbox event plus rebuild-from-SSOT command is the recovery authority.
- Search documents must carry `organizationId`, entity type, entity ID, source version, and projection timestamp.
- Search does not authorize or mutate masters.
- Domain events describe master-data changes; they do not authorize peer ERP writes.
- This package must not import NATS, Redis buses, Next.js, surfaces, or `apps/*`.

## Related Source

- `ports.ts`
- `production-ports.ts`
- `search-projectors.ts`
- `drizzle-store.ts`
- `store.ts`
- `module.manifest.ts`
