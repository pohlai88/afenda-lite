# Review verdict

This is a solid **package overview**, but it is not yet sufficient as Phase 4.5 enterprise closure evidence.

**Current score: 7.0/10**

The package correctly establishes:

* Receivables as the sole owner of customer invoices, credits, allocations, and AR balances;
* `@afenda/db` as schema owner;
* no direct Sales, Payments, Accounting, or journal-table writes;
* Master Data as the customer/item identity boundary;
* optimistic concurrency and versioned events.

The main unresolved risks are:

1. customer receipt allocation overlaps with Payments;
2. invoice source and over-invoicing controls are undefined;
3. posted invoices may appear cancellable;
4. customer balance projection authority is unclear;
5. permissions are too broad;
6. idempotency, atomicity, and reconciliation are missing.

---

# Blocking findings

## 1. Clarify Receivables versus Payments allocation ownership

The current surface exposes:

```ts
allocateCustomerReceipt;
```

while Payments owns payment application instructions.

The correct boundary should be:

| Concern                                        | Owner                            |
| ---------------------------------------------- | -------------------------------- |
| Receipt amount, payment account and settlement | `@afenda/payments`               |
| Intended customer invoice targets              | Payments application instruction |
| Application against customer invoices          | `@afenda/receivables`            |
| Customer outstanding balance                   | `@afenda/receivables`            |
| General-ledger posting                         | `@afenda/accounting`             |

Receivables may continue owning `customer_allocation`, but the command should make clear that it applies an **existing posted Payment**.

Recommended naming:

```ts
applyCustomerReceipt;
reverseCustomerReceiptApplication;
```

Recommended input:

```ts
type ApplyCustomerReceiptInput = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;

  paymentId: string;
  paymentApplicationInstructionId: string;
  salesInvoiceId: string;
  amount: DecimalString;
  expectedInvoiceVersion: number;
};
```

Receivables must not create, settle, reverse, or infer a Payment.

---

## 2. Define the Sales invoice source contract

Receivables must know what may be invoiced without directly reading Sales or Fulfillment tables.

Supported sources should be explicit:

```ts
type SalesInvoiceSource =
  | "sales_order"
  | "delivery"
  | "manual"
  | "opening_balance";
```

A normal commercial invoice should reference one or both of:

```text
salesOrderId / salesOrderLineId
deliveryId / deliveryLineId
```

Recommended application-composed query ports:

```ts
export interface SalesInvoiceSourceQueryPort {
  getInvoiceableSalesOrder(input: {
    organizationId: string;
    salesOrderId: string;
  }): Promise<Result<InvoiceableSalesOrder>>;
}

export interface DeliveryInvoiceSourceQueryPort {
  getInvoiceableDelivery(input: {
    organizationId: string;
    deliveryId: string;
  }): Promise<Result<InvoiceableDelivery>>;
}
```

Required rules:

```text
Draft Sales Order       → reject
Cancelled Sales Order   → reject
Closed Sales Order      → reject new excess invoicing
Unposted Delivery       → reject when delivery-based invoicing is required
Wrong organization      → reject without leaking existence
Already invoiced qty    → subtract from invoiceable quantity
```

Validate source eligibility again at invoice posting, not only at draft creation.

---

## 3. Prevent over-invoicing

Receivables needs a clear quantity authority.

For each source line:

```text
invoiceable quantity
=
authorized ordered or delivered quantity
- previously posted invoice quantity
+ posted credit-note quantity, where policy allows
```

Required invariants:

```text
Invoice quantity cannot exceed remaining invoiceable quantity.
Duplicate source lines cannot be invoiced twice.
Partial invoicing is allowed only when explicitly supported.
Manual invoices require elevated permission and reason.
Posted credit notes do not silently reopen unlimited invoice quantity.
```

Concurrent posting tests must prove two invoices cannot both consume the same remaining quantity.

---

## 4. Correct invoice lifecycle and cancellation semantics

The public operation:

```ts
cancelSalesInvoice;
```

is unsafe unless cancellation is restricted by state.

Recommended lifecycle:

```text
draft → posted → closed
draft → cancelled
posted → corrected through credit note
```

Recommended authoritative status:

```ts
type SalesInvoiceStatus =
  | "draft"
  | "posted"
  | "closed"
  | "cancelled";
```

Rules:

| State     | Allowed correction   |
| --------- | -------------------- |
| Draft     | Edit or cancel       |
| Posted    | Credit note only     |
| Closed    | No ordinary mutation |
| Cancelled | No further mutation  |

Rename:

```ts
cancelDraftSalesInvoice;
```

A posted invoice must never be deleted, cancelled, or rewritten.

---

## 5. Credit-note behavior is underspecified

Define whether credit notes:

* must reference an original invoice;
* may be standalone;
* may exceed the original invoice balance;
* reopen invoiceable quantity;
* require matching currency;
* affect tax amounts;
* may be partially applied.

Recommended invariants:

```text
A credit note is a new immutable document.
It never edits the original posted invoice.
Currency must match the referenced invoice.
Cumulative unapplied credit cannot exceed the authorized credit amount.
Credit application cannot reduce an invoice beyond zero unless
customer-credit balances are explicitly supported.
```

A more complete surface would be:

```ts
createDraftSalesCreditNote;
addSalesCreditNoteLine;
postSalesCreditNote;
applyCustomerCredit;
```

A single `issueCreditNote` command is acceptable only when creation and posting are deliberately atomic and separately authorized.

---

# Authorization and governance

## 6. Replace `receivables.read/manage`

These permissions are too broad:

```text
receivables.read
receivables.manage
```

Recommended minimum:

```ts
export const receivablesPermissions = {
  invoiceRead: "receivables.invoice.read",
  invoiceCreate: "receivables.invoice.create",
  invoiceUpdate: "receivables.invoice.update",
  invoicePost: "receivables.invoice.post",
  invoiceCancel: "receivables.invoice.cancel",

  creditNoteIssue: "receivables.credit_note.issue",
  receiptApply: "receivables.receipt.apply",
  receiptApplicationReverse:
    "receivables.receipt_application.reverse",

  balanceRead: "receivables.balance.read",
  agingRead: "receivables.aging.read",
} as const;
```

Creating an invoice, posting revenue, issuing credit, and applying cash should not share one generic permission.

## 7. Enforce authorization inside the package

Add:

```ts
export interface ReceivablesAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: ReceivablesPermission;
  }): Promise<boolean>;
}
```

Every public command and organization-scoped query must enforce its manifest-mapped permission internally. Application route checks are additional protection only.

---

# Financial contract gaps

## 8. Define invoice commercial snapshots

At posting, freeze at least:

### Header

* customer code and name;
* bill-to address;
* currency;
* invoice date;
* accounting date;
* due date;
* payment-term code and description;
* tax-registration details;
* subtotal, discount, tax and total;
* source Sales Order or Delivery references.

### Line

* item code and description;
* quantity and UoM;
* frozen UoM conversion;
* unit price;
* discount;
* tax classification and amount;
* line amount;
* source line references.

Later Master Data, Sales, or Fulfillment changes must not rewrite posted invoice history.

## 9. Clarify customer balance projection

Recommended law:

```text
Posted invoices, posted credit notes and customer allocations are
authoritative AR facts.

customer_balance_projection is a rebuildable operational projection.

If the projection disagrees with source records, source records win.
```

Per customer and currency:

```text
outstanding balance
=
posted invoices
- posted credit notes
- active receipt applications
```

Never combine multiple currencies into one balance without an explicit conversion policy.

## 10. Add AR aging

`getCustomerBalance` alone is insufficient for normal receivables operations.

Add:

```ts
getCustomerAging;
```

Suggested buckets:

```text
current
1–30 days
31–60 days
61–90 days
over 90 days
```

Aging should use due date and an explicit `asOfDate`.

---

# Reliability requirements

## 11. Add idempotency

Every material mutation should require:

```ts
type ReceivablesMutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

Important idempotency domains:

* invoice creation;
* invoice posting;
* credit-note posting;
* receipt application;
* duplicate Payment events;
* invoice creation from a Delivery event.

A customer invoice code or source Delivery ID is a natural key, not a complete idempotency mechanism.

## 12. Define atomic mutation behavior

Every state-changing operation should atomically commit:

```text
invoice / credit / allocation mutation
+ customer balance projection
+ audit fact
+ versioned outbox event
```

Failure must persist none of these effects.

Required concurrency tests:

* two postings of the same invoice;
* two invoices consuming the same source quantity;
* two receipt applications exceeding outstanding balance;
* credit note concurrent with receipt application;
* duplicate Payment event;
* cancellation concurrent with posting.

---

# Events

Current events are incomplete.

Recommended implemented-event set:

```text
receivables.invoice.created.v1
receivables.invoice.posted.v1
receivables.invoice.cancelled.v1

receivables.credit_note.posted.v1

receivables.receipt_application.posted.v1
receivables.receipt_application.reversed.v1

receivables.invoice.closed.v1
```

Only add events for real transitions.

Every financial event should include:

* organization ID;
* aggregate ID and version;
* amount and currency;
* source document references;
* actor;
* correlation and causation IDs;
* occurred-at timestamp;
* idempotency or source-event reference.

---

# Module and export contract

Add manifest coverage for:

```text
Sales Invoice
Sales Credit Note
Customer Allocation
Customer Balance Projection
```

Example integrations:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "sales", style: "ports" },
  { moduleId: "fulfillment", style: "ports" },
  { moduleId: "payments", style: "events" },
  { moduleId: "accounting", style: "events" },
],
```

Recommended exports:

| Path                                   | Contents                                                              |
| -------------------------------------- | --------------------------------------------------------------------- |
| `@afenda/receivables`                  | Public operations, schemas, types, permissions, IDs, errors, manifest |
| `@afenda/receivables/contracts`        | Sales, Fulfillment, Payments and authorization ports                  |
| `@afenda/receivables/adapters/drizzle` | Production persistence                                                |
| `@afenda/receivables/testing`          | Memory store and test fixtures                                        |

Receivables-specific error codes should remain in Receivables; `@afenda/errors` owns generic `Result` primitives.

---

# Operations and reconciliation

Add reconciliation per organization, customer, and currency:

```text
posted invoices
- posted credit notes
- active receipt applications
=
customer outstanding balance
```

Cross-module checks:

```text
Payments applied value
↔ Receivables customer allocations

Receivables subledger balance
↔ Accounting AR control account

Fulfillment invoiced quantity
↔ Receivables posted invoice quantity
```

Useful exception views:

* posted Payments with unapplied instructions;
* receipt instructions rejected by Receivables;
* invoices exceeding delivered quantity;
* posted invoices without Accounting source links;
* projection drift;
* reversed Payments with active customer allocations.

---

# Recommended invariants

```md
## Invariants

- Every Receivables record belongs to exactly one organization.
- Customer parties must have an active customer role.
- Posted invoices and credit notes are immutable.
- Draft invoices may be cancelled; posted invoices are corrected through credit notes.
- Invoice quantity cannot exceed the authorized remaining source quantity.
- Receivables never reads or mutates Sales, Fulfillment, Payments, or Accounting tables directly.
- Customer receipt applications reference valid posted Payments.
- Applications cannot exceed invoice outstanding balance or available Payment value.
- Different currencies cannot be applied without an explicit FX policy.
- Customer balance projections are rebuildable from posted source records.
- Every public operation is authorized, idempotent, and concurrency-safe.
- Domain changes, balance effects, audit facts, and outbox events commit atomically.
```

# Priority order

```text
1. Resolve receipt application versus Payments ownership
2. Define invoice source and over-invoicing controls
3. Restrict cancellation to draft invoices
4. Define credit-note and application-reversal behavior
5. Add fine-grained package authorization
6. Add idempotency and concurrency controls
7. Define balance projection and AR aging
8. Add atomic audit/outbox contract
9. Add module manifest and adapter export boundaries
10. Add AR-to-Accounting reconciliation evidence
```

The immediate blocker is `allocateCustomerReceipt`: keep `customer_allocation` in Receivables, but define it strictly as **applying a posted Payment to an AR document**, never as ownership of the receipt itself.
