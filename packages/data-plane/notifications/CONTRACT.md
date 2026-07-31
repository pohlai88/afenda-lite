# `@afenda/notifications` contract

## Semantic owner

`@afenda/notifications` owns the canonical in-app vocabulary, validation and normalization, deduplication scope, persistence, expiry visibility, pagination, recipient ownership, and read-state transitions for `platform_notification`.

## Permanent consumer facade

Consumers import `notifications` from the package root. The facade exposes `record`, `inbox`, `lifecycle`, `vocabulary`, `values`, and `policy`. Persistence stores, Drizzle adapters, schemas, constructors, and standalone operations are internal.

## Composition boundary

Applications and domains decide which business events create notifications and select canonical vocabulary values. `@afenda/events` never imports this package. Universal notification mechanics remain here; event-specific titles, bodies, recipients, action URLs, and metadata remain at the application composition root.

## Persistence and read state

- Every operation is organization scoped; member operations also require the recipient user.
- New records begin unread.
- Mark-one and mark-all are idempotent and ownership constrained.
- Expired records are invisible to inbox listing and unread counts before physical purge.
- Deduplication is scoped by organization, recipient, module, and key.

## Prohibited surfaces

- Direct `platform_notification` access outside `@afenda/db` and this package.
- Public stores, Drizzle classes/factories, schemas, standalone query functions, or recorders.
- Event-to-notification interpretation inside this package.
- WebSocket, Redis-primary, or unimplemented EMAIL/SMS/PUSH claims.
