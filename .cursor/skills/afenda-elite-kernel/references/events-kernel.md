# `@afenda/events` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/events` |
| Target | `packages/data-plane/events` |
| Kind | Rank-1 data-plane semantic kernel |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `events`; pure `/schemas` projection |

## Ownership

Events owns event type registration, canonical source modules, payload validation, the durable envelope, serialization/deserialization, outbox lifecycle, bounded claims, retry/replay policy, and dispatch outcomes. DB owns the structural table and migration. Errors owns failure semantics. Applications own handler composition. ERP producer adapters own their business transaction but only carry registry-defined event declarations into the same transaction.

## Cutover rules

- Derive type, source-module, and payload validation from one registry.
- Keep `/schemas` a pure projection of the same definitions, never a second registry or operational facade.
- Expose one root `events` capability; delete standalone factories, stores, query functions, ID helpers, and operational subpaths.
- Keep store injection internal. Production publisher/query capabilities resolve the canonical store.
- Claim atomically with `FOR UPDATE SKIP LOCKED`, `processing`, an opaque token, a bounded lease, attempt ceiling, and tenant predicate.
- Require tenant, processing state, and token for completion/failure; fail missing handlers visibly for operator retry and reclaim expired workers.
- Keep claim token and lease timestamps out of `DomainEvent`, serializers, and handlers.
- Inject handlers only at an application composition root; data-plane and ERP packages may emit but never compose dispatch handlers.
- Preserve same-transaction mutation/outbox atomicity. Do not centralize by adding a second transaction.
- Add historical event aliases only as ingress normalization data; canonical construction never accepts aliases.
- Enforce exports, dependencies, subpaths, app-only handler composition, and deleted surfaces with mutation-tested repository checks.

## Verification

```bash
pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events typecheck:contract
pnpm --filter @afenda/events test
pnpm check:events-boundary
pnpm test:events-boundary
pnpm --filter @afenda/db db:check
```

At seal, record the registry/parity evidence, serialization round-trip, lease concurrency and stale-claim behavior, exact consumers, migration journal result, boundary mutations, final digest, and dirty-worktree posture. Do not seal merely because the package compiles; dependent consumers and the migration must be green.
