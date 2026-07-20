# Events DNA (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/events/events-dna.md` |
| Authority | **Scratch** — monorepo-discipline + disk `@afenda/events` |
| Source DNA | `_reference/packages/events` (`@vierp/events`) — read-only historical; not a product package |
| Updated | 2026-07-20 |

Borrow/reject matrix for domain events / transactional outbox. Operator path: [README.md](README.md).

---

## Verdict

**Create `@afenda/events` as a Rank-1 Platform package** (Postgres outbox + Zod catalogs). Absorb typed event catalogs, envelope identity fields, and durable ack semantics. Do **not** port NATS JetStream, dual legacy publishers, ERP module catalogs, or in-memory DLQ/idempotency stores presented as production resilience.

| Concern | Owner |
|---------|-------|
| Outbox write · claim · query · purge | [`@afenda/events`](../../packages/data-plane/events/README.md) |
| Table `platform_domain_event` | [`@afenda/db`](../../packages/data-plane/db/README.md) |
| Handler side-effects (e.g. IN_APP inbox) | `apps/web/modules/**/domain` (inject handlers; package stays leaf) |
| Broker / realtime | **None** — not in Afenda stack |

---

## Shipped from DNA (do once)

| Idea | Disk |
|------|------|
| Zod catalogs keyed by dotted type | `packages/data-plane/events/src/schemas/*.events.ts` |
| Single envelope (`payload`, `organizationId`) | `packages/data-plane/events/src/types.ts` |
| `AllEventSchemas` validate-on-publish | `packages/data-plane/events/src/schemas/index.ts` |
| Correlation / causation helpers | `packages/data-plane/events/src/ids.ts` |
| Durable ack → outbox status | `pending` → `processed` / `failed` + `attempts` |
| Store port + memory test double | `store.ts` · `__tests__/helpers/memory-event-store.ts` |
| Living catalogs only | `identity.*` · `platform.*` |
| Living emitters | `recordOrgRoleAssignedEvent` · `recordOrganizationDeletedEvent` |

---

## Reject (do not port)

| Pattern | Why |
|---------|-----|
| `nats` / JetStream / stream subjects | Not in Afenda stack (`natsEventTotal` rejected in metrics DNA) |
| Dual APIs (`payload` vs `data`, typed vs legacy) | Coding-discipline + no dual cutover |
| CRM / Accounting / Ecommerce / MRP / HRM catalogs | No living modules |
| Flow mappers with `require()` / random inventory | Demo stubs — enterprise bar |
| In-memory DLQ / IdempotencyStore as production | Lost on restart; unwired in DNA |
| Raw `process.env.NATS_URL` | Config via `@afenda/env` only when needed; no NATS |
| `console.log` observability | `@afenda/logger` / product log at adapters |
| Committed `.js` next to `.ts` | Source-entry packages only |
| Package → `@afenda/notifications` | Handlers live in `apps/web`; events → db · errors only |

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No NATS / Redis event bus invent | Neon Postgres outbox only this slice |
| No dual-write `platform_notification` / `platform_audit_log` from events | Sole writers stay notifications / audit |
| No Next.js inside `@afenda/events` | Leaf stays portable |
| No `_reference` upload to `@afenda/docs` / Vercel | Official docs must not ship historical trees |

---

## Verify

```text
1. Test-Path packages/data-plane/events (present)
2. pnpm --filter @afenda/events test
3. pnpm --filter @afenda/events typecheck
4. pnpm --filter @afenda/db test -- tenancy
5. pnpm --filter @afenda/web test -- record-org-role-assigned assign-org-role
6. pnpm audit:tenancy-nulls
```

Companion: [README.md](README.md) · [../monorepo/README.md](../monorepo/README.md) · [../data/README.md](../data/README.md) · [../notifications/README.md](../notifications/README.md).
