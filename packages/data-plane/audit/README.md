# `@afenda/audit`

Rank-1 Platform audit kernel for Afenda-Lite. It records organization-scoped domain activity in `platform_audit_log`, validates and masks bounded JSON payloads, and provides query, export, retention, transaction-write, and telemetry contracts. Public operations return `@afenda/errors` `Result`; this package does not own HTTP responses or Server Action envelopes.

**Not RBAC audit.** Privileged IAM mutations use [`@afenda/admin/audit`](../../control-plane/admin/README.md) and `platform_rbac_audit`. Do not dual-write either table around these packages.

Use this server-only package when a domain mutation needs a durable activity trail. Every write requires request-scoped `organizationId`, `actorUserId`, and `correlationId`; every read and purge requires `organizationId`. Never derive tenancy or actor identity from process-global state.

## Consume

Import from the package barrel:

```ts
import { audit } from "@afenda/audit";

const recorder = audit.recorder();
const recorded = await recorder.record({
  organizationId,
  actorUserId,
  correlationId,
  module: "identity",
  entity: "member",
  entityId,
  action: "UPDATE",
  oldValue,
  newValue,
  eventContext: {
    version: 1,
    outcome: "SUCCEEDED",
    source: "identity.member",
    occurredAt: null,
    causationId: commandId,
    reasonCode: null,
  },
});

if (!recorded.ok) {
  // Map Result at the application boundary.
}

const page = await audit.read.cursor({
  organizationId,
  pageSize: 50,
});
```

Sensitive keys such as passwords, tokens, credentials, cookies, and authorization values are masked before persistence. Payloads must still be intentionally selected: masking is a safety boundary, not permission to send secrets to the audit API.

## Choose a write path

| Need | API |
|------|-----|
| Standard write through the production store | `audit.recorder()` |
| Inject a store for tests or composition | `audit.recorder({ store })` |
| Prepare validated and masked values for a caller-owned guarded CTE | `audit.transaction.prepare()` |
| Let a mutation row supply `entity_id` | `audit.transaction.prepareDerived()` |
| Build a parameterized insert for a synchronous Neon transaction batch | `audit.transaction.buildInsert()` |

Keep the domain mutation and its audit insert in the same transaction whenever audit durability is part of the mutation contract. The preparation helpers fail closed before SQL construction and serialize the versioned event context into reserved audit metadata.

## Query, export, and retention

| API | Purpose |
|-----|---------|
| `audit.read.page` | Offset page plus total count |
| `audit.read.cursor` | Stable keyset page plus opaque continuation cursor |
| `audit.read.entityHistory` | Organization-scoped history for one entity |
| `audit.read.userActivity` | Organization-scoped activity for one actor |
| `audit.read.countByAction` | Filtered action count |
| `audit.export.detailed` | Bounded JSON or CSV export with row count, truncation state, and continuation cursor |
| `audit.export.content` | Content-only projection of a bounded export |
| `audit.retention.purge` | Delete organization-scoped entries older than a cutoff |

Offset pages default to 50 rows and are capped at 100. Exports are capped at `MAX_AUDIT_EXPORT_ROWS` (10,000); continue a truncated detailed export with its returned cursor. CSV output contains summary columns rather than the full changes JSON.

## Store and observability

| Surface | Contract |
|---------|----------|
| Production adapter | `audit.store.drizzle()` → `platform_audit_log` via `@afenda/db` |
| Persistence port | `AuditStore` |
| Test injection | Recorder and query helpers accept an `AuditStore` |
| Diagnostics | `AUDIT_TELEMETRY_CHANNEL` (`afenda.audit.operation.v1`) |

Telemetry reports bounded operation outcomes, duration, row counts, truncation, and error codes. It deliberately excludes organization IDs, actor IDs, correlation IDs, entity IDs, and audit payloads.

## Maintain

Requires the repository engines: Node `24.x` and pnpm `>=10.33.4`.

```bash
pnpm --filter @afenda/audit lint
pnpm --filter @afenda/audit typecheck
pnpm --filter @afenda/audit test
pnpm check:audit-boundary
pnpm test:audit-boundary
```

## Export surface

The single public import path, `@afenda/audit`, exposes one frozen `audit` runtime facade plus structural TypeScript contracts:

- `audit.recorder`, `audit.store`, `audit.read`, `audit.export`, and `audit.retention` operations;
- `audit.transaction` validation and SQL construction for atomic domain mutations;
- `audit.schemas`, `audit.vocabulary`, `audit.limits`, `audit.data`, `audit.cursor`, and payload-free `audit.telemetry` projections;
- type-only command, entry, store, recorder, query, export, and prepared-transaction contracts.

The former named runtime functions and `DrizzleAuditStore` implementation class are intentionally absent. See [`src/index.ts`](./src/index.ts) for the exact barrel. Do not deep-import package internals.

## Ownership and boundaries

| Surface | Owner |
|---------|-------|
| `platform_audit_log` write, query, export, and purge | `@afenda/audit` |
| `platform_rbac_audit` privileged IAM audit | `@afenda/admin/audit` |
| Table schema and hard-tenant root | `@afenda/db` |
| `Result` and error codes | `@afenda/errors` |

This Rank-1 Platform package may depend on `@afenda/db`, `@afenda/errors`, Zod, and `server-only`. It must not import Surfaces, `apps/*`, `@afenda/admin`, or `@afenda/auth`.

Out of scope: ORM auto-interception, process-global audit context, file or JSONL stores, RBAC action vocabulary, Next.js handlers, `ActionResult`, OpenAPI ownership, and a second tenancy model.

## Authority

| Topic | Link |
|-------|------|
| Data plane package index | [packages/data-plane](../README.md) |
| Package DAG and layer rules | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Data layer and hard tenant roots | [docs-V2/data](../../../docs-V2/data/README.md) · [`@afenda/db`](../db/README.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
