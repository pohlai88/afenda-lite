# Domain events / outbox (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/events/README.md` |
| Authority | **Scratch** — `@afenda/events` · `@afenda/db` `platform_domain_event` |
| Purpose | Org-scoped transactional outbox (Vierp NATS DNA absorb/reject) |
| Updated | 2026-07-20 |

DNA borrow/reject: [events-dna.md](events-dna.md).

## Absorb / reject (Vierp `@vierp/events`)

| Absorb | Reject |
|--------|--------|
| Zod catalogs by dotted type | NATS JetStream / `nats` dep |
| Envelope id · type · correlation · causation · actor · org | Dual `payload`/`data` envelopes |
| Durable ack mental model | In-memory DLQ / idempotency as production |
| Pure payload validators | ERP CRM/MRP/HRM catalogs · demo flows |

## First product consumers

| Surface | Adapter | Event type | Notes |
|---------|---------|------------|-------|
| `assignOrgRoleAction` | `recordOrgRoleAssignedEvent` | `identity.org_role.assigned` | Handler → IN_APP inbox via `@afenda/notifications` |
| `deleteOrganizationAction` | `recordOrganizationDeletedEvent` | `platform.organization.deleted` | Append-only outbox (audit stays `@afenda/audit`) |

## Must not

- NATS / Redis / WebSocket bus inside `@afenda/events`
- Dual-write `platform_domain_event` outside `@afenda/events`
- Package-level Next.js / `ActionResult` / `process.env`
- Events package importing `@afenda/notifications` (handlers stay in `apps/web`)

## Verify

```bash
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events test
pnpm --filter @afenda/db test -- tenancy
pnpm --filter @afenda/web test -- record-org-role-assigned assign-org-role
pnpm audit:tenancy-nulls
```

DAG: [../monorepo/README.md](../monorepo/README.md). Tenancy: [../data/README.md](../data/README.md).
