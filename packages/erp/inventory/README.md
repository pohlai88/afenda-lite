# `@afenda/inventory`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/inventory`

Org-scoped stock movements (`draft` → `posted` | `cancelled`), immutable ledger, balance projection, and reservations, with master-data FK snapshots and same-TX audit/outbox. Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, NATS, or Action envelopes.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `stock_movement` / `stock_balance` / `stock_ledger_entry` / `stock_reservation` from `apps/web` or peer ERP packages. Do not invent shadow product tables (`inventory_product`, local item catalogs).

**Authority:** `stock_ledger_entry` is the immutable quantity history. `stock_balance` is the operational projection. Reservations are a **separate aggregate** (`reserveStock` / `releaseReservation` / `expireReservation` / `cancelReservation`) — not movement types. Transfer posts both legs atomically; **in-transit is not supported** in v1. Scope is **quantity-only** (valuation belongs to Accounting). Bin/lot/serial remain out of scope.

Use this package from Platform / app server code when creating draft stock movements, adding lines, posting, cancelling drafts, reversing posted movements, reserving stock, or releasing reservations. Masters resolve through `@afenda/master-data` lookups — never mutate `md_*` from the inventory store. Toolchain: root `engines` **Node 24.x** · **pnpm ≥10.33.4**.

Scratch contract + completeness ledger: [docs-V2/_scratch/erp/inventory.md](../../../docs-V2/_scratch/erp/inventory.md).

## Consume

```ts
import {
  createStockMovement,
  addStockMovementLine,
  postStockMovement,
  cancelStockMovement,
  createReversalMovement,
  reserveStock,
  releaseReservation,
  expireReservation,
  cancelReservation,
  getStockMovementById,
  listStockMovements,
  listStockReservations,
  getStockAvailability,
} from "@afenda/inventory";

const movement = await createStockMovement({
  organizationId,
  actorUserId,
  correlationId,
  idempotencyKey,
  code: "RCPT-1001",
  movementType: "receipt",
  source: "receiving",
  warehouseId,
  sourceModule: "receiving",
  sourceAggregateId: receiptId,
  sourceEventId: eventId,
});
if (!movement.ok) {
  // map Result at the adapter — do not invent { success, data }
}
```

Pass request-scoped `organizationId`, `actorUserId`, `correlationId`, and `idempotencyKey` on every material mutation. Queries require `organizationId`, `actorUserId`, and `correlationId`. Item / warehouse refs must be same-org masters; post applies balance effects and ledger entries for physical types only.

**Authorization:** every public command and org-scoped query enforces its declared permission through an injected `InventoryAuthorizationPort` (composition root — never import `@afenda/admin` here).

| Operation | Permission |
| --- | --- |
| `createStockMovement` / `addStockMovementLine` | `inventory.movement.create` |
| `postStockMovement` / `createReversalMovement` | `inventory.movement.post` |
| `cancelStockMovement` | `inventory.movement.cancel` |
| Adjustment post (source `manual_adjustment`) | `inventory.adjustment.post` |
| `reserveStock` | `inventory.reservation.create` |
| `releaseReservation` / `expireReservation` / `cancelReservation` | `inventory.reservation.release` |
| `getStockMovementById` / `listStockMovements` / `listStockReservations` | `inventory.movement.read` |
| `getStockAvailability` | `inventory.availability.read` |

**Event types:** `inventory.movement.created.v1` · `inventory.movement.posted.v1` · `inventory.movement.cancelled.v1` · `inventory.stock.reserved.v1` · `inventory.reservation.released.v1` · `inventory.reservation.expired.v1` · `inventory.reservation.cancelled.v1` (catalog in `@afenda/events`).

**Living consumers:** `apps/web` thin Actions + `features/inventory/*` + `/admin/inventory` (operator mutations) · `/client/inventory` (read-only — client role cannot call operator Actions). Both surfaces are linked from permission-gated shell nav (`inventory.movement.read`). DataTables, master selects, `?movementId=` detail, reservation list. UI create is opening-balance receipt / transfer / adjustment only — peer `receiving`/`fulfillment` movements must carry source-event linkage from those packages. Peers: `@afenda/receiving` and `@afenda/fulfillment` call Inventory on post (Inventory never imports them).

## Store / ports

| Surface | Backend |
|---------|---------|
| Production default | `DrizzleInventoryStore` (`@afenda/inventory/adapters/drizzle`) → `@afenda/db` — **all** org mutations use `runNeonHttpTransaction` CTE (entity + balances/ledger/reservation + `platform_audit_log` + `platform_domain_event` same TX) |
| Vitest injection | `MemoryInventoryStore` (`@afenda/inventory/testing`) + memory `AuditFactPort` / `OutboxPort` (in-process atomic) |
| Master lookup | `createMasterDataLookupPort` → `@afenda/master-data` (item · warehouse · ref UoM only) |

`MutationPorts` remain on the store interface for test injection; Drizzle embeds SQL side-effects and does not call SQL ports. Export hygiene: Memory and `MutationPorts` are published from `@afenda/inventory/testing` only — not from the root barrel.

## Invariants

- Inventory is the sole mutator of stock movement, ledger, balance and reservation tables.
- Every stock row belongs to exactly one organization.
- Item, warehouse and UoM references must be active and valid within that organization.
- Posted movements are immutable; draft movements may be cancelled.
- Posted corrections use linked compensating movements.
- The stock ledger is the immutable quantity authority.
- Stock balances are projections of posted ledger entries (plus reservation reserved/available).
- Every on-hand balance change must be explainable by one or more ledger rows.
- Reservations affect reserved and available quantity, not on-hand quantity.
- Negative on-hand and over-reservation are rejected by default.
- Transfers conserve quantity and post both warehouse effects atomically.
- Movement UoM conversions are frozen at posting.
- Every material mutation is authorized, idempotent and concurrency-safe.
- Aggregate, ledger, balance, audit and outbox effects commit or roll back together.
- No peer module directly mutates Inventory tables.

## Maintain

```bash
pnpm --filter @afenda/inventory lint
pnpm --filter @afenda/inventory typecheck
pnpm --filter @afenda/inventory test
pnpm --filter @afenda/inventory check
pnpm --filter @afenda/inventory reconcile
pnpm validate:modules
```

Anti-shadow (every consumer PR):

```bash
rg "sales_customer|purchase_supplier|inventory_product|finance_vendor" packages apps --glob "!**/node_modules/**"
```

## Public surfaces

| Path | Role |
|------|------|
| `@afenda/inventory` | Commands/queries, schemas, types, permissions, error codes, authorization port |
| `@afenda/inventory/adapters/drizzle` | Production Drizzle store |
| `@afenda/inventory/testing` | Memory store + MutationPorts |
| `@afenda/inventory/module-manifest` | R1-F manifest |

Never re-exports raw Drizzle tables or `db` / `eq`.

## Ownership

| Surface | Owner |
|---------|-------|
| `stock_movement` · `stock_movement_line` · `stock_balance` · `stock_ledger_entry` · `stock_reservation` schema · hard-tenant roots | `@afenda/db` |
| Domain commands · brands · balance effects · store | `@afenda/inventory` |
| Item · Warehouse · Ref UoM masters | `@afenda/master-data` |
| `inventory.*` event contracts | `@afenda/events` |
| `Result` / error primitives | `@afenda/errors` |
| Inventory-specific error codes | `@afenda/inventory` |
| ActionResult adapters · inventory UI | `apps/web` |

**Layer:** Rank-1 Platform (`@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` · `@afenda/master-data` · zod · server-only). Must not import Surfaces, `apps/*`, Receiving, Fulfillment, or Next.js. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md).

## Operations

| Concern | Guidance |
|---------|----------|
| Correlation | Every command input requires `correlationId`; Action adapters stamp from request attribution |
| Idempotency | Material mutations require `idempotencyKey`; same key + payload → original outcome; mismatch → `inventory.idempotency.conflict` |
| Natural key | Org-scoped `normalizedCode` uniqueness — duplicate create returns conflict |
| Optimistic concurrency | `post` / `cancel` / `releaseReservation` require matching `expectedVersion` |
| Source dedupe | Downstream movements persist source module/aggregate/event; duplicate event → no second ledger |
| Migration | Apply `@afenda/db` journal tags `0013_inventory_stock` + `0023_inventory_gap_close` via package migrate |
| Rollback / repair | Posted movements are not hard-deleted; repair via compensating movements (`createReversalMovement`) or data-lane SQL under Ops with evidence/audit — never delete ledger rows |
| Reconciliation | `pnpm --filter @afenda/inventory reconcile` — ledger↔balance, reservation totals, transfer conservation |
| Permissions | Seed fine-grained `inventory.*` via `pnpm --filter @afenda/db db:ensure-permission-catalog` |
| Metrics | Structured correlation + Inventory error codes on every Result; no separate dashboard product in-package |
| Verify | `pnpm --filter @afenda/inventory check` · `pnpm validate:modules` |

## Out of scope

Do not add to this package: shadow product tables, `md_*` mutations, Receiving / Fulfillment / Purchasing ownership of stock tables, in-transit transfer state, bin/lot/serial/expiry dimensions, valuation/cost layers, Next.js handlers, tutorial `{ success, data }` envelopes, or a second tenancy model (shared schema · hard `organization_id` only).

## Authority

| Topic | Link |
|-------|------|
| Scratch contract · INV-REQ ledger | [docs-V2/_scratch/erp/inventory.md](../../../docs-V2/_scratch/erp/inventory.md) |
| ARCH-006 consumer contract (Scratch) | [arch-006-consumer-contract.md](../../../docs-V2/master-data/arch-006-consumer-contract.md) |
| Master-data spine | [docs-V2/master-data](../../../docs-V2/master-data/README.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) |
| Events catalog | [docs-V2/events](../../../docs-V2/events/README.md) · [`@afenda/events`](../../data-plane/events/README.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
