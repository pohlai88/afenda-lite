# `@afenda/events`

Rank-1 Platform domain-event outbox for Afenda-Lite: Zod-validated append to `platform_domain_event`, claim/dispatch with injectable handlers, query / purge helpers. Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, NATS, or Action envelopes.

**Transport:** Postgres transactional outbox only. Do not dual-write `platform_domain_event` outside this package. Do not invent a NATS/Redis bus here.

Use this package from Platform / app server code when a domain mutation must leave a durable, typed event for handlers (e.g. IN_APP notification). Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import from the root barrel:

```ts
import {
  createEventPublisher,
  createEventDispatcher,
} from "@afenda/events";

const publisher = createEventPublisher();
const published = await publisher.publish({
  type: "identity.org_role.assigned",
  sourceModule: "identity",
  organizationId,
  actorUserId,
  correlationId,
  payload: {
    roleId,
    assignmentId,
    recipientUserId,
    reactivated: false,
  },
});
if (!published.ok) {
  // map Result at the adapter — do not invent { success, data }
}

const dispatcher = createEventDispatcher({
  handlers: {
    "identity.org_role.assigned": async (event) => {
      // call @afenda/notifications from apps/web — not from this package
    },
  },
});
await dispatcher.dispatchPending({ organizationId });
```

Pass request-scoped `organizationId`, `actorUserId`, and `correlationId` on every publish. Handlers that write inbox rows must live in `apps/web` (this package stays a leaf: `@afenda/db` · `@afenda/errors` only).

**Living consumers:** `apps/web` identity `recordOrgRoleAssignedEvent` → `assignOrgRoleAction`; platform `recordOrganizationDeletedEvent` → `deleteOrganizationAction`.

## Catalog (v1)

| Type | Module | Payload |
|------|--------|---------|
| `identity.org_role.assigned` | identity | roleId · assignmentId · recipientUserId · reactivated |
| `platform.organization.deleted` | platform | organizationId · deletedByUserId |
| `master_data.party.*.v1` | master_data | organizationId · entityType · entityId · code · version · actorId · correlationId (+ optional causationId / changedPaths) |
| `master_data.item.*.v1` | master_data | same envelope |
| `master_data.item_group.*.v1` | master_data | same envelope |
| `master_data.warehouse.*.v1` | master_data | same envelope |
| `master_data.payment_term.*.v1` | master_data | same envelope |
| `master_data.tax_registration.*.v1` | master_data | same envelope |
| `master_data.item_template.*.v1` · `item_template_attribute*.v1` · `item_variant.*.v1` | master_data | same envelope |
| `master_data.change_request.*.v1` | master_data | submitted · approved · rejected · applied |
| `sales.order.created.v1` | sales | order header snapshot + org/actor/correlation |
| `sales.order.line_added.v1` | sales | line snapshot + order id |
| `sales.order.posted.v1` | sales | posted order header snapshot |

`master_data.*` emitters live in `@afenda/master-data` (same-TX outbox port). `sales.*` emitters live in `@afenda/sales`. No `merged.v1` / `ref_*` mutation events in Authority B.

## Store

| Surface | Backend |
|---------|---------|
| Production default | `DrizzleEventStore` → `platform_domain_event` via `@afenda/db` |
| Vitest injection | `createEventPublisher({ store })` / dispatcher / query `store` arg |

Every read/write/purge predicates `organization_id` (claim may filter by org). List page size capped at `MAX_EVENT_PAGE_SIZE` (100).

## Maintain

```bash
pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `.` | Publisher, dispatcher, query helpers, schemas, types, Drizzle store |

## Out of scope

Do not add to this package: NATS / JetStream / Redis buses, Next.js / `ActionResult` / raw `process.env`, Surfaces / `apps/*` imports, `@afenda/notifications` (handlers stay in web), or dual-write around the package. Shared schema · hard `organization_id` only — never multi-DB / project-per-tenant isolation.

## Authority

| Topic | Link |
|-------|------|
| Events Scratch | [docs-V2/events](../../docs-V2/events/README.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Sales consumer · outbox emitters | [`@afenda/sales`](../sales/README.md) · [arch-006-consumer-contract.md](../../docs-V2/master-data/arch-006-consumer-contract.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../docs-V2/tenancy/README.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
