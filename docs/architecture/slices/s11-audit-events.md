# S11 — Audit event log

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 12 — before production mutation expansion |
| **Depends on** | S0, S1 |
| **Feeds into** | Compliance, incident response |

## Purpose

Immutable record of security-sensitive and mutation events.

## Inputs / outputs

- **Inputs:** Actor id, event type, resource id, metadata JSON
- **Outputs:** `audit_events` rows

## Owned files (to create)

- `db/migrations/004_audit_events.sql`
- `lib/audit.ts`
- Hooks in `app/actions/*.ts` on mutations

## Minimum event types

- `auth.sign_in_failed`
- `declaration.created`
- `declaration.submitted`
- `invite.issued`
- `invite.accepted`
- `evidence.registered`

## Critical control points

- Audit write in same request as mutation (before response)
- Sensitive mutations must not ship without audit hook

## Failure modes

- Audit write failure should not silently drop mutation (define policy: fail-open vs fail-closed)

## Required tests

- Each event type emitted on happy path
- Audit row contains actor and resource

## Acceptance proof

- [x] Migration `004_audit_events.sql` added
- [x] Critical mutations emit audit rows (fail-open)
- [x] No full answer payloads in metadata

## Open question

**Policy (decided for execution):** fail-open — log audit write failure, do not block mutation.
