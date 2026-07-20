# Review verdict

This is a **good Inventory package README**, but Inventory needs a stricter contract than Sales or Purchasing because a small concurrency defect can corrupt stock availability across the whole ERP.

**Current score: 8.5/10.**

Strong areas:

* Inventory is the sole stock mutation owner.
* Master Data remains read-only to Inventory.
* Balance, ledger, reservation, audit, and outbox effects are intended to commit atomically.
* Posted movements are not deleted.
* Optimistic concurrency is already acknowledged.
* Receiving, Fulfillment, and Purchasing are correctly excluded from direct stock-table ownership.
* Post-nesting link depth is partly corrected.

The primary gaps are:

1. unclear authority between ledger and balance;
2. reservation modeled both as a movement type and a separate aggregate;
3. insufficient transfer semantics;
4. no negative-stock policy;
5. generic movement commands could bypass Receiving and Fulfillment;
6. concurrency and idempotency requirements are not strong enough;
7. no stock reconciliation contract.

---

# Blocking findings

## 1. Declare the inventory ledger as the authoritative stock truth

The README lists both:

```text
stock_balance
stock_ledger_entry
```

but does not say which is authoritative.

Recommended rule:

```text
stock_ledger_entry is the immutable quantity history.

stock_balance is the current operational projection maintained atomically
from posted ledger entries.

If stock_balance and the ledger disagree, the ledger is authoritative and
the balance must be repaired through a controlled rebuild procedure.
```

The balance must never be mutated independently from a posted movement.

### Ownership model

| Surface               | Purpose                                       |
| --------------------- | --------------------------------------------- |
| `stock_movement`      | Business instruction and lifecycle            |
| `stock_movement_line` | Requested stock effects                       |
| `stock_ledger_entry`  | Immutable posted quantity facts               |
| `stock_balance`       | Current quantity projection                   |
| `stock_reservation`   | Active and historical commitments             |
| Availability query    | Computed from balance and active reservations |

Recommended invariant:

```text
Every stock_balance change must be explainable by one or more
stock_ledger_entry rows.
```

---

## 2. Reservation is currently modeled twice

The README says movement types include:

```text
reservation
reservation_release
```

but also exposes:

```ts
reserveStock;
releaseReservation;
```

and owns:

```text
stock_reservation
```

This creates two possible models:

* reservations are stock movements;
* reservations are a separate aggregate.

Choose one.

### Recommended model

Reservations should be a separate aggregate:

```text
Stock Movement:
  receipt
  issue
  transfer
  adjustment

Stock Reservation:
  active
  partially_consumed
  consumed
  released
  expired
  cancelled
```

Reservations change:

```text
reserved quantity
available quantity
```

They do **not** change:

```text
on-hand quantity
stock ledger quantity
```

Therefore remove these from movement types:

```text
reservation
reservation_release
```

A reservation may later be consumed by an issue movement, but the two records remain separate and linked.

---

## 3. Transfer semantics are incomplete

The example accepts one:

```ts
warehouseId
```

but a transfer requires at least:

```text
sourceWarehouseId
destinationWarehouseId
```

A transfer also requires paired, atomic effects:

```text
Source warehouse: negative quantity
Destination warehouse: positive quantity
Net organization quantity: zero
```

Recommended discriminated input:

```ts
type CreateStockMovementInput =
  | {
      movementType: "receipt";
      organizationId: string;
      destinationWarehouseId: WarehouseId;
    }
  | {
      movementType: "issue";
      organizationId: string;
      sourceWarehouseId: WarehouseId;
    }
  | {
      movementType: "transfer";
      organizationId: string;
      sourceWarehouseId: WarehouseId;
      destinationWarehouseId: WarehouseId;
    }
  | {
      movementType: "adjustment";
      organizationId: string;
      warehouseId: WarehouseId;
      adjustmentReasonCode: string;
    };
```

Required transfer invariants:

```text
Source and destination must differ.
Both warehouses must belong to the same organization.
Both warehouses must be active.
Every transfer line must conserve quantity.
All source and destination ledger effects commit atomically.
A transfer cannot post only one side.
```

If in-transit inventory is not supported, state that explicitly. Do not simulate it accidentally using an incomplete transfer.

---

## 4. Define the negative-stock policy

The README does not say whether an issue may reduce stock below zero.

This decision must be explicit.

### Recommended default

```text
Negative on-hand stock is forbidden by default.

A receipt increases on-hand.
An issue or transfer-out requires sufficient on-hand quantity.
A reservation requires sufficient available quantity.
An adjustment may cross zero only under a separately authorized
negative-stock override policy.
```

If negative stock is allowed for selected organizations or items, that is a future governed policy—not an implicit behavior.

The check and balance update must occur atomically. A pre-read followed by a later update is not safe under concurrency.

---

## 5. Generic stock movements could bypass business modules

The public API allows:

```ts
createStockMovement({
  movementType: "receipt"
});
```

That may allow an app action to create a stock receipt without:

* a Goods Receipt from Receiving;
* an approved return;
* an opening-balance process;
* a manual adjustment reason.

Likewise, an `issue` could bypass Fulfillment.

### Recommended source policy

Every movement must declare its source:

```ts
type InventoryMovementSource =
  | {
      kind: "receiving";
      documentId: string;
      documentLineId?: string;
    }
  | {
      kind: "fulfillment";
      documentId: string;
      documentLineId?: string;
    }
  | {
      kind: "manual_adjustment";
      reasonCode: string;
      evidenceReference?: string;
    }
  | {
      kind: "opening_balance";
      batchId: string;
    }
  | {
      kind: "transfer";
      transferReference?: string;
    };
```

Recommended rules:

| Movement   | Permitted source                                          |
| ---------- | --------------------------------------------------------- |
| Receipt    | Receiving, return, opening balance, controlled adjustment |
| Issue      | Fulfillment, consumption, controlled adjustment           |
| Transfer   | Inventory transfer command                                |
| Adjustment | Manual adjustment with reason and elevated permission     |

Inventory must not import Receiving or Fulfillment directly. The composition root invokes Inventory through a port or versioned event.

---

## 6. Natural-key uniqueness is not idempotency

This statement:

```text
duplicate normalizedCode returns CONFLICT
```

does not protect against retries after:

* an HTTP timeout;
* duplicate event delivery;
* application worker restart;
* uncertain transaction response.

Material commands need a real idempotency key.

```ts
type InventoryMutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

For downstream-generated stock movements, also persist:

```text
source module
source aggregate ID
source event ID
source event version
source line ID, where applicable
```

Recommended behavior:

```text
Same idempotency key + same payload:
  return the original outcome.

Same idempotency key + different payload:
  return IDEMPOTENCY_CONFLICT.

Same source event delivered twice:
  create no duplicate movement or ledger entry.
```

---

## 7. Concurrency requirements need to be explicit

Inventory balance and reservations are highly race-sensitive.

Required concurrent tests include:

| Race                                           | Expected result                                           |
| ---------------------------------------------- | --------------------------------------------------------- |
| Two issues against the same remaining stock    | At most one succeeds when combined quantity exceeds stock |
| Two reservations against the same availability | No over-reservation                                       |
| Reservation and issue at the same time         | Defined ordering and consistent availability              |
| Two releases of the same reservation           | One effective release only                                |
| Duplicate posting                              | No duplicate ledger or balance effect                     |
| Transfer and issue from the same source        | No lost update                                            |
| Adjustment concurrent with posting             | Versioned deterministic result                            |

The implementation must use an atomic balance mutation strategy such as:

* guarded SQL update;
* version/CAS update;
* appropriately locked transaction;
* another proven single-commit mechanism.

Do not rely on:

```text
read current balance
→ check in application
→ update later
```

---

# Authorization and module governance

## 8. Package-internal authorization is missing

The README mentions composition-root authorization ports, but every public operation must enforce authorization inside the package.

Recommended port:

```ts
export interface InventoryAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: InventoryPermission;
  }): Promise<boolean>;
}
```

The existing permissions:

```text
inventory.read
inventory.manage
```

are too broad.

Recommended minimum:

```ts
export const inventoryPermissions = {
  movementRead: "inventory.movement.read",
  movementCreate: "inventory.movement.create",
  movementPost: "inventory.movement.post",
  movementCancel: "inventory.movement.cancel",

  reservationRead: "inventory.reservation.read",
  reservationCreate: "inventory.reservation.create",
  reservationRelease: "inventory.reservation.release",

  availabilityRead: "inventory.availability.read",
  adjustmentPost: "inventory.adjustment.post",
} as const;
```

An adjustment should not share the same permission as an ordinary receipt or issue.

### Operation map

| Operation                 | Permission                      |
| ------------------------- | ------------------------------- |
| `createStockMovement`     | `inventory.movement.create`     |
| `addStockMovementLine`    | `inventory.movement.create`     |
| `postStockMovement`       | `inventory.movement.post`       |
| `cancelStockMovement`     | `inventory.movement.cancel`     |
| `reserveStock`            | `inventory.reservation.create`  |
| `releaseReservation`      | `inventory.reservation.release` |
| `getStockMovementById`    | `inventory.movement.read`       |
| `listStockMovements`      | `inventory.movement.read`       |
| `getStockAvailability`    | `inventory.availability.read`   |
| Manual adjustment posting | `inventory.adjustment.post`     |

---

## 9. Permission constants must remain Inventory-owned

This command may persist the catalog:

```bash
pnpm --filter @afenda/db db:ensure-permission-catalog
```

But `@afenda/db` must not define Inventory permission codes.

Correct flow:

```text
@afenda/inventory
  owns constants and authorization mappings

module.manifest.ts
  exports them

generated permission register
  aggregates them

@afenda/db ensure command
  persists the generated catalog
```

---

## 10. Add module-manifest conformance

Add a section stating that `src/module.manifest.ts` declares:

* `R1-F` band;
* Stock Movement and Stock Reservation aggregates;
* exact command and query IDs;
* mutation tables;
* Inventory permission codes;
* operation authorization mappings;
* emitted and consumed events;
* Master Data dependency;
* optional integrations.

Example:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "receiving", style: "events" },
  { moduleId: "fulfillment", style: "events" },
  { moduleId: "sales", style: "ports" },
],
```

Only declare integrations actually supported on disk.

---

# Inventory business contract gaps

## 11. Define the stock balance key

The README should define the exact stock dimension.

A v1 baseline might be:

```text
organization_id
warehouse_id
item_id
base_uom_id
```

Logical uniqueness:

```text
one stock balance per organization + warehouse + item
```

Because `md_item` already owns the base UoM, storing `base_uom_id` may be useful as a frozen consistency field but should not create multiple balances for the same item accidentally.

If bins, lots, serial numbers, status, owner, or expiry are not supported, explicitly state:

```text
V1 stock dimension excludes:
- bin/location;
- lot/batch;
- serial number;
- expiry date;
- quality status;
- consignment owner.
```

Do not silently add nullable columns that imply incomplete support.

---

## 12. Define quantity and UoM conversion behavior

Movement lines may use an operational UoM, but balances should use the item base UoM.

Recommended line snapshot:

```text
entered quantity
entered UoM
conversion numerator
conversion denominator
base quantity
item code and description snapshot
warehouse code snapshot
```

Required rules:

```text
The selected UoM must be valid for the item.
Conversion must be dimensionally valid.
Base quantity is calculated deterministically.
The conversion used at posting is frozen.
Later Master Data conversion changes do not rewrite posted movements.
Balance and ledger quantities use base UoM.
```

Avoid binary floating-point quantity calculations.

---

## 13. Define stock availability precisely

The README exports:

```ts
getStockAvailability
```

but does not define the result.

Recommended v1 formula:

```text
availableQuantity = onHandQuantity - activeReservedQuantity
```

Recommended result:

```ts
type StockAvailability = {
  organizationId: string;
  warehouseId: string;
  itemId: string;
  baseUomId: string;
  onHandQuantity: DecimalString;
  reservedQuantity: DecimalString;
  availableQuantity: DecimalString;
  asOfLedgerSequence: string;
};
```

Do not include expected receipts or planned issues in “available” unless the package defines separate ATP or projected-availability semantics.

---

## 14. Reservation lifecycle is incomplete

Recommended reservation states:

```ts
type StockReservationStatus =
  | "active"
  | "partially_consumed"
  | "consumed"
  | "released"
  | "expired"
  | "cancelled";
```

Required invariants:

```text
Reserved quantity is positive.
Active reserved quantity cannot exceed available stock.
Release cannot exceed remaining reserved quantity.
Consumed quantity cannot exceed reserved quantity.
Released or consumed reservations are immutable.
Reservation references its business source.
Expiry does not silently occur without a recorded transition.
```

A future Fulfillment flow should consume reservations explicitly rather than merely releasing them before issuing stock.

---

## 15. Draft movement cancellation is needed

The README says:

> no cancel/void command yet

A posted movement should never be voided or deleted. It should be corrected with a compensating movement.

But an unused draft needs a terminal state.

Recommended lifecycle:

```text
draft → posted
draft → cancelled
posted → reversed through a new compensating movement
```

Add:

```ts
cancelStockMovement;
createReversalMovement;
```

or keep reversal package-internal initially while exposing an explicit controlled command.

Avoid using “void” for posted stock history.

---

## 16. Adjustment controls need to be stronger

Adjustments require:

* reason code;
* positive or negative direction;
* explanatory note;
* evidence reference when required;
* elevated permission;
* actor attribution;
* optional approval reference;
* before/after quantity;
* reconciliation linkage.

A generic `movementType: "adjustment"` without these controls is too powerful.

---

# Accounting and valuation boundary

## 17. Clarify whether Inventory owns quantity only or value as well

`stock_ledger_entry` may be interpreted as either:

* quantity ledger;
* inventory valuation ledger.

The README should decide.

Recommended Phase 4 boundary:

```text
@afenda/inventory owns physical quantity movements, reservations,
quantity ledger and current quantity balances.

@afenda/accounting owns general-ledger financial postings.

Inventory valuation methods and cost-layer ownership are outside v1
unless explicitly authorized.
```

If Inventory already stores unit cost or extended value, define:

* cost source;
* valuation method;
* currency;
* rounding;
* revaluation behavior;
* Accounting posting boundary.

Do not leave partial valuation semantics implicit.

---

# Operations and reconciliation

## 18. Add an Inventory reconciliation contract

At minimum, provide checks for:

```text
For every stock key:
  opening quantity
  + posted receipt quantity
  - posted issue quantity
  ± posted adjustment quantity
  + transfer-in
  - transfer-out
  = current on-hand balance
```

Also verify:

```text
active reservations total = stock_balance.reserved quantity
available = on-hand - reserved
every posted movement has ledger entries
every ledger entry references one posted movement
every balance change is represented in the ledger
every transfer has balanced source/destination effects
```

This should be a command or report such as:

```bash
pnpm --filter @afenda/inventory reconcile
```

or a centrally owned validation surface.

---

## 19. The operations-closure wording is not sufficient

The README says:

> dedicated mutation metrics dashboards / Ops runbook not package-local yet

If Phase 4.2 is marked Done, either:

* link the central dashboard and runbook; or
* classify the slice as implementation-complete but operations-closure open.

Inventory particularly needs metrics for:

```text
movement posting success/failure
balance conflicts
negative-stock rejection
reservation conflicts
idempotency replays
ledger/balance reconciliation drift
transfer failures
```

---

## 20. Tighten repair guidance

Replace:

```text
repair via compensating movements or data-lane SQL under Ops
```

with:

```text
Business corrections use compensating movements.

Direct data-lane repair is exceptional and requires:
- owner-approved repair procedure;
- organization-bounded scope;
- pre-repair reconciliation evidence;
- backup or rollback plan;
- audit attribution;
- post-repair reconciliation;
- prohibition on deleting posted ledger history.
```

---

# Architecture hardening

## 21. Memory and production adapters still exercise different paths

The same concern remains:

```text
Memory store uses MutationPorts.
Drizzle store embeds audit/outbox SQL and ignores those ports.
```

Both implementations should expose the same atomic outcome contract:

```text
movement/reservation mutation
+ ledger/balance effects
+ audit fact
+ outbox event
= one commit
```

The implementation mechanism can differ, but the test abstraction should not describe behavior unused by production.

---

## 22. Split production and testing exports

Recommended exports:

| Import path                          | Contents                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `@afenda/inventory`                  | Public commands, queries, schemas, types, permissions, operation IDs, errors, manifest |
| `@afenda/inventory/contracts`        | Authorized composition ports                                                           |
| `@afenda/inventory/adapters/drizzle` | Production persistence                                                                 |
| `@afenda/inventory/testing`          | Memory store and test fixtures                                                         |

Do not export `MemoryInventoryStore` from the normal production barrel.

---

## 23. Inventory-specific errors belong in Inventory

Correct ownership:

| Concern                               | Owner               |
| ------------------------------------- | ------------------- |
| Generic `Result` and error primitives | `@afenda/errors`    |
| Inventory-specific error codes        | `@afenda/inventory` |
| HTTP and ActionResult mapping         | `apps/web`          |

Examples:

```ts
export const inventoryErrorCodes = {
  movementNotFound: "inventory.movement.not_found",
  movementAlreadyPosted: "inventory.movement.already_posted",
  movementVersionConflict: "inventory.movement.version_conflict",
  insufficientOnHand: "inventory.stock.insufficient_on_hand",
  insufficientAvailable: "inventory.stock.insufficient_available",
  reservationNotFound: "inventory.reservation.not_found",
  reservationAlreadyReleased: "inventory.reservation.already_released",
  invalidTransfer: "inventory.transfer.invalid",
  invalidUomConversion: "inventory.uom.invalid_conversion",
  duplicateSourceEvent: "inventory.source_event.duplicate",
} as const;
```

---

# Link review

Assuming the file is:

```text
packages/erp/inventory/README.md
```

these should likely be:

```md
../../../docs-V2/master-data/arch-006-consumer-contract.md
../../../docs-V2/master-data/README.md
../../../docs-V2/monorepo/README.md
../../../docs-V2/events/README.md
../../data-plane/events/README.md
../../../docs-V2/tenancy/README.md
../../../AGENTS.md
```

The existing `@afenda/events` and `AGENTS.md` paths appear corrected, while several `docs-V2` links still appear one level too shallow.

---

# Recommended invariant section

```md
## Invariants

- Inventory is the sole mutator of stock movement, ledger, balance and reservation tables.
- Every stock row belongs to exactly one organization.
- Item, warehouse and UoM references must be active and valid within that organization.
- Posted movements are immutable.
- Draft movements may be cancelled.
- Posted corrections use linked compensating movements.
- The stock ledger is the immutable quantity authority.
- Stock balances are projections of posted ledger entries.
- Reservations affect reserved and available quantity, not on-hand quantity.
- Negative on-hand and over-reservation are rejected by default.
- Transfers conserve quantity and post both warehouse effects atomically.
- Movement UoM conversions are frozen at posting.
- Every material mutation is authorized, idempotent and concurrency-safe.
- Aggregate, ledger, balance, audit and outbox effects commit or roll back together.
- No peer module directly mutates Inventory tables.
```

# Priority order

```text
1. Separate reservation lifecycle from stock-movement types
2. Declare ledger authority and balance projection rules
3. Define negative-stock and availability policies
4. Fix transfer inputs and atomic paired effects
5. Prevent generic movements from bypassing Receiving/Fulfillment
6. Add source-event and command idempotency
7. Add concurrency and over-reservation tests
8. Define package-internal authorization mappings
9. Add cancellation and compensating movement semantics
10. Add reconciliation, metrics and recovery evidence
```

The most urgent issue is the current combination of:

```text
movement types: reservation / reservation_release
```

and:

```text
separate stock_reservation aggregate
```

That creates two competing authorities for reserved quantity. Keep reservations as a dedicated aggregate and keep the stock ledger limited to actual physical quantity effects.
