# `@afenda/events`

Canonical event registry and tenant-scoped Postgres outbox kernel. It owns envelope validation, serialization, atomic claim leases, retry/replay lifecycle, and dispatch policy. Outcomes use `@afenda/errors` `Result`; handlers are composed only in the application.

## Use

```ts
import { events } from "@afenda/events";
import { identityOrgRoleAssignedPayloadSchema } from "@afenda/events/schemas";

const payload = identityOrgRoleAssignedPayloadSchema.parse(input);
const published = await events.publisher.create().publish({
  type: "identity.org_role.assigned",
  sourceModule: "identity",
  organizationId,
  actorUserId,
  correlationId,
  payload,
});

const dispatcher = events.dispatcher.create({
  handlers: {
    "identity.org_role.assigned": async (event) => {
      // Application-owned notification or integration handler.
    },
  },
});
await dispatcher.dispatchPending({ organizationId });
```

Use `events.query` for bounded operational pages, retry, replay, and purge. Use `events.serialization` for canonical wire round-trips. Same-transaction producer adapters use `events.outbox.createAppender`; they must not weaken the mutation/outbox atomic boundary.

## Semantics

- `EVENT_REGISTRY` is the sole type → schema → source-module owner.
- Producers may declare a canonical type and source; ingress rejects mismatches and invalid payloads.
- Claiming atomically transitions eligible rows to `processing` with `FOR UPDATE SKIP LOCKED`, a bounded lease, attempt ceiling, and opaque token.
- Completion/failure requires the matching organization, processing state, and claim token.
- Lease state is private: handlers receive only `DomainEvent`.
- Missing handlers fail visibly for operator retry; expired worker leases can be reclaimed safely.
- Historical aliases, if ever required, normalize at ingress and never become construction values.

## Public contract

| Export | Role |
|---|---|
| `@afenda/events` | Server-only `events` operational facade and durable result/envelope types |
| `@afenda/events/schemas` | Pure schema/constants projection derived from the canonical registry |

Store constructors, store types, standalone publisher/dispatcher/query functions, operational subpaths, and claim tokens are private. See [CONTRACT.md](./CONTRACT.md).

## Verify

```bash
pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events typecheck:contract
pnpm --filter @afenda/events test
pnpm check:events-boundary
pnpm test:events-boundary
pnpm --filter @afenda/db db:check
```

## Boundaries

No NATS/Redis bus, Next.js, ActionResult, notifications dependency, raw environment access, or application import belongs here. Runtime workspace dependencies remain `@afenda/db` and `@afenda/errors`. The shared-schema tenancy model requires `organizationId` on every operation.

Authority: [events Scratch](../../../docs-V2/events/README.md) · [monorepo DAG](../../../docs-V2/monorepo/README.md) · [AGENTS.md](../../../AGENTS.md).
