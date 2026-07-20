# Payables — architecture review (Scratch)

> **Status:** `OPEN` — Blocking findings remain; not plan ↔ disk closed. Phase 4.6 closure evidence incomplete.  
> **As of:** 2026-07-21  
> **Score:** **6.7/10** — README too thin for enterprise Payables package.  
> **Tier:** D audit trace — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/payables` · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** package README · peer boundary vs `@afenda/payments` unresolved in body below.

## Review verdict

This README is **too thin for an ERP Payables package**. It correctly declares basic table ownership and peer-package boundaries, but it does not yet document enough behavior to serve as Phase 4.6 closure evidence.

The most important unresolved issue is this overlap:

```text
@afenda/payables owns supplier_allocation
@afenda/payments is intended to own Payment Allocation
```

That ownership boundary must be resolved before Payments begins.

## What is already correct

* Payables owns supplier invoice and supplier subledger mutations.
* Database schemas remain in `@afenda/db`.
* Purchasing, Receiving, Payments, and Accounting tables are excluded.
* Cross-module integration is event-based.
* Actor, organization, correlation, and optimistic-version context are acknowledged.
* Public commands and event names are listed.

---

# Blocking findings

## 1. Supplier payment allocation ownership conflicts with Payments

The public surface contains:

```ts
allocateSupplierPayment;
```

and Payables owns:

```text
supplier_allocation
```

The planned Payments package owns:

```text
Payment
Payment Application Instruction
Payment Settlement
Payment Reversal
Refund
```

The correct boundary should be:

| Concern                                           | Owner                                |
| ------------------------------------------------- | ------------------------------------ |
| Payment amount, direction, account and settlement | `@afenda/payments`                   |
| Intended supplier/invoice targets                 | Payments as application instructions |
| Application to supplier invoices                  | `@afenda/payables`                   |
| Supplier outstanding balance                      | `@afenda/payables`                   |
| General-ledger posting                            | `@afenda/accounting`                 |

Therefore, Payables may retain `supplier_allocation`, but `allocateSupplierPayment` should not create or infer a payment.

It should consume a posted payment reference:

```ts
applySupplierPayment({
  organizationId,
  actorUserId,
  correlationId,
  idempotencyKey,
  paymentId,
  paymentApplicationInstructionId,
  supplierInvoiceId,
  amount,
});
```

Recommended naming:

```ts
applySupplierPayment;
reverseSupplierPaymentApplication;
```

rather than:

```ts
allocateSupplierPayment;
```

This makes it clear that:

* Payments moves the money.
* Payables applies that money to AP documents.

---

## 2. Three-way matching is not defined

The README says Payables owns `three_way_match_result`, but it does not define the three sources or how data is obtained.

A valid three-way match normally compares:

```text
Purchase Order
↕
Goods Receipt
↕
Supplier Invoice
```

Payables must not directly query Purchasing or Receiving tables.

### Required ports

```ts
export interface PurchaseOrderMatchQueryPort {
  getPurchaseOrderMatchBasis(input: {
    organizationId: string;
    purchaseOrderId: string;
  }): Promise<Result<PurchaseOrderMatchBasis>>;
}

export interface GoodsReceiptMatchQueryPort {
  getGoodsReceiptMatchBasis(input: {
    organizationId: string;
    goodsReceiptIds: readonly string[];
  }): Promise<Result<GoodsReceiptMatchBasis>>;
}
```

These adapters belong in the application composition root.

### Required match outcomes

```ts
type ThreeWayMatchStatus =
  | "not_required"
  | "pending"
  | "matched"
  | "matched_with_tolerance"
  | "exception";
```

The result should record:

* ordered quantity and unit price;
* received quantity;
* invoiced quantity and price;
* quantity variance;
* price variance;
* configured tolerance;
* result per line;
* overall result;
* evidence versions or timestamps;
* actor and execution date.

A match result should be immutable evidence. Re-running matching creates a new result or controlled version rather than silently rewriting the prior decision.

---

## 3. Invoice lifecycle is absent

The package needs a defined state machine.

Recommended baseline:

```text
draft
→ matched
→ posted
→ closed

draft → cancelled
matched → draft      only through explicit rematch/reset policy
posted → cancelled   reject
posted → corrected through credit note
```

Possible lifecycle:

```ts
type SupplierInvoiceStatus =
  | "draft"
  | "matched"
  | "posted"
  | "partially_paid"
  | "paid"
  | "closed"
  | "cancelled";
```

However, avoid storing payment-derived statuses as competing authorities unless they are controlled projections. A simpler authoritative document status can be:

```ts
type SupplierInvoiceStatus =
  | "draft"
  | "matched"
  | "posted"
  | "closed"
  | "cancelled";
```

with balance queries determining whether it is unpaid, partially paid, or fully paid.

### Cancellation rule

```text
Draft invoice:
  may be cancelled.

Matched but unposted invoice:
  may be cancelled or reset according to policy.

Posted invoice:
  is immutable and cannot be cancelled.

Posted correction:
  requires a supplier credit note.
```

The current `cancelSupplierInvoice` name is unsafe until this state restriction is explicit.

---

## 4. Supplier balance projection authority needs definition

The package owns:

```text
supplier_balance_projection
```

Clarify that it is a derived operational subledger projection, not the general ledger.

Recommended law:

```text
Supplier invoice and credit-note documents are authoritative AP facts.

Supplier allocations are authoritative application facts.

supplier_balance_projection is a rebuildable current-state projection.

If projection and source records disagree, source documents and allocations
are authoritative.
```

Required formula:

```text
supplier balance
=
posted supplier invoices
- posted supplier credit notes
- active supplier payment applications
± controlled adjustments
```

Do not include unposted drafts.

Also define whether balance means:

* total organization balance;
* balance per supplier;
* balance by currency;
* balance by due-date bucket.

At minimum, currency must be part of the result. Amounts in different currencies must not be added without a declared conversion policy.

---

## 5. Permissions are far too broad

Current permissions:

```text
payables.read
payables.manage
```

allow the same user to:

* create invoices;
* match invoices;
* post invoices;
* issue credit notes;
* apply payments;
* cancel drafts.

That is not sufficient for AP segregation of duties.

### Recommended minimum

```ts
export const payablesPermissions = {
  invoiceRead: "payables.invoice.read",
  invoiceCreate: "payables.invoice.create",
  invoiceUpdate: "payables.invoice.update",
  invoiceMatch: "payables.invoice.match",
  invoicePost: "payables.invoice.post",
  invoiceCancel: "payables.invoice.cancel",

  creditNoteIssue: "payables.credit_note.issue",
  paymentApply: "payables.payment.apply",
  paymentApplicationReverse: "payables.payment_application.reverse",

  balanceRead: "payables.balance.read",
} as const;
```

A future approval workflow can add another layer, but posting and credit-note issuance should not remain under a generic `manage` permission.

---

## 6. Package-internal authorization is missing

Every public mutation and organization-scoped query must enforce its permission inside Payables, not only in `apps/web`.

```ts
export interface PayablesAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: PayablesPermission;
  }): Promise<boolean>;
}
```

Required mapping:

| Operation                    | Permission                   |
| ---------------------------- | ---------------------------- |
| `createDraftSupplierInvoice` | `payables.invoice.create`    |
| `addSupplierInvoiceLine`     | `payables.invoice.update`    |
| `matchSupplierInvoice`       | `payables.invoice.match`     |
| `postSupplierInvoice`        | `payables.invoice.post`      |
| `cancelSupplierInvoice`      | `payables.invoice.cancel`    |
| `issueSupplierCreditNote`    | `payables.credit_note.issue` |
| `applySupplierPayment`       | `payables.payment.apply`     |
| `getSupplierInvoiceById`     | `payables.invoice.read`      |
| `listSupplierInvoices`       | `payables.invoice.read`      |
| `getSupplierBalance`         | `payables.balance.read`      |

---

# Financial contract gaps

## 7. Commercial invoice fields are not declared

A supplier invoice should define at least:

### Header

* supplier party;
* supplier invoice number;
* internal invoice code;
* invoice date;
* accounting date;
* due date;
* currency;
* payment term snapshot;
* purchase-order references;
* tax registration snapshot;
* subtotal;
* discount total;
* tax total;
* grand total;
* outstanding amount.

### Lines

* item or expense reference;
* description snapshot;
* quantity;
* UoM;
* unit price;
* discount;
* tax classification;
* tax amount;
* line amount;
* Purchase Order line reference;
* Goods Receipt line reference.

Without this contract, the three-way match and Accounting event cannot be implemented consistently.

---

## 8. Non-PO invoices need an explicit policy

Not every supplier invoice has a Purchase Order.

Define invoice source types:

```ts
type SupplierInvoiceSource =
  | "purchase_order"
  | "non_purchase_order"
  | "recurring"
  | "expense"
  | "opening_balance";
```

Recommended baseline:

| Source          | Match policy                                       |
| --------------- | -------------------------------------------------- |
| PO-backed       | Three-way or two-way match required                |
| Non-PO          | Explicit authorization and account coding required |
| Opening balance | Controlled migration/import only                   |
| Recurring       | Future slice unless already implemented            |

Do not let callers avoid matching simply by omitting the Purchase Order ID without an explicit non-PO policy.

---

## 9. Tolerance ownership must connect to Purchasing

Purchasing owns the commercial tolerance snapshot. Payables applies invoice matching against that snapshot.

Payables should not invent a second tolerance configuration.

Recommended rule:

```text
Purchasing owns PO-line receipt and invoice tolerance values.

Payables receives the posted tolerance snapshot through an owner query port.

The match result records the tolerance values actually used.
```

If an override is allowed, it needs:

* separate permission;
* override reason;
* actor;
* original variance;
* approved variance;
* audit evidence.

---

## 10. Credit-note behavior is underspecified

Define:

* whether a credit note must reference an original supplier invoice;
* whether standalone supplier credits are allowed;
* maximum amount;
* currency requirement;
* tax treatment;
* allocation behavior;
* posting and reversal behavior.

Recommended invariants:

```text
A credit note is a new immutable document.
It never edits the posted supplier invoice.
Its currency must match the referenced invoice.
Applied credit cannot exceed available credit.
A credit note cannot reduce the invoice below the permitted balance.
Posting emits a financial event exactly once.
```

Recommended commands:

```ts
createDraftSupplierCreditNote;
addSupplierCreditNoteLine;
postSupplierCreditNote;
applySupplierCredit;
```

A single `issueSupplierCreditNote` command may be acceptable for a small slice, but only if the complete document is created and posted atomically with explicit validation.

---

## 11. Allocation reversal is missing

Allocations are not immutable forever. An incorrect supplier payment application may need correction.

Never delete or edit the original allocation.

Add:

```ts
reverseSupplierPaymentApplication;
```

Required behavior:

```text
Original allocation remains.
Reversal creates a linked compensating allocation.
Available payment and invoice outstanding balances are recomputed.
Duplicate reversal is rejected or idempotently replayed.
```

---

## 12. Money and currency policy is absent

Payables must declare:

* decimal representation;
* currency scale;
* rounding;
* invoice currency;
* payment currency;
* settlement exchange rate;
* ledger currency boundary;
* FX differences.

Recommended ownership:

| Concern                               | Owner                                |
| ------------------------------------- | ------------------------------------ |
| Supplier invoice transaction currency | Payables                             |
| Payment settlement currency           | Payments                             |
| Payment-to-invoice FX application     | Explicit financial boundary contract |
| GL exchange gains/losses              | Accounting                           |

Until multi-currency application is implemented, state a clear v1 restriction:

```text
Payment applications require matching payment and invoice currencies.
```

That is better than silently calculating an unspecified conversion.

---

# Reliability gaps

## 13. Idempotency is missing

Every material mutation should require an idempotency key.

```ts
type PayablesMutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

Important idempotency domains:

* supplier invoice creation;
* invoice posting;
* three-way match execution;
* credit-note posting;
* payment application;
* event-driven Accounting handoff.

A supplier’s external invoice number is a natural key, not an idempotency mechanism.

Recommended uniqueness:

```text
organization
+ supplier party
+ supplier invoice number
```

subject to a controlled normalization policy.

---

## 14. Concurrency controls are insufficiently described

State-changing operations should use `expectedVersion`, but allocation and balance updates need stronger atomicity.

Required races to test:

| Race                                                   | Expected outcome                     |
| ------------------------------------------------------ | ------------------------------------ |
| Two posts of the same invoice                          | One financial effect                 |
| Two applications against the remaining invoice balance | No over-application                  |
| Credit note and payment application concurrently       | Outstanding amount remains valid     |
| Cancellation and match concurrently                    | Deterministic single transition      |
| Duplicate payment event                                | No duplicate supplier allocation     |
| Match data changes between match and post              | Posting rejects stale match evidence |

The balance projection, allocation record, audit fact, and outbox event must commit atomically.

---

## 15. Same-transaction audit/outbox is not stated

Unlike the earlier package READMEs, this version does not mention the store contract.

Add:

```text
Every state-changing operation commits:

domain record changes
+ supplier balance projection
+ audit fact
+ versioned outbox event

in one atomic transaction.
```

A failed operation must persist none of these effects.

---

# Package architecture gaps

## 16. Store and adapter boundaries are absent

The README should explain:

| Surface                        | Implementation                 |
| ------------------------------ | ------------------------------ |
| Production store               | Drizzle/Neon adapter           |
| Test store                     | Memory adapter                 |
| Purchasing match query         | Composition-root port          |
| Receiving match query          | Composition-root port          |
| Payments application reference | Composition-root port or event |
| Authorization                  | Injected port                  |
| Audit/outbox                   | Atomic persistence guarantee   |

Keep adapters out of the root barrel.

Recommended exports:

| Path                                | Contents                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `@afenda/payables`                  | Public operations, schemas, types, permissions, operation IDs, errors, manifest |
| `@afenda/payables/contracts`        | Cross-module and authorization ports                                            |
| `@afenda/payables/adapters/drizzle` | Production persistence                                                          |
| `@afenda/payables/testing`          | Memory store and test fixtures                                                  |

---

## 17. Error ownership needs correction

Payables-specific errors belong in Payables.

```ts
export const payablesErrorCodes = {
  invoiceNotFound: "payables.invoice.not_found",
  invoiceAlreadyPosted: "payables.invoice.already_posted",
  invoiceVersionConflict: "payables.invoice.version_conflict",
  supplierRoleRequired: "payables.supplier_role.required",
  matchException: "payables.match.exception",
  staleMatchResult: "payables.match.stale",
  allocationExceedsBalance: "payables.allocation.exceeds_balance",
  currencyMismatch: "payables.allocation.currency_mismatch",
  duplicateSupplierInvoice: "payables.invoice.duplicate_supplier_number",
} as const;
```

`@afenda/errors` should own generic `Result` primitives, not AP business vocabulary.

---

## 18. Module-manifest conformance is missing

Add a module section declaring:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "purchasing", style: "ports" },
  { moduleId: "receiving", style: "ports" },
  { moduleId: "payments", style: "events" },
  { moduleId: "accounting", style: "events" },
],
```

Use only integration styles implemented on disk.

The manifest must include:

* module identity and `R1-F` band;
* aggregates;
* commands and queries;
* mutation tables;
* permissions;
* authorization maps;
* event IDs;
* dependencies;
* optional integrations.

---

# Query requirements

## 19. List and balance queries are underspecified

`listSupplierInvoices` should support:

* cursor pagination;
* page-size cap;
* allowlisted sort;
* status filter;
* supplier filter;
* invoice-date range;
* due-date range;
* currency;
* overdue status;
* Purchase Order reference.

Stable pagination requires a unique tie-breaker.

Example:

```text
dueDate:asc → due_date ASC, id ASC
updatedAt:desc → updated_at DESC, id DESC
```

`getSupplierBalance` should clearly return:

```ts
type SupplierBalance = {
  organizationId: string;
  supplierPartyId: string;
  currencyCode: string;
  invoicedAmount: DecimalString;
  creditedAmount: DecimalString;
  paidAmount: DecimalString;
  outstandingAmount: DecimalString;
  overdueAmount: DecimalString;
  asOf: string;
};
```

Do not aggregate currencies into one number.

---

# Event improvements

Current events are a reasonable start, but additional lifecycle events may be required:

```text
payables.invoice.cancelled.v1
payables.credit_note.created.v1
payables.payment_application.reversed.v1
payables.invoice.closed.v1
```

Also clarify:

```text
@afenda/payables decides when to emit.
@afenda/events owns the event name, version, and payload schema.
```

Every event should include:

* organization ID;
* aggregate ID;
* aggregate version;
* occurred-at timestamp;
* actor principal or user;
* correlation ID;
* causation ID;
* idempotency/source reference where relevant.

---

# Operations evidence is missing

A Phase 4 package needs more than lint/typecheck/test commands.

Add:

| Concern            | Required evidence                                                                |
| ------------------ | -------------------------------------------------------------------------------- |
| Migration          | Exact `@afenda/db` migration or journal tag                                      |
| Permission catalog | Generated Payables codes persisted                                               |
| Authorization      | Package and app-wiring tests                                                     |
| Metrics            | Posting, match exception, allocation conflict and failure metrics                |
| Reconciliation     | AP source records versus supplier balance projection                             |
| Recovery           | Duplicate event, stale match, failed posting and incorrect allocation procedures |
| Tenancy            | Hostile cross-organization tests                                                 |
| Module governance  | `pnpm validate:modules`                                                          |

### Required reconciliation

```text
posted invoices
- posted credit notes
- active payment applications
= supplier outstanding balance
```

For each supplier and currency.

---

# Recommended invariants section

```md
## Invariants

- Every Payables record belongs to exactly one organization.
- Supplier parties must have an active supplier role.
- Posted invoices and credit notes are immutable.
- Draft invoices may be cancelled; posted invoices are corrected through credit notes.
- PO-backed invoices require a valid match outcome before posting.
- Payables never reads or mutates Purchasing or Receiving tables directly.
- Supplier payment applications reference posted Payments records.
- Application totals cannot exceed invoice outstanding balance or available payment value.
- Different currencies cannot be applied without an explicit FX policy.
- Supplier balance projections are rebuildable from posted source documents and allocations.
- Every material mutation is authorized, idempotent and concurrency-safe.
- Domain changes, balance effects, audit facts and outbox events commit atomically.
- No peer ERP package mutates Payables tables.
```

# Recommended public surface

```ts
createDraftSupplierInvoice;
addSupplierInvoiceLine;
matchSupplierInvoice;
postSupplierInvoice;
cancelDraftSupplierInvoice;

createDraftSupplierCreditNote;
addSupplierCreditNoteLine;
postSupplierCreditNote;

applySupplierPayment;
reverseSupplierPaymentApplication;

getSupplierInvoiceById;
listSupplierInvoices;
getSupplierBalance;
```

This is clearer than allowing `cancelSupplierInvoice` to appear valid in every state.

# Priority order

```text
1. Resolve Payables allocation versus Payments application ownership
2. Define invoice, match, credit-note and allocation lifecycles
3. Add package-internal authorization with fine-grained permissions
4. Define three-way-match query ports and evidence model
5. Add idempotency and allocation concurrency controls
6. Define supplier balance projection and reconciliation
7. Declare money/currency behavior
8. Add atomic store, audit and outbox contract
9. Add module manifest and adapter/testing export boundaries
10. Add operational metrics, recovery and migration evidence
```

The immediate blocker is the Payment boundary. Keep `supplier_allocation` in Payables, but define it as **application of a posted payment to an AP document**, not as ownership of the payment itself.
