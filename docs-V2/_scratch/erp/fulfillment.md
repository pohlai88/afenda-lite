# Review verdict

This is a **good boundary summary**, but it is not yet strong enough to close `@afenda/fulfillment` as an enterprise transactional package.

**Current score: 7.3/10**

The package correctly owns delivery execution and avoids direct Sales/Inventory table writes. The biggest gaps are:

* unclear lifecycle semantics between **posted, delivered, completed, and proof of delivery**;
* no explicit Sales-order source contract;
* no Inventory reservation/issue contract;
* missing partial-pick, short-ship, and backorder rules;
* permissions are too broad;
* insufficient idempotency, concurrency, reconciliation, and event coverage.

---

# What is already correct

* Delivery, line, pick, pack, and POD mutations have one owner.
* Schemas remain in `@afenda/db`.
* Sales and Inventory are not directly imported or mutated.
* Master Data is consumed through a port.
* Actor, organization, correlation, and optimistic version are present.
* Draft cancellation is distinguished from post-delivery correction.
* Production mutations promise audit/outbox atomicity.
* Memory stores exist for deterministic tests.

---

# Blocking findings

## 1. The delivery lifecycle is unclear

The README currently exposes:

```text
draft creation
→ picking
→ packing
→ posting
→ proof of delivery
```

but events include:

```text
delivery.posted
delivery.completed
```

It does not define whether:

* `posted` means dispatched;
* `completed` means delivered;
* proof of delivery causes completion;
* delivery can complete without POD;
* packed goods may return to draft;
* partial shipment is supported.

### Recommended lifecycle

```text
draft
→ picking
→ packed
→ posted
→ delivered
→ closed

draft / picking / packed
→ cancelled
```

Recommended meaning:

| State       | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `draft`     | Delivery prepared but no warehouse execution started |
| `picking`   | Stock selection in progress                          |
| `packed`    | Picked quantity packed and ready for dispatch        |
| `posted`    | Goods dispatched; Inventory issue must be initiated  |
| `delivered` | Delivery confirmed, normally through POD             |
| `closed`    | All delivery obligations and exceptions resolved     |
| `cancelled` | Pre-post execution terminated                        |

A posted delivery should not be cancelled. Correction requires an explicit return or compensating stock process owned by the appropriate package.

---

## 2. `recordProofOfDelivery` needs a stronger contract

POD is evidence, not merely a status toggle.

At minimum define:

```text
deliveredAt
recipient name
delivery outcome
proof type
external evidence reference
delivery coordinates, if supported
carrier reference
notes
partial or full delivery
actor/source
```

Recommended outcome:

```ts
type DeliveryOutcome =
  | "delivered"
  | "partially_delivered"
  | "refused"
  | "failed";
```

Required invariants:

```text
POD can only be recorded against a posted delivery.
POD does not rewrite the original posted quantities.
Duplicate POD submissions are idempotent.
Replacement evidence creates a new evidence version or correction record.
A refused or partially delivered outcome does not silently mark the
delivery fully completed.
```

Avoid storing unrestricted uploaded file bytes directly in Fulfillment unless attachment ownership is explicitly authorized. Store controlled evidence references instead.

---

## 3. The Sales source contract is missing

Fulfillment must know what it is allowed to deliver without reading Sales tables directly.

A Delivery line should normally reference:

```text
salesOrderId
salesOrderLineId
ordered quantity
previously fulfilled quantity
remaining fulfillable quantity
item and UoM snapshot
ship-to snapshot
```

### Recommended Sales port

```ts
export interface SalesFulfillmentQueryPort {
  getFulfillableSalesOrder(input: {
    organizationId: string;
    salesOrderId: string;
  }): Promise<
    Result<{
      status: "draft" | "posted" | "closed" | "cancelled";
      version: number;
      customerPartyId: string;
      shipToSnapshot: {
        name: string;
        addressLines: readonly string[];
        countryCode: string;
      };
      lines: readonly {
        salesOrderLineId: string;
        itemId: string;
        uomId: string;
        orderedQuantity: string;
        previouslyFulfilledQuantity: string;
        remainingQuantity: string;
      }[];
    }>
  >;
}
```

Required source rules:

```text
Draft Sales Order      → reject
Posted Sales Order     → allow within remaining quantity
Closed Sales Order     → reject new delivery
Cancelled Sales Order  → reject
Wrong organization     → reject without leaking existence
```

Validate the source both when creating the Delivery and again before posting it.

---

## 4. Inventory integration is underspecified

Fulfillment owns picking and packing, but Inventory owns:

* reservations;
* on-hand quantity;
* available quantity;
* stock issues;
* stock ledger.

Fulfillment must not treat `confirmPick` as an Inventory mutation.

### Recommended flow

```text
Sales order authorized for fulfillment
→ Inventory reservation exists or is requested
→ Fulfillment starts picking
→ pick quantities confirmed
→ pack quantities confirmed
→ Delivery posted
→ Inventory consumes reservation and posts issue
```

There are two safe integration choices:

### Event-based

```text
fulfillment.delivery.posted.v1
→ composition-root handler
→ Inventory issue command
```

### Port-based orchestration

```text
Fulfillment application service
→ Fulfillment post
→ Inventory issue through injected port/saga
```

Because cross-package same-transaction behavior is not the default, define failure handling when:

```text
Delivery posts successfully
but Inventory issue temporarily fails.
```

That requires idempotent retry and an operational exception state—not silent divergence.

---

## 5. Picking must connect to reservations

A confirmed pick should normally reference an Inventory reservation or an approved unreserved-pick policy.

Recommended fields:

```ts
type DeliveryPick = {
  deliveryLineId: string;
  reservationId?: string;
  warehouseId: string;
  pickedQuantity: DecimalString;
  pickedUomId: string;
  baseQuantity: DecimalString;
};
```

Required rules:

```text
Picked quantity cannot exceed remaining delivery quantity.
Picked quantity cannot exceed reserved quantity unless an explicit
unreserved-pick policy permits it.
The same reservation quantity cannot be consumed by two deliveries.
Released or expired reservations cannot be picked.
Pick confirmation does not directly mutate Inventory reservation tables.
```

Inventory remains responsible for reservation consumption.

---

## 6. Partial pick, short shipment, and over-shipment are undefined

These scenarios are routine:

* ordered 100;
* reserved 90;
* picked 88;
* packed 87;
* delivered 85.

The package must define what each quantity means.

Recommended quantities per line:

```text
requested quantity
picked quantity
packed quantity
posted quantity
delivered quantity
rejected quantity
remaining quantity
```

Required inequalities:

```text
picked ≤ requested
packed ≤ picked
posted ≤ packed
delivered + rejected ≤ posted
```

Over-shipment should be rejected by default unless Sales explicitly provides a permitted tolerance.

Backorder ownership should remain with Sales or an application read model, not become a shadow Sales concept inside Fulfillment.

---

## 7. Transfer between lifecycle stages needs atomic detail

Current commands:

```ts
startPicking
confirmPick
confirmPack
postDelivery
```

need exact transition rules.

Suggested map:

| Command                 | From                                 | To                                    |
| ----------------------- | ------------------------------------ | ------------------------------------- |
| `startPicking`          | `draft`                              | `picking`                             |
| `confirmPick`           | `picking`                            | remains `picking` or becomes `picked` |
| `confirmPack`           | fully picked                         | `packed`                              |
| `postDelivery`          | `packed`                             | `posted`                              |
| `recordProofOfDelivery` | `posted`                             | `delivered` or exception              |
| `closeDelivery`         | `delivered`                          | `closed`                              |
| `cancelDelivery`        | `draft`, possibly `picking`/`packed` | `cancelled`                           |

The current public surface lacks:

```ts
closeDelivery;
```

If `completed` is intended to replace `closed`, define it consistently and avoid both terms.

---

# Authorization and governance

## 8. `fulfillment.read` and `fulfillment.manage` are too broad

One `manage` permission allows users to:

* create deliveries;
* pick;
* pack;
* dispatch;
* cancel;
* record POD.

Recommended minimum:

```ts
export const fulfillmentPermissions = {
  deliveryRead: "fulfillment.delivery.read",
  deliveryCreate: "fulfillment.delivery.create",
  deliveryUpdate: "fulfillment.delivery.update",
  pickingConfirm: "fulfillment.picking.confirm",
  packingConfirm: "fulfillment.packing.confirm",
  deliveryPost: "fulfillment.delivery.post",
  deliveryCancel: "fulfillment.delivery.cancel",
  podRecord: "fulfillment.pod.record",
  deliveryClose: "fulfillment.delivery.close",
} as const;
```

Warehouse operators may pick and pack without being authorized to dispatch or cancel.

---

## 9. Package-internal authorization is missing

Every operation should enforce its manifest-mapped permission inside the package.

```ts
export interface FulfillmentAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: FulfillmentPermission;
  }): Promise<boolean>;
}
```

Suggested mapping:

| Operation               | Permission                    |
| ----------------------- | ----------------------------- |
| `createDraftDelivery`   | `fulfillment.delivery.create` |
| `addDeliveryLine`       | `fulfillment.delivery.update` |
| `startPicking`          | `fulfillment.picking.confirm` |
| `confirmPick`           | `fulfillment.picking.confirm` |
| `confirmPack`           | `fulfillment.packing.confirm` |
| `postDelivery`          | `fulfillment.delivery.post`   |
| `recordProofOfDelivery` | `fulfillment.pod.record`      |
| `cancelDelivery`        | `fulfillment.delivery.cancel` |
| `closeDelivery`         | `fulfillment.delivery.close`  |
| get/list                | `fulfillment.delivery.read`   |

Application route checks remain additional protection.

---

## 10. Add module-manifest conformance

The package should export `src/module.manifest.ts` with:

* module id and `R1-F` band;
* Delivery, Pick, Pack, and POD ownership;
* command/query IDs;
* mutation tables;
* permissions;
* authorization maps;
* events;
* dependencies and integrations.

Suggested shape:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "sales", style: "ports" },
  { moduleId: "inventory", style: "events" },
  { moduleId: "receivables", style: "events" },
],
```

Include Receivables only if a posted Delivery actually supports invoice orchestration.

---

# Reliability gaps

## 11. Idempotency is missing

Natural delivery codes do not protect against command retries or duplicate events.

Every material mutation should receive:

```ts
type FulfillmentMutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

Particularly important for:

* Delivery creation;
* pick confirmation;
* pack confirmation;
* posting;
* POD recording;
* downstream Inventory issue creation.

Recommended behavior:

```text
Same idempotency key + same payload:
  return original result.

Same idempotency key + different payload:
  return IDEMPOTENCY_CONFLICT.

Duplicate source event:
  create no duplicate Delivery or stock issue.
```

---

## 12. Concurrency scenarios need explicit tests

Required races:

| Race                                                | Required behavior                                    |
| --------------------------------------------------- | ---------------------------------------------------- |
| Two pick confirmations against the same line        | No over-pick                                         |
| Two deliveries against the same Sales Order balance | No over-fulfillment                                  |
| Delivery post and cancellation concurrently         | One valid transition                                 |
| Duplicate post                                      | One posted Delivery and one downstream issue request |
| POD submitted twice                                 | One effective outcome                                |
| Reservation release concurrent with picking         | Deterministic rejection or success                   |
| Delivery posting while Sales Order closes           | Posting-time validation decides                      |

A simple pre-read followed by a later update is not sufficient.

---

## 13. The same-transaction statement needs clarification

The README says:

> delivery, audit, and outbox facts commit within the package transaction boundary

Clarify exactly what commits:

```text
Delivery aggregate changes
+ line/pick/pack/POD changes
+ audit fact
+ outbox event
= one atomic commit
```

Inventory balance or stock issue must **not** be implied as part of this transaction unless an approved cross-domain same-TX decision exists.

The Drizzle and memory implementations should exercise the same observable atomic contract, even if their internal mechanisms differ.

---

# Master Data and snapshot requirements

## 14. Commercial and logistics snapshots are missing

At posting, Fulfillment should freeze:

### Delivery header

* customer code and name;
* ship-to name and address;
* delivery destination;
* carrier and service, where supported;
* delivery date;
* Sales Order reference;
* warehouse reference.

### Delivery line

* item code and description;
* entered UoM;
* conversion used;
* base quantity;
* posted quantity;
* Sales Order line reference;
* relevant lot or serial references only when supported.

Later Master Data changes must not rewrite posted delivery history.

---

## 15. Warehouse model is incomplete

Decide whether Fulfillment supports:

* one warehouse per Delivery;
* warehouse per line;
* bin/location;
* multiple source warehouses;
* cross-dock.

Recommended v1:

```text
One source warehouse per Delivery.
Every line must use that warehouse.
Bin, lot, serial, and multi-warehouse picking are outside v1.
```

Alternatively, support line-level warehouse explicitly. Do not leave the behavior implicit.

---

# Events

## 16. Event coverage is incomplete

Current events:

```text
delivery.created
pick.confirmed
delivery.posted
delivery.completed
```

Likely additions:

```text
fulfillment.delivery.cancelled.v1
fulfillment.pack.confirmed.v1
fulfillment.proof_of_delivery.recorded.v1
fulfillment.delivery.delivered.v1
fulfillment.delivery.closed.v1
```

Only emit events for real implemented transitions.

Clarify:

```text
@afenda/fulfillment decides when to emit.
@afenda/events owns names, versions, and payload schemas.
```

Every event should include:

* organization;
* Delivery ID/version;
* source Sales Order;
* warehouse;
* quantities;
* correlation and causation;
* actor;
* occurred-at timestamp;
* idempotency or source reference.

---

# Queries

## 17. `listDeliveries` needs governed filtering and sorting

Useful filters:

* status;
* customer;
* Sales Order;
* warehouse;
* planned delivery date;
* posted date;
* delivered date;
* carrier reference;
* POD status.

Allowlisted sorts might include:

```text
updatedAt:desc
createdAt:desc
plannedDeliveryAt:asc
postedAt:desc
deliveredAt:desc
```

Every cursor sort needs a stable identifier tie-breaker.

Example:

```text
plannedDeliveryAt ASC, id ASC
```

---

# Errors and exports

## 18. Fulfillment-specific errors should be package-owned

Examples:

```ts
export const fulfillmentErrorCodes = {
  deliveryNotFound: "fulfillment.delivery.not_found",
  deliveryVersionConflict: "fulfillment.delivery.version_conflict",
  invalidDeliveryTransition: "fulfillment.delivery.invalid_transition",
  salesOrderNotFulfillable: "fulfillment.sales_order.not_fulfillable",
  quantityExceedsRemaining: "fulfillment.quantity.exceeds_remaining",
  pickExceedsReserved: "fulfillment.pick.exceeds_reserved",
  packExceedsPicked: "fulfillment.pack.exceeds_picked",
  podAlreadyRecorded: "fulfillment.pod.already_recorded",
  inventoryIssuePending: "fulfillment.inventory_issue.pending",
} as const;
```

`@afenda/errors` should own the generic `Result`, not Fulfillment business vocabulary.

## 19. Keep persistence and testing adapters out of the root surface

Recommended exports:

| Path                                   | Contents                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `@afenda/fulfillment`                  | Public commands, queries, schemas, types, permissions, IDs, errors, manifest |
| `@afenda/fulfillment/contracts`        | Sales, Inventory, Master Data, and authorization ports                       |
| `@afenda/fulfillment/adapters/drizzle` | Production persistence                                                       |
| `@afenda/fulfillment/testing`          | Memory store and fixtures                                                    |

---

# Operations and reconciliation

## 20. Add fulfillment reconciliation

Required checks:

```text
Delivery posted quantity
≤ packed quantity
≤ picked quantity
≤ requested quantity
```

Across integrations:

```text
Fulfillment posted quantity
↔ Inventory issued quantity
```

and:

```text
Sales ordered quantity
- Fulfillment posted quantity
= remaining fulfillable quantity
```

Operational exception views should include:

* posted Deliveries without Inventory issue;
* Inventory issues without posted Deliveries;
* Deliveries stuck in picking;
* packed but unposted Deliveries;
* posted Deliveries without POD past expected date;
* partially delivered quantities;
* duplicate or rejected downstream events.

---

# Recommended invariant section

```md
## Invariants

- Every Delivery belongs to one organization.
- Sales Order, item, UoM, warehouse, and customer references must belong to that organization.
- Only posted Sales Orders may source new Deliveries.
- Fulfillment never writes Sales or Inventory tables.
- Picked quantity cannot exceed requested or authorized quantity.
- Packed quantity cannot exceed picked quantity.
- Posted quantity cannot exceed packed quantity.
- Reservations are owned and consumed by Inventory.
- Posted Deliveries are immutable.
- Pre-post Deliveries may be cancelled.
- Posted corrections use explicit return or compensating processes.
- POD records delivery evidence and outcome without rewriting posted quantities.
- Every public operation is authorized, idempotent, and concurrency-safe.
- Delivery changes, audit facts, and outbox events commit or roll back together.
```

# Recommended public surface

```ts
createDraftDelivery;
addDeliveryLine;

startPicking;
confirmPick;
confirmPack;

postDelivery;
recordProofOfDelivery;
closeDelivery;

cancelDelivery;

getDeliveryById;
listDeliveries;
```

A later package or slice can own returns. Do not overload `cancelDelivery` to reverse posted stock or customer delivery history.

# Priority order

```text
1. Define the exact Delivery lifecycle
2. Add the Sales fulfillable-order query port
3. Define Inventory reservation and issue integration
4. Specify partial pick, pack, shipment, and delivery quantities
5. Add package-internal fine-grained authorization
6. Add idempotency and concurrency controls
7. Define POD evidence and outcomes
8. Add missing transition events
9. Add reconciliation and operational exception reporting
10. Add module manifest and export boundaries
```

The immediate blocker is the boundary between **Fulfillment picking** and **Inventory reservations/issues**. Fulfillment records warehouse execution; Inventory remains the only authority that changes reserved, available, and on-hand stock.
