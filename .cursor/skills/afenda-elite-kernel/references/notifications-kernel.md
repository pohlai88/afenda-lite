# `@afenda/notifications` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/notifications` |
| Target | `packages/data-plane/notifications` |
| Kind | Rank-1 data-plane semantic kernel |
| Registry | `src/semantic-registry.ts` |
| Permanent facade | package-root `notifications` |

## Ownership

Notifications owns the canonical IN_APP vocabulary, input normalization, validation, deduplication scope, persistence, expiry visibility, pagination, recipient ownership, and read-state transitions. DB owns the structural table. Errors owns failures. Applications own event-to-notification interpretation unless a mapping is universal platform policy.

## Cutover rules

- Derive type, priority, channel, limits, pagination, read-state, retention, and deduplication projections from one registry.
- Expose one root `notifications` capability; keep stores, Drizzle adapters, schemas, constructors, and standalone operations internal.
- Require organization and recipient ownership for member inbox operations.
- New records begin unread; mark-one and mark-all are idempotent.
- Exclude expired records from inbox and unread projections before physical purge.
- Scope deduplication by organization, recipient, module, and key.
- Keep event-specific recipients, copy, action URLs, and metadata in the application composition root.
- Forbid `@afenda/events` → `@afenda/notifications`; compose handlers in `apps/web`.
- Do not claim WebSocket, Redis-primary, EMAIL, SMS, or PUSH behavior without a real transport and an explicit contract change.
- Reject direct table writes, consumer vocabulary literals, implementation subpaths, and deleted surfaces with mutation-tested repository checks.

## Verification

```bash
pnpm --filter @afenda/notifications lint
pnpm --filter @afenda/notifications typecheck
pnpm --filter @afenda/notifications typecheck:contract
pnpm --filter @afenda/notifications test
pnpm check:notifications-boundary
pnpm test:notifications-boundary
pnpm exec vitest run --config testing/vitest.unit.config.ts --project web apps/web/__tests__/record-org-role-assigned-notification.test.ts apps/web/__tests__/member-notifications-actions.test.ts apps/web/__tests__/human-resources-platform-integrations.test.ts
```

At seal, record vocabulary and schema parity, normalization, tenant/recipient isolation, expiration visibility, deduplication, read-state idempotency, exact consumers, composition-root ownership, boundary mutations, digest, and dirty-worktree posture.
