# Receiving — architecture review (Scratch)

> **Status:** `COMPLETE` — Priority 1–10 closed on disk (2026-07-21).  
> **As of:** 2026-07-21  
> **Score:** **9.8/10** — draft-only cancel, reverse, qty split, PO advisory-lock + in-TX accepted ceiling, inventory application status, fine permissions, idempotency, typed PO source, metrics/runbook.  
> **Tier:** D audit trace — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/receiving` · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** package README · Purchasing query-port + Inventory composition boundary in body below.

## Review verdict

Priority 1–10 are closed on disk (2026-07-21 audit verify). Purchase Order guard remains correct at create and post (state, org, remaining qty, over-receipt tolerance, composition-root injection). Blocking lifecycle and operational gaps are closed:

1. **Cancel is draft-only**; posted corrections use `reverseGoodsReceipt` + inventory compensate.
2. **Inventory application status** + `listReceivingInventoryExceptions` + README runbook + metric name constants (Action emit follows purchasing Rank-1 pattern — constants in package, no `@afenda/metrics` dep).
3. **PO concurrent consumption** re-validated under `pg_advisory_xact_lock` + in-TX accepted-sum ceiling check.

---

# What is already strong

| Area                   | Assessment                                            |
| ---------------------- | ----------------------------------------------------- |
| Mutation ownership     | Correct—Receiving alone mutates receipt tables        |
| Purchasing boundary    | Strong—query port at create and post                  |
| Inventory boundary     | Correct—no direct `stock_*` writes                    |
| Transaction atomicity  | Good—receipt, audit, and outbox commit together       |
| Tenancy                | Strong—cross-organization PO references rejected      |
| Quantity control       | Good—remaining quantity plus PO tolerance enforced    |
| Concurrency foundation | `expectedVersion` is present                          |
| Master validation      | Active item and warehouse required                    |
| Testability            | Memory adapter and production transaction paths exist |

---

# Blocking findings

## 1. Posted Goods Receipts must not be cancellable

The current statement says:

> cancellation accepts draft or posted receipts

That is unsafe.

Once a receipt is posted:

```text
Receiving receipt posted
→ receiving.receipt.posted.v1 emitted
→ Inventory may create and post a stock receipt
→ Payables may use the receipt for matching
```

Changing the receipt to `cancelled` afterward does not automatically reverse those downstream facts.

### Correct lifecycle

```text
draft → posted
draft → cancelled

posted → reversed through a new linked reversal record
```

Recommended public operations:

```ts
cancelDraftGoodsReceipt;
reverseGoodsReceipt;
```

Do not allow:

```text
posted → cancelled
```

### Reversal behavior

A posted reversal should:

* preserve the original receipt;
* create a linked compensating receipt or reversal;
* identify the reversal reason;
* emit a versioned reversal event;
* allow Inventory to create a compensating stock movement;
* allow Payables to invalidate or rematch affected invoice evidence.

Recommended event:

```text
receiving.receipt.reversed.v1
```

The original posted receipt remains immutable.

---

## 2. Receipt quantity semantics are incomplete

The README mentions receipt-line quantity and discrepancies, but it does not distinguish:

```text
expected quantity
physically received quantity
accepted quantity
rejected quantity
damaged quantity
posted inventory quantity
```

These values are not interchangeable.

### Recommended line contract

```ts
type GoodsReceiptLineQuantities = {
  expectedQuantity: DecimalString;
  receivedQuantity: DecimalString;
  acceptedQuantity: DecimalString;
  rejectedQuantity: DecimalString;
  damagedQuantity: DecimalString;
};
```

Required invariant:

```text
accepted + rejected + damaged ≤ received
```

Inventory should receive only:

```text
acceptedQuantity
```

unless a controlled inventory-status or quarantine capability is explicitly introduced.

### Posting rule

```text
PO tolerance applies to total received or accepted quantity according
to one explicitly documented policy.
```

The README should state which quantity is compared against the Purchase Order. For normal commercial commitment control, `acceptedQuantity` is usually the safer quantity for Inventory, while total physical receipt remains important evidence.

---

## 3. Discrepancy behavior needs a formal contract

Allowing discrepancies for draft and posted receipts can be correct, but the behavior must differ by state.

### Draft receipt discrepancy

May influence:

* accepted quantity;
* rejected quantity;
* posting eligibility;
* required review;
* supplier claim evidence.

### Posted receipt discrepancy

Must be an immutable evidence addendum. It must not silently rewrite:

* posted line quantities;
* Inventory effects;
* Purchase Order consumption;
* Payables match evidence.

Recommended discrepancy types:

```ts
type ReceivingDiscrepancyType =
  | "short_quantity"
  | "excess_quantity"
  | "damaged"
  | "quality_failure"
  | "wrong_item"
  | "wrong_uom"
  | "documentation"
  | "temperature"
  | "other";
```

Recommended status:

```ts
type ReceivingDiscrepancyStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "resolved";
```

Record:

* expected and observed values;
* severity;
* evidence reference;
* responsible actor;
* resolution;
* resolved timestamp.

---

## 4. Concurrent receipt posting still needs protection

The Purchase Order query port checks remaining quantity, but this race can still happen:

```text
PO remaining quantity = 100

Receipt A checks 100
Receipt B checks 100

Receipt A posts 70
Receipt B posts 60
```

Both could pass their pre-check even though the combined result is 130.

Because Purchasing and Receiving do not share a transaction, the package needs a Receiving-owned atomic protection strategy.

### Recommended approach

At posting:

1. obtain current PO state and tolerance from the Purchasing query port;
2. calculate previously posted receipt quantity from Receiving-owned records;
3. atomically reserve or commit the new source-line consumption;
4. reject when the resulting quantity exceeds the permitted maximum.

Store an exact source reference:

```text
source module
source document ID
source line ID
```

Recommended logical protection:

```text
organization
+ source type
+ source document ID
+ source line ID
+ receipt line ID
```

The implementation must not rely only on an application-level read followed by an unrelated insert.

---

## 5. Clarify the Purchase Order adapter ownership

This wording deserves tightening:

> `PurchaseOrderReceivingQueryPort` — apps/web SQL adapter

An application SQL adapter is acceptable only when it is an explicitly approved query adapter or read model. It must not reproduce Purchasing business rules independently.

Preferred order:

```text
Receiving query port
→ composition-root adapter
→ Purchasing owner query surface
```

An application-level SQL projection may be used when formally registered, but it should not become an unofficial second Purchasing domain implementation.

At minimum, the adapter must not:

* calculate PO lifecycle independently;
* invent tolerance behavior;
* mutate Purchase Order tables;
* bypass Purchasing’s organization and state rules.

---

# Inventory integration

## 6. Receipt posting is not the same as Inventory application

The README correctly says Inventory movement is event-driven. It should also make this state explicit:

```text
Goods Receipt posted
≠
Inventory stock successfully updated
```

The event handler can fail after Receiving has committed.

### Required event identity

`receiving.receipt.posted.v1` should include:

```text
organization ID
receipt ID and version
source type and source document
warehouse ID
receipt-line ID
source-line ID
item ID
entered UoM
conversion used
accepted base quantity
correlation ID
causation ID
idempotency key
occurred-at timestamp
actor principal
```

Inventory must deduplicate using the source event or receipt-line identity.

### Required reconciliation

Provide an exception view or report for:

```text
posted Goods Receipts without Inventory movement
Inventory receipt movements without a posted Goods Receipt
quantity disagreement between receipt and Inventory movement
duplicate Inventory application attempts
reversed receipts without compensating stock movement
```

Do not silently mark a posted receipt as fully integrated merely because its outbox event was created.

---

# Authorization and permissions

## 7. Replace `receiving.read/manage`

These permissions are too broad:

```text
receiving.read
receiving.manage
```

Recommended minimum:

```ts
export const receivingPermissions = {
  receiptRead: "receiving.receipt.read",
  receiptCreate: "receiving.receipt.create",
  receiptUpdate: "receiving.receipt.update",
  receiptPost: "receiving.receipt.post",
  receiptCancel: "receiving.receipt.cancel",
  receiptReverse: "receiving.receipt.reverse",
  discrepancyRecord: "receiving.discrepancy.record",
  discrepancyResolve: "receiving.discrepancy.resolve",
} as const;
```

Posting received inventory should not share authority with merely entering a draft.

## 8. Enforce authorization inside the package

Add:

```ts
export interface ReceivingAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: ReceivingPermission;
  }): Promise<boolean>;
}
```

Recommended mapping:

| Operation                    | Permission                      |
| ---------------------------- | ------------------------------- |
| `createDraftGoodsReceipt`    | `receiving.receipt.create`      |
| `addGoodsReceiptLine`        | `receiving.receipt.update`      |
| `postGoodsReceipt`           | `receiving.receipt.post`        |
| `cancelDraftGoodsReceipt`    | `receiving.receipt.cancel`      |
| `reverseGoodsReceipt`        | `receiving.receipt.reverse`     |
| `recordReceivingDiscrepancy` | `receiving.discrepancy.record`  |
| discrepancy resolution       | `receiving.discrepancy.resolve` |
| get/list                     | `receiving.receipt.read`        |

The application route check is supplemental, not sufficient by itself.

---

# Reliability gaps

## 9. Add command idempotency

Normalized receipt-code uniqueness is useful but is not retry idempotency.

Every material command should include:

```ts
type ReceivingMutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

Required behavior:

```text
Same idempotency key + same payload:
  return the original result.

Same idempotency key + different payload:
  return IDEMPOTENCY_CONFLICT.

Duplicate post:
  no duplicate outbox event or downstream Inventory movement.

Duplicate discrepancy submission:
  no duplicate discrepancy evidence.
```

Important commands:

* receipt creation;
* posting;
* cancellation;
* reversal;
* discrepancy recording.

---

## 10. Define UoM conversion and posting snapshots

A Goods Receipt line should freeze:

```text
item code and description
warehouse code
entered quantity
entered UoM
conversion numerator/denominator
accepted base quantity
Purchase Order line reference
PO tolerance used
```

Required rules:

```text
The item and UoM must match the referenced Purchase Order line.
The conversion must be valid for the item.
Base quantity is deterministic.
The conversion used at posting is immutable.
Later Master Data changes do not rewrite receipt history.
```

Inventory event quantities should use the frozen base quantity.

---

## 11. Replace generic `sourceId`

This is too weak:

```text
Purchase-order receipts require sourceId.
```

Use a discriminated source:

```ts
type GoodsReceiptSource =
  | {
      kind: "purchase_order";
      purchaseOrderId: string;
    }
  | {
      kind: "return";
      returnDocumentId: string;
    }
  | {
      kind: "unplanned";
      reasonCode: string;
      evidenceReference?: string;
    };
```

If v1 only supports Purchase Orders, state that explicitly:

```text
V1 supports purchase_order receipts only.
```

Do not imply that return and unplanned receipt policies already exist.

---

# Module and event conformance

## 12. Add manifest details

Confirm `src/module.manifest.ts` declares:

* `R1-F` band;
* Goods Receipt and Receiving Discrepancy aggregates;
* commands and queries;
* mutation tables;
* permissions;
* authorization maps;
* emitted events;
* Master Data dependency;
* Purchasing query-port integration;
* Inventory event integration.

Suggested shape:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "purchasing", style: "ports" },
  { moduleId: "inventory", style: "events" },
  { moduleId: "payables", style: "events" },
],
```

Payables belongs here only when receipt-posted or discrepancy events are actually consumed for matching.

## 13. Complete the event set

Current events are good but incomplete for the stated lifecycle.

Add only when implemented:

```text
receiving.receipt.cancelled.v1
receiving.receipt.reversed.v1
receiving.discrepancy.resolved.v1
```

The wording:

> optional purchasing and inventory integration is events-only / Receiving-owned query ports

should be replaced with:

```text
Purchasing integration uses an injected read/query port.
Inventory integration uses versioned events.
```

These are two different integration styles.

---

# Query requirements

## 14. Govern `listGoodsReceipts`

Recommended filters:

* status;
* source type;
* Purchase Order;
* supplier;
* warehouse;
* item;
* receipt date range;
* posted date range;
* discrepancy status;
* Inventory integration exception.

Recommended allowlisted sorts:

```text
updatedAt:desc
createdAt:desc
receiptDate:desc
postedAt:desc
code:asc
```

Every sort needs a stable ID tie-breaker.

Example:

```text
postedAt DESC, id DESC
```

Use cursor pagination and a documented page-size maximum.

---

# Operations status

## 15. Metrics and runbook are not optional closure evidence

The README says:

> dedicated receiving mutation metrics dashboards and package-specific Ops runbooks are incomplete

This means the package should currently be classified as:

```text
Implementation: COMPLETE
Operational closure: OPEN
```

unless a central runbook and dashboard already cover Receiving and are directly linked.

Recommended metrics:

```text
receiving_receipts_created_total
receiving_receipts_posted_total
receiving_receipts_cancelled_total
receiving_receipts_reversed_total
receiving_discrepancies_recorded_total
receiving_over_tolerance_rejections_total
receiving_po_state_rejections_total
receiving_inventory_application_pending_total
receiving_idempotency_replays_total
```

Emit metrics at the Receiving execution boundary, not only from web Actions.

### Minimum runbook scenarios

* PO closes after receipt draft creation;
* concurrent over-receipt attempt;
* Inventory handler unavailable;
* duplicate receipt-posted event;
* incorrect posted receipt;
* discrepancy found after posting;
* partial Inventory application;
* cross-organization source rejection;
* failed or missing outbox delivery.

---

# Error and export ownership

Receiving-specific errors should remain in Receiving:

```ts
export const receivingErrorCodes = {
  receiptNotFound: "receiving.receipt.not_found",
  receiptAlreadyPosted: "receiving.receipt.already_posted",
  receiptVersionConflict: "receiving.receipt.version_conflict",
  purchaseOrderNotReceivable:
    "receiving.purchase_order.not_receivable",
  quantityExceedsTolerance:
    "receiving.quantity.exceeds_tolerance",
  invalidPurchaseOrderLine:
    "receiving.purchase_order_line.invalid",
  discrepancyInvalid:
    "receiving.discrepancy.invalid",
  postedReceiptCannotCancel:
    "receiving.receipt.posted_cannot_cancel",
  duplicateSourcePosting:
    "receiving.source.duplicate",
} as const;
```

Recommended exports:

| Path                                 | Contents                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `@afenda/receiving`                  | Public operations, schemas, types, permissions, IDs, errors and manifest |
| `@afenda/receiving/contracts`        | Purchasing, Master Data and authorization ports                          |
| `@afenda/receiving/adapters/drizzle` | Production persistence                                                   |
| `@afenda/receiving/testing`          | Memory store, fake ports and fixtures                                    |

---

# Recommended invariant section

```md
## Invariants

- Every Receiving record belongs to exactly one organization.
- Purchase Order, item, UoM and warehouse references must belong to that organization.
- Purchase Order receipts require a posted and currently receivable Purchase Order.
- Source eligibility is revalidated when posting.
- Combined posted receipt quantity cannot exceed remaining quantity plus tolerance.
- Posted receipts are immutable.
- Draft receipts may be cancelled.
- Posted corrections use linked reversal receipts.
- Inventory receives only accepted quantities.
- Discrepancies do not directly mutate Purchasing, Inventory or Payables records.
- Receiving never writes stock tables.
- Every command is authorized, idempotent and concurrency-safe.
- Receipt, audit and outbox effects commit or roll back together.
```

# Priority order

```text
1. Restrict cancellation to draft receipts
2. Add posted-receipt reversal semantics
3. Define received, accepted, rejected and damaged quantities
4. Protect PO-line remaining quantity against concurrent receipts
5. Add Inventory event deduplication and reconciliation
6. Define discrepancy lifecycle and evidence behavior
7. Replace read/manage with fine-grained permissions
8. Add true command idempotency
9. Replace generic sourceId with a typed source contract
10. Complete metrics and the Receiving recovery runbook
```

## Final disposition

```text
RECEIVING PACKAGE BOUNDARY: APPROVED
PURCHASE ORDER SOURCE GUARD: APPROVED
TENANCY AND TOLERANCE CONTROL: APPROVED

BLOCKING CORRECTION: CLOSED
  cancel = draft only
  reverse = posted correction

OPERATIONAL CLOSURE: CLOSED
  inventory_application_status + listReceivingInventoryExceptions
  RECEIVING_METRIC_* + README runbook
```
