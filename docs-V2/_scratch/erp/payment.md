# Review verdict

This is a clean **package summary**, but it is not yet a sufficient implementation or closure contract for `@afenda/payments`.

**Current score: 6.5/10**

The ownership boundary is moving in the right direction:

* Payments owns the movement and settlement of money.
* Receivables and Payables remain owners of subledger applications.
* Accounting remains the owner of journals and ledger postings.
* Refunds reuse the Payment aggregate rather than introducing a parallel refund engine.

The largest issue is that `payment_allocation` is still described as an allocation owned by Payments. It must be explicitly limited to an **application instruction**, or Payments will overlap with `supplier_allocation` and customer allocation tables.

---

# Blocking findings

## 1. Rename and redefine `payment_allocation`

The current model says:

```text
Payments owns payment_allocation.
Allocations retain target identities.
```

This is dangerously close to claiming that Payments applies money against invoices.

The correct ownership is:

| Concern                           | Owner                      |
| --------------------------------- | -------------------------- |
| Payment amount and direction      | Payments                   |
| Payment account and settlement    | Payments                   |
| Intended target invoice or credit | Payments as an instruction |
| Customer invoice application      | Receivables                |
| Supplier invoice application      | Payables                   |
| General-ledger effect             | Accounting                 |

Recommended conceptual name:

```text
Payment Application Instruction
```

A database table may temporarily remain named `payment_allocation`, but its domain meaning must be explicit.

Recommended public command:

```ts
addPaymentApplicationInstruction;
```

rather than:

```ts
addPaymentAllocation;
```

Recommended fields:

```ts
type PaymentApplicationInstruction = {
  id: string;
  organizationId: string;
  paymentId: string;

  targetModule: "receivables" | "payables";
  targetDocumentType:
    | "customer_invoice"
    | "customer_credit"
    | "supplier_invoice"
    | "supplier_credit";

  targetDocumentId: string;
  intendedAmount: DecimalString;
  currencyCode: string;

  status:
    | "pending"
    | "applied"
    | "partially_applied"
    | "rejected"
    | "reversed";

  appliedAmount: DecimalString;
  rejectionCode?: string;
};
```

Payments records intent and application status. The subledger owner creates the authoritative customer or supplier allocation.

---

## 2. Payment posting and settlement are conflated

The README currently exposes:

```ts
postPayment;
```

but does not distinguish:

* internal posting;
* submission to a bank;
* settlement;
* rejection;
* return.

For cash, posting and settlement may occur together. For electronic payment methods, they usually do not.

Recommended lifecycle:

```text
draft
→ released
→ posted
→ pending_settlement
→ settled

pending_settlement
→ failed

posted / settled
→ reversed through a new reversal
```

A simpler v1 is acceptable:

```text
draft → posted → settled
                  ↘ reversed
```

but only if the README explicitly states that external asynchronous settlement is outside v1.

Do not use `posted` to mean both “record accepted internally” and “money confirmed by the bank.”

---

## 3. Payment accounts are missing

Payments needs an operational source or destination of funds.

At minimum define:

```text
Payment Account
```

Examples:

* bank account;
* cash account;
* payment gateway account;
* clearing account.

Recommended ownership:

| Surface                                         | Owner                                 |
| ----------------------------------------------- | ------------------------------------- |
| Operational payment account                     | Payments                              |
| Bank/cash account identity and status           | Payments                              |
| GL account                                      | Accounting                            |
| Mapping from payment account to GL account role | Accounting posting profile            |
| External bank transaction                       | Future payment integration capability |

Do not let callers provide arbitrary bank-account strings on every Payment.

Recommended aggregate reference:

```ts
paymentAccountId: PaymentAccountId;
```

For transfers:

```ts
sourcePaymentAccountId;
destinationPaymentAccountId;
```

---

## 4. Transfer requires paired legs

A transfer cannot be represented safely as a single direction without defining both sides.

Required effects:

```text
source payment account: outgoing
destination payment account: incoming
net organization cash movement: zero
```

Recommended model:

```text
Payment
└── Payment Leg
    ├── source leg
    └── destination leg
```

or a dedicated transfer command that creates two linked Payments atomically.

Recommended command:

```ts
createAndPostPaymentTransfer({
  organizationId,
  actorUserId,
  correlationId,
  idempotencyKey,
  sourcePaymentAccountId,
  destinationPaymentAccountId,
  amount,
  currencyCode,
  transferDate,
});
```

Required invariants:

```text
Source and destination accounts differ.
Both accounts belong to the same organization.
Both accounts are active.
Both transfer legs use the same amount unless FX transfer is explicitly supported.
Both legs commit atomically.
One-sided transfer posting is impossible.
```

If cross-currency transfers are outside v1, say so.

---

## 5. Refund semantics need a source contract

Using:

```text
payment.direction = refund
```

is reasonable. But a refund should normally reference an original commercial or payment fact.

Recommended refund source:

```ts
type RefundSource =
  | {
      kind: "customer_payment";
      originalPaymentId: string;
    }
  | {
      kind: "customer_credit";
      customerCreditId: string;
    }
  | {
      kind: "manual";
      reasonCode: string;
      evidenceReference: string;
    };
```

Required refund invariants:

```text
Refund amount is positive.
Refund direction is outward.
Refund currency matches its source unless an explicit FX policy exists.
Cumulative refund cannot exceed the refundable amount.
A refund never mutates or deletes the original Payment.
Posting creates a new immutable Payment row.
Duplicate refund requests are idempotent.
```

### `postRefund` concern

The README says:

> Refund creation and posting are one transaction.

That can be acceptable as a specialized command, but it bypasses a reviewable draft lifecycle.

Safer public surface:

```ts
createDraftRefund;
postRefund;
```

or explicitly state that the single-step command is limited to an authorized refund workflow with full input validation and an elevated permission.

---

# Authorization and governance

## 6. `payments.read` and `payments.manage` are too broad

A single `manage` permission allows the same actor to:

* create;
* post;
* reverse;
* refund;
* transfer money.

That is too much authority for a financial execution package.

Recommended minimum:

```ts
export const paymentsPermissions = {
  paymentRead: "payments.payment.read",
  paymentCreate: "payments.payment.create",
  paymentUpdate: "payments.payment.update",
  paymentRelease: "payments.payment.release",
  paymentPost: "payments.payment.post",
  paymentReverse: "payments.payment.reverse",

  refundCreate: "payments.refund.create",
  refundPost: "payments.refund.post",

  transferCreate: "payments.transfer.create",
  transferPost: "payments.transfer.post",

  applicationInstructionManage:
    "payments.application_instruction.manage",

  settlementRecord: "payments.settlement.record",
} as const;
```

At the very least, separate:

```text
create
post
reverse
refund
read
```

---

## 7. Package-internal authorization is missing

Every operation must enforce authorization inside `@afenda/payments`.

```ts
export interface PaymentsAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: PaymentsPermission;
  }): Promise<boolean>;
}
```

Recommended mapping:

| Operation                          | Permission                                |
| ---------------------------------- | ----------------------------------------- |
| `createDraftPayment`               | `payments.payment.create`                 |
| `addPaymentApplicationInstruction` | `payments.application_instruction.manage` |
| `postPayment`                      | `payments.payment.post`                   |
| `reversePayment`                   | `payments.payment.reverse`                |
| `createDraftRefund`                | `payments.refund.create`                  |
| `postRefund`                       | `payments.refund.post`                    |
| Transfer command                   | `payments.transfer.post`                  |
| `getPaymentById`                   | `payments.payment.read`                   |
| `listPayments`                     | `payments.payment.read`                   |
| `recordPaymentSettlement`          | `payments.settlement.record`              |

A route check in `apps/web` is additional protection, not the package authorization boundary.

---

## 8. Add module-manifest conformance

`src/module.manifest.ts` should declare:

* module identity and `R1-F` band;
* Payment, Payment Application Instruction, Settlement and Reversal aggregates;
* exact commands and queries;
* mutation tables;
* permission codes;
* operation-to-permission mappings;
* event IDs;
* dependencies and optional integrations.

Suggested shape:

```ts
moduleDependencies: {
  required: ["master-data"],
},

optionalIntegratesWith: [
  { moduleId: "receivables", style: "events" },
  { moduleId: "payables", style: "events" },
  { moduleId: "accounting", style: "events" },
],
```

Only include Master Data as required if Payments actually validates Payment Account, party, currency, or other master references through it.

---

# Financial contract gaps

## 9. Define exact payment directions

The README says receipts, disbursements, transfers and refunds.

Use a controlled enum:

```ts
type PaymentDirection =
  | "receipt"
  | "disbursement"
  | "refund"
  | "transfer";
```

But `transfer` does not behave like a single directional payment. Consider:

```ts
type PaymentPurpose =
  | "customer_receipt"
  | "supplier_disbursement"
  | "customer_refund"
  | "supplier_refund_receipt"
  | "internal_transfer"
  | "manual_receipt"
  | "manual_disbursement";
```

Direction and purpose should remain separate:

```text
direction = receipt | disbursement
purpose = customer_receipt | supplier_disbursement | refund | transfer...
```

This avoids awkward cases such as supplier refunds, which are incoming refunds.

---

## 10. Party and counterparty identity are missing

A Payment should normally identify its counterparty.

Recommended fields:

```ts
counterpartyPartyId?: string;
counterpartySnapshot?: {
  code: string;
  name: string;
};
```

Required rules:

* same organization;
* active Party;
* appropriate customer/supplier role when purpose requires it;
* snapshot frozen at posting;
* internal transfer has no external counterparty;
* manual payment without a Party requires elevated permission and explicit reason.

Payments must read Master Data but never mutate it.

---

## 11. Money and currency policy is absent

At minimum define:

```text
payment currency
settlement currency
amount scale
rounding mode
exchange rate
exchange-rate date
fees
net settled amount
```

Recommended v1 restriction:

```text
Payment, application instruction and target document currencies must match.
Cross-currency application is outside v1.
Internal transfers require matching currencies.
```

If multi-currency settlement is supported, define:

```text
gross amount
fee amount
net amount
settlement exchange rate
FX gain/loss handoff to Accounting
```

Do not let each handler invent its own conversion logic.

---

## 12. Fees are missing

Real payment execution often has:

* bank charges;
* payment-gateway fees;
* transfer fees;
* withheld amounts.

Decide whether v1 supports:

```ts
feeAmount: DecimalString;
netSettlementAmount: DecimalString;
```

If not, state explicitly:

```text
V1 does not model payment fees. The posted amount equals the settled amount.
```

That is preferable to hidden or off-ledger fees.

---

# Reversal and immutability

## 13. Define reversal as a new record

`payment_reversal` ownership is correct, but the contract needs stronger invariants.

```text
Posted Payments are immutable.

A reversal creates a linked Payment Reversal and, where required,
a compensating Payment.

The original Payment remains unchanged.

A Payment may be reversed at most up to its unreversed amount.

Settlement status and downstream applications determine reversal eligibility.
```

Required fields:

```ts
type PaymentReversal = {
  id: string;
  organizationId: string;
  originalPaymentId: string;
  amount: DecimalString;
  reasonCode: string;
  reasonText?: string;
  reversedByActorUserId: string;
  reversedAt: string;
  idempotencyKey: string;
};
```

### Downstream effect

Reversing the Payment must not directly delete AP or AR allocations.

Instead:

```text
Payment reversed event
→ Receivables reverses customer application
→ Payables reverses supplier application
→ Accounting creates reversal journal
```

Each owner handles its own records idempotently.

---

## 14. Partial reversals need a decision

Decide whether Payments allows:

* full reversal only;
* partial reversal;
* multiple partial reversals.

Recommended v1:

```text
Full reversal only unless partial refunds are explicitly required.
```

If partial reversal is supported, enforce:

```text
sum of active reversals ≤ original posted amount
```

and coordinate downstream application reversal amounts.

---

# Reliability requirements

## 15. Add true command and source-event idempotency

Every material command needs:

```ts
type PaymentsMutationContext = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
};
```

External settlement records should also have a unique source identity:

```text
provider
external transaction reference
provider event ID
```

Recommended logical uniqueness:

```text
organization
+ payment account
+ provider
+ external transaction reference
```

Required behavior:

```text
Same idempotency key + same payload:
  return original result.

Same idempotency key + different payload:
  return IDEMPOTENCY_CONFLICT.

Duplicate settlement event:
  no duplicate transition or financial event.
```

---

## 16. Allocation/application limits need concurrency protection

Two concurrent application instructions must not exceed the Payment’s available amount.

Recommended formula:

```text
availableToApply
=
posted payment amount
- successfully applied amount
- pending reserved application amount
- reversed amount
- refunded amount where relevant
```

Required race test:

```text
Payment available = 100

Instruction A = 70
Instruction B = 50

Concurrent execution:
  combined accepted value must not exceed 100.
```

Use a guarded atomic update or versioned aggregate—not a read-check-write sequence.

---

## 17. Same-transaction audit/outbox is missing

Add an explicit guarantee:

```text
Every state-changing operation commits:

Payment / instruction / settlement / reversal mutation
+ applicable payment totals
+ audit fact
+ outbox event

in one atomic database transaction.
```

Failure persists none of the effects.

This must include transfer legs: both sides, audit, and outbox commit together.

---

# Event contract improvements

Current events are insufficient for settlement and application orchestration.

Recommended events:

```text
payments.payment.created.v1
payments.payment.released.v1
payments.payment.posted.v1
payments.payment.settled.v1
payments.payment.failed.v1
payments.payment.reversed.v1

payments.application_instruction.created.v1
payments.application_instruction.applied.v1
payments.application_instruction.rejected.v1
payments.application_instruction.reversed.v1

payments.refund.posted.v1
payments.transfer.posted.v1
```

Do not add events for states the package does not implement.

Every financial event should carry:

```text
organization ID
payment ID
aggregate version
direction and purpose
amount and currency
payment account ID
counterparty ID where applicable
correlation ID
causation ID
idempotency key or source event ID
occurred-at timestamp
actor principal
```

`@afenda/payments` decides when to emit; `@afenda/events` owns name, version, and payload schema.

---

# Query contract

## 18. `listPayments` needs governed filters and sorting

Recommended filters:

* status;
* direction;
* purpose;
* payment account;
* counterparty;
* currency;
* posted-date range;
* settlement-date range;
* external reference;
* target module;
* unapplied balance.

Recommended allowlisted sorts:

```text
updatedAt:desc
createdAt:desc
postedAt:desc
settledAt:desc
amount:asc
amount:desc
```

Every sort needs a unique tie-breaker:

```text
postedAt DESC, id DESC
amount ASC, id ASC
```

Use cursor pagination and an explicit page-size maximum.

---

## 19. Add a payment-availability query

Useful owner query:

```ts
getPaymentApplicationAvailability({
  organizationId,
  actorUserId,
  correlationId,
  paymentId,
});
```

Suggested output:

```ts
type PaymentApplicationAvailability = {
  paymentId: string;
  currencyCode: string;
  postedAmount: DecimalString;
  appliedAmount: DecimalString;
  pendingInstructionAmount: DecimalString;
  reversedAmount: DecimalString;
  availableAmount: DecimalString;
};
```

This can be consumed through a port by Payables or Receivables without exposing Payments tables.

---

# Store and export architecture

## 20. Document the persistence and port model

Add:

| Surface             | Backend                                                              |
| ------------------- | -------------------------------------------------------------------- |
| Production          | Drizzle Payments store with atomic Payment, audit and outbox effects |
| Testing             | Memory store with equivalent commit/rollback semantics               |
| Master lookup       | Payment Account, Party and Currency lookups                          |
| Authorization       | Injected Payments authorization port                                 |
| AR/AP application   | Events or composition-root ports                                     |
| Accounting          | Versioned financial events                                           |
| External settlement | Future or explicit settlement adapter                                |

Keep production and testing surfaces separate:

| Export path                         | Contents                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `@afenda/payments`                  | Public commands, queries, schemas, types, permissions, IDs, errors and manifest |
| `@afenda/payments/contracts`        | Composition ports                                                               |
| `@afenda/payments/adapters/drizzle` | Production persistence                                                          |
| `@afenda/payments/testing`          | Memory store and fixtures                                                       |

---

## 21. Payment-specific errors belong in Payments

Recommended error codes:

```ts
export const paymentsErrorCodes = {
  paymentNotFound: "payments.payment.not_found",
  paymentAlreadyPosted: "payments.payment.already_posted",
  paymentVersionConflict: "payments.payment.version_conflict",
  paymentAccountInactive: "payments.account.inactive",
  insufficientApplicationBalance:
    "payments.application.insufficient_balance",
  applicationCurrencyMismatch:
    "payments.application.currency_mismatch",
  duplicateExternalReference:
    "payments.external_reference.duplicate",
  invalidTransfer: "payments.transfer.invalid",
  reversalExceedsPayment: "payments.reversal.exceeds_payment",
  paymentNotReversible: "payments.payment.not_reversible",
  refundExceedsAvailable: "payments.refund.exceeds_available",
} as const;
```

`@afenda/errors` should own generic `Result` primitives, not Payments-specific business meaning.

---

# Operations and reconciliation

## 22. Add payment reconciliation

At minimum:

```text
posted payment amount
- reversed amount
=
net valid payment amount
```

and:

```text
net valid payment amount
- successful AR/AP applications
=
unapplied payment amount
```

For settled accounts:

```text
Payments settlement records
↔ external bank/cash evidence
```

For transfers:

```text
outgoing transfer amount
=
incoming transfer amount
```

Required reconciliation views:

* posted but unsettled payments;
* settled payments without Accounting source links;
* application instructions not acknowledged by AR/AP;
* rejected instructions;
* reversed Payments with active subledger applications;
* duplicate external references;
* transfer pairs not balanced.

---

## 23. Add operational evidence

A Phase 4 package should identify:

* migration tag;
* permission-catalog evidence;
* package authorization tests;
* app-wiring tests;
* hostile cross-organization tests;
* mutation metrics;
* recovery runbook;
* reconciliation command or report;
* `pnpm validate:modules`.

Suggested metrics:

```text
payments_created_total
payments_posted_total
payments_reversed_total
payments_refunded_total
payments_settled_total
payment_settlement_failures_total
payment_application_rejections_total
payment_idempotency_replays_total
payment_transfer_failures_total
```

Emit them from the package execution boundary rather than only from web Actions.

---

# Recommended invariant section

```md
## Invariants

- Every Payment belongs to exactly one organization.
- Payment Accounts and counterparties must belong to that organization.
- Posted Payments are immutable.
- Reversals and refunds create new linked records.
- Payment application records are instructions, not AP or AR allocations.
- Receivables and Payables remain the authoritative subledger application owners.
- Application instructions cannot exceed available Payment value.
- Different currencies cannot be applied without an explicit FX policy.
- Transfers post both account legs atomically and conserve value.
- External settlement references are idempotent.
- Every public operation is authorized through its manifest-mapped permission.
- Every material mutation is idempotent and concurrency-safe.
- Payment changes, audit facts and outbox events commit or roll back together.
- Payments never writes Receivables, Payables or Accounting tables.
```

# Recommended public surface

```ts
createDraftPayment;
addPaymentApplicationInstruction;
releasePayment;
postPayment;

recordPaymentSettlement;
recordPaymentFailure;

createDraftRefund;
postRefund;

createDraftTransfer;
postTransfer;

reversePayment;

getPaymentById;
listPayments;
getPaymentApplicationAvailability;
```

For a deliberately smaller v1, `releasePayment`, settlement, and draft refunds can be omitted—but the README must clearly state the reduced state model rather than imply they exist.

# Priority order

```text
1. Redefine payment_allocation as application instructions
2. Separate posting from external settlement
3. Add Payment Account ownership
4. Define atomic transfer legs
5. Define refund source and maximum refundable amount
6. Replace read/manage with fine-grained permissions
7. Add package-internal authorization and manifest mappings
8. Add idempotency and application concurrency controls
9. Define reversal and downstream application-reversal behavior
10. Add currency, reconciliation, metrics and recovery contracts
```

The immediate blocker is the meaning of `payment_allocation`. Keep Payments as the owner of **where the money is intended to go**, while Receivables and Payables remain owners of **how that money is actually applied to their documents**.
