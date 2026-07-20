# @afenda/fulfillment

Enterprise fulfillment module for Afenda-Lite, managing outbound delivery execution: picking, packing, shipment posting, proof of delivery, and closeout.

## Features

- **Delivery Document Management** — create draft deliveries with line items
- **Warehouse Picking** — multi-stage picking workflow with stock reservation validation
- **Packing** — confirm packaging with optional package codes and notes
- **Shipment Posting** — freeze delivery, issue inventory via stock movements
- **Proof of Delivery** — record delivery outcomes (delivered, partially delivered, refused, failed)
- **Delivery Lifecycle** — cancel drafts, close completed deliveries
- **Sales Order Integration** — optional fulfillment from sales orders via port
- **Fine-Grained Permissions** — granular authorization for each operation
- **Idempotency** — replay protection for all material mutations
- **Event Sourcing** — emits domain events for all state transitions

## Status

**Lifecycle:** Active (R1-F band)  
**Activation:** Organization toggle  
**Dependencies:** `@afenda/master-data`, `@afenda/inventory` (required); `@afenda/sales` (optional via port)

## Permissions

Fine-grained permissions replace legacy `fulfillment.read` / `fulfillment.manage`:

| Code | Description | Sensitive |
|------|-------------|-----------|
| `fulfillment.delivery.read` | Read deliveries, picks, packs, POD | No |
| `fulfillment.delivery.create` | Create draft deliveries | Yes |
| `fulfillment.delivery.update` | Add/update lines on drafts | Yes |
| `fulfillment.picking.confirm` | Start and confirm picking | Yes |
| `fulfillment.packing.confirm` | Confirm packing operations | Yes |
| `fulfillment.delivery.post` | Post deliveries, issue inventory | Yes |
| `fulfillment.delivery.cancel` | Cancel draft or posted deliveries | Yes |
| `fulfillment.pod.record` | Record proof of delivery | Yes |
| `fulfillment.delivery.close` | Close delivered deliveries | Yes |

## Commands

All commands require:
- `organizationId` (string) — tenant context
- `actorUserId` (string) — actor for authorization + audit
- `correlationId` (string) — request tracing id
- `idempotencyKey` (string, 1-128) — replay protection

### Create Draft Delivery

```typescript
import { createDraftDelivery } from "@afenda/fulfillment";

const result = await createDraftDelivery({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "delivery-create-abc",
  code: "DEL-001",
  warehouseId: "wh-uuid",
  salesOrderId: "so-uuid", // optional
  shipToPartyId: "party-uuid", // optional
  shipToPartyCode: "CUST-001", // optional
  shipToPartyName: "Customer Name", // optional
}, options);
```

**Permission:** `fulfillment.delivery.create`  
**Status transition:** → `draft`  
**Event:** `fulfillment.delivery.created.v1`

### Add Delivery Line

```typescript
import { addDeliveryLine } from "@afenda/fulfillment";

const result = await addDeliveryLine({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "line-add-def",
  deliveryId: "delivery-uuid",
  expectedVersion: 1,
  itemId: "item-uuid",
  quantityToDeliver: "10.00",
  quantityOrdered: "10.00", // optional
  salesOrderLineId: "sol-uuid", // optional
}, options);
```

**Permission:** `fulfillment.delivery.update`  
**Requires:** Delivery in `draft` status  
**Idempotency:** Stores `lineIdempotencyKey` on `delivery_line`

### Start Picking

```typescript
import { startPicking } from "@afenda/fulfillment";

const result = await startPicking({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "pick-start-ghi",
  deliveryId: "delivery-uuid",
  expectedVersion: 2,
}, options);
```

**Permission:** `fulfillment.picking.confirm`  
**Status transition:** `draft` → `picking`  
**Idempotency:** Stores `pickStartIdempotencyKey` on `delivery`

### Confirm Pick

```typescript
import { confirmPick } from "@afenda/fulfillment";

const result = await confirmPick({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "pick-confirm-jkl",
  deliveryId: "delivery-uuid",
  expectedVersion: 3,
  deliveryLineId: "line-uuid",
  quantityPicked: "5.00",
  reservationId: "reservation-uuid", // required
}, options);
```

**Permission:** `fulfillment.picking.confirm`  
**Requires:**
- Delivery in `picking` status
- Valid `reservationId` from `@afenda/inventory`
- Reservation status: `active` or `partially_consumed`
- Reservation matches: organization, item, warehouse

**Event:** `fulfillment.pick.confirmed.v1`  
**Idempotency:** Stores `pickIdempotencyKey` on `delivery_pick`

### Confirm Pack

```typescript
import { confirmPack } from "@afenda/fulfillment";

const result = await confirmPack({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "pack-confirm-mno",
  deliveryId: "delivery-uuid",
  expectedVersion: 4,
  packageCode: "PKG-001", // optional
  notes: "Fragile items", // optional
}, options);
```

**Permission:** `fulfillment.packing.confirm`  
**Status transition:** `picking` → `packed`  
**Requires:** All lines fully picked (∑ picks ≥ quantityToDeliver for each line)  
**Event:** `fulfillment.pack.confirmed.v1`  
**Idempotency:** Stores `packIdempotencyKey` on `delivery`

### Post Delivery

```typescript
import { postDelivery } from "@afenda/fulfillment";

const result = await postDelivery({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "post-pqr",
  deliveryId: "delivery-uuid",
  expectedVersion: 5,
}, options);
```

**Permission:** `fulfillment.delivery.post`  
**Status transition:** `packed` → `posted`  
**Side effects:**
1. Creates stock movement (`movementType: "issue"`) via `@afenda/inventory`
2. Adds lines for each delivery line
3. Posts stock movement (decrements on-hand inventory)

**Event:** `fulfillment.delivery.posted.v1`  
**Idempotency:** Stores `postIdempotencyKey` on `delivery`  
**Options required:** `inventory: InventoryCommandOptions`

### Record Proof of Delivery

```typescript
import { recordProofOfDelivery } from "@afenda/fulfillment";

const result = await recordProofOfDelivery({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "pod-stu",
  deliveryId: "delivery-uuid",
  expectedVersion: 6,
  receivedByName: "John Doe",
  outcome: "delivered", // delivered | partially_delivered | refused | failed
  proofType: "signature", // optional
  evidenceRef: "s3://bucket/proof.jpg", // optional
  carrierRef: "TRACKING-12345", // optional
  notes: "Left at door", // optional
  recordedAt: new Date(), // optional, defaults to now
}, options);
```

**Permission:** `fulfillment.pod.record`  
**Requires:** Delivery in `posted` status  
**Status transition:**
- `outcome: "delivered"` → status becomes `delivered`, emits `fulfillment.delivery.completed.v1`
- Other outcomes → status stays `posted`, emits `fulfillment.pod.recorded.v1`

**Constraint:** One POD per delivery (unique index on `organization_id`, `delivery_id`)  
**Idempotency:** Stores `podIdempotencyKey` on `delivery`; replay with same key returns original POD; different key → `CONFLICT`

### Cancel Delivery

```typescript
import { cancelDelivery } from "@afenda/fulfillment";

const result = await cancelDelivery({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "cancel-vwx",
  deliveryId: "delivery-uuid",
  expectedVersion: 3,
}, options);
```

**Permission:** `fulfillment.delivery.cancel`  
**Status transition:** `draft | picking | packed | posted` → `cancelled`  
**Event:** `fulfillment.delivery.cancelled.v1`  
**Idempotency:** Stores `cancelIdempotencyKey` on `delivery`

### Close Delivery

```typescript
import { closeDelivery } from "@afenda/fulfillment";

const result = await closeDelivery({
  organizationId: "org-123",
  actorUserId: "user-456",
  correlationId: "req-789",
  idempotencyKey: "close-yz1",
  deliveryId: "delivery-uuid",
  expectedVersion: 7,
}, options);
```

**Permission:** `fulfillment.delivery.close`  
**Requires:** Delivery in `delivered` status  
**Status transition:** `delivered` → `closed`  
**Event:** `fulfillment.delivery.closed.v1`  
**Idempotency:** Stores `closeIdempotencyKey` on `delivery`

## Queries

### Get Delivery by ID

```typescript
import { getDeliveryById } from "@afenda/fulfillment";

const result = await getDeliveryById({
  organizationId: "org-123",
  actorUserId: "user-456",
  id: "delivery-uuid",
}, options);
```

**Permission:** `fulfillment.delivery.read`  
**Returns:** Delivery aggregate with lines, picks, packs, POD (null-safe)

### List Deliveries

```typescript
import { listDeliveries } from "@afenda/fulfillment";

const result = await listDeliveries({
  organizationId: "org-123",
  actorUserId: "user-456",
  page: 1,
  pageSize: 50,
  status: "posted", // optional
  warehouseId: "wh-uuid", // optional
  salesOrderId: "so-uuid", // optional
  sort: "created_at", // created_at | code | status
}, options);
```

**Permission:** `fulfillment.delivery.read`  
**Sorting:** All sorts include `id` tie-breaker for stable pagination

## Events

Module emits 8 event types under `fulfillment` namespace:

| Event | Trigger |
|-------|---------|
| `fulfillment.delivery.created.v1` | Draft delivery created |
| `fulfillment.pick.confirmed.v1` | Pick recorded |
| `fulfillment.pack.confirmed.v1` | Pack confirmed, status → `packed` |
| `fulfillment.delivery.posted.v1` | Delivery posted, inventory issued |
| `fulfillment.delivery.completed.v1` | POD with `outcome: delivered` recorded |
| `fulfillment.delivery.cancelled.v1` | Delivery cancelled |
| `fulfillment.pod.recorded.v1` | POD with non-delivered outcome recorded |
| `fulfillment.delivery.closed.v1` | Delivery closed |

All payloads conform to `FulfillmentEventSchemas` in `@afenda/events/schemas`.

## Sales Integration

Optional integration with `@afenda/sales` via `SalesFulfillmentQueryPort`:

```typescript
export type SalesFulfillmentQueryPort = {
  getFulfillableSalesOrder(input: {
    organizationId: string;
    salesOrderId: string;
    actorUserId: string;
  }): Promise<Result<FulfillableSalesOrder | null>>;
};
```

**Validation:**
- `createDraftDelivery`: if `salesOrderId` provided, validates order is `posted` (not `draft` / `cancelled`)
- `addDeliveryLine`: validates `salesOrderLineId` against SO lines, checks remaining qty
- `postDelivery`: re-validates SO still `posted` when `salesOrderId` set

**Wiring:** `apps/web/lib/erp/sales-fulfillment-query-port.ts` wraps `@afenda/sales` methods

## Command Options

```typescript
export type FulfillmentCommandOptions = {
  store?: FulfillmentStore;
  ports?: MutationPorts; // audit + outbox
  masters?: MasterLookupPort; // item, warehouse lookups
  authorization?: FulfillmentAuthorizationPort;
  masterAuthorization?: MasterAuthorizationPort;
  inventory?: InventoryCommandOptions; // required for postDelivery
  sales?: SalesFulfillmentQueryPort; // optional sales validation
};
```

## Database Schema

Tables under `fulfillment` schema:

- **`delivery`** — Delivery header (code, status, timestamps, idempotency keys)
- **`delivery_line`** — Line items (item, qty, sales order line ref, line idempotency key)
- **`delivery_pick`** — Pick records (qty, reservation ref, pick idempotency key)
- **`delivery_pack`** — Pack confirmation (package code, notes)
- **`proof_of_delivery`** — POD (outcome, proof type, evidence/carrier refs)

**Idempotency columns:**
- `delivery`: `create_idempotency_key`, `post_idempotency_key`, `cancel_idempotency_key`, `close_idempotency_key`, `pack_idempotency_key`, `pick_start_idempotency_key`, `pod_idempotency_key`
- `delivery_line`: `line_idempotency_key`
- `delivery_pick`: `pick_idempotency_key`, `reservation_id`
- `proof_of_delivery`: outcome fields (`outcome`, `proof_type`, `evidence_ref`, `carrier_ref`)

**Migration:** `drizzle/0024_fulfillment_gap_close.sql`

## Testing

```bash
pnpm --filter @afenda/fulfillment test
```

**Test coverage:**
- Domain logic (`fulfillment.domain.test.ts`)
- Authorization (`fulfillment.authorization.test.ts`)
- Idempotency replay and conflict
- POD outcome validation
- Pick reservation validation
- Pack qty ladder gate
- Sales order validation

## Implementation Status

### ✅ Completed (F1, F5-F9)

- **F1** — `closeDelivery` full E2E
- **F5** — Fine-grained permissions (9 codes)
- **F6** — Idempotency on all mutations
- **F7** — POD outcome enum (delivered / partially_delivered / refused / failed)
- **F8** — 8 event types (pack, cancel, POD, close)
- **F9** — List sort by `created_at | code | status`

### ⚠️ Partially Implemented (F2-F4)

**F2 — Sales Port:**
- ✅ Port interface defined (`SalesFulfillmentQueryPort`)
- ✅ Command options wired
- ⚠️ Sales module `getFulfillableSalesOrder` — needs implementation in `@afenda/sales`
- ⚠️ Validation logic in `createDraftDelivery` / `addDeliveryLine` / `postDelivery` — needs sales port calls
- ⚠️ Web adapter `apps/web/lib/erp/sales-fulfillment-query-port.ts` — needs creation

**F3 — Reservation on Pick:**
- ✅ Schema updated (`reservationId` required on `confirmPickInputSchema`)
- ✅ DB column added (`delivery_pick.reservation_id`)
- ✅ Type updated (`DeliveryPick.reservationId`)
- ✅ Validation in `confirmPick` checks reservation via `inventory.store.getReservationById`
- ⚠️ Stores (memory, drizzle) — need to persist `reservationId` on pick
- ⚠️ `postDeliveryInventoryMovement` — pass `reservationId` to `createStockMovement` when all picks share same reservation

**F4 — Pack Qty Ladder:**
- ✅ Requirement defined
- ⚠️ Stores (memory, drizzle) — `confirmPack` must validate ∑(picks) >= quantityToDeliver for ALL lines before allowing pack

### 🔲 TODO

1. **Update Stores (memory, drizzle):**
   - Add idempotency replay logic (same key → return original; different key same op → CONFLICT)
   - Persist all new fields (idempotency keys, POD outcome, reservation ID)
   - Implement F4 pack qty ladder gate
   - Emit new events (pack, cancel, POD, close)
   - Support list sort parameter
   - Update POD unique constraint handling with idempotency

2. **Sales Module Integration:**
   - Implement `getFulfillableSalesOrder` in `@afenda/sales/src/order.ts`
   - Add validation logic to fulfillment commands
   - Create web adapter port

3. **Web Actions:**
   - Update all `apps/web/app/actions/*delivery*` to pass `idempotencyKey` (generate via `crypto.randomUUID()` if missing)
   - Update forms with hidden `idempotencyKey` field or generate server-side
   - Update `confirm-pick` action to pass `reservationId`
   - Update POD action to pass outcome fields
   - Update fine-grained permission checks in actions

4. **UI Shell:**
   - Update `apps/web/features/fulfillment/fulfillment-shell.tsx`
   - `canManage` becomes OR of write perms or check `delivery.create` for forms
   - `canRead` uses `delivery.read`

5. **Session Permissions:**
   - Add messages in `apps/web/modules/identity/domain/session-permission.ts` for 9 new codes

6. **Tests:**
   - Update `apps/web/__tests__/product-authorization-wiring.test.ts` with new permissions
   - Add/update domain tests for F2-F4 features
   - Update events schema tests
   - Update platform-permission-catalog test

## Module Manifest

```typescript
{
  id: "fulfillment",
  category: "supply-chain",
  packageName: "@afenda/fulfillment",
  band: "R1-F",
  lifecycle: "active",
  owns: {
    aggregates: ["delivery"],
    commands: [9 command IDs],
    queries: [2 query IDs]
  },
  events: {
    emits: [8 event types]
  },
  permissions: [9 fine-grained codes],
  moduleDependencies: {
    required: ["master-data", "inventory"]
  }
}
```

## License

MIT
