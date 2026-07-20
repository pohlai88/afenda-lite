# Review verdict

The consolidated specification is a strong **parent governance and authorization document**. It successfully establishes:

* package classification and ownership law;
* workspace-edge governance;
* module manifests and registers;
* the universal Phase 4 quality gate;
* authorization to implement Payments and Accounting serially.

However, it is **not yet sufficient as the direct implementation contract for Phase 4.7 and 4.8**. The document intentionally describes Payments and Accounting only at summary level, while several financial ownership decisions remain unresolved.

The next documentation should therefore deepen the **financial boundary**, not create more general package-governance documents.

---

# Critical missing decisions

## 1. Payment allocation ownership conflicts

The document currently gives overlapping ownership:

| Package     | Current ownership   |
| ----------- | ------------------- |
| Receivables | Customer Allocation |
| Payables    | Supplier Allocation |
| Payments    | Payment Allocation  |

It also exposes:

* `receivables.allocateCustomerReceipt`
* `payables.allocateSupplierPayment`
* `payments.addPaymentAllocation`

This creates three possible owners of effectively the same financial relationship.

### Recommended ownership

| Concern                               | Owner                                      |
| ------------------------------------- | ------------------------------------------ |
| Payment instrument and amount         | Payments                                   |
| Receipt/disbursement lifecycle        | Payments                                   |
| Bank/cash settlement                  | Payments                                   |
| Intended allocation targets           | Payments, as application instructions only |
| Application against customer invoices | Receivables                                |
| Application against supplier invoices | Payables                                   |
| Financial journal posting             | Accounting                                 |
| Allocation reconciliation projection  | Application/read-model layer               |

Payments should not directly modify customer or supplier allocation tables.

A safer name would be:

```ts
addPaymentApplicationInstruction
```

rather than:

```ts
addPaymentAllocation
```

The Payments package records **where the payer intends the funds to apply**. Receivables or Payables performs the actual subledger application after receiving the posted-payment event.

---

## 2. Chart of Accounts has no declared owner

Accounting currently owns:

* Journal;
* Journal Line;
* Ledger Posting;
* Accounting Period.

But no owner is declared for:

* Chart of Accounts;
* General Ledger Account;
* Account hierarchy;
* Account classification;
* Posting profiles;
* Fiscal calendar;
* source-posting links.

These cannot remain implicit.

### Recommended Accounting ownership

```text
Chart of Accounts
General Ledger Account
Account Hierarchy
Fiscal Calendar
Accounting Period
Journal
Journal Line
Ledger Entry
Posting Profile
Source Posting Link
```

A `Source Posting Link` is particularly important. It prevents the same source event from producing duplicate journals.

---

## 3. Payment account and GL account are not separated

A bank account used to make payments is not the same concept as a general-ledger account.

Recommended boundary:

| Concept                                                          | Owner                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Payment account, bank account or cash account used operationally | Payments                                                       |
| General-ledger account                                           | Accounting                                                     |
| Mapping from payment account to GL account role                  | Accounting posting profile                                     |
| Bank-feed transaction                                            | Future Payments integration slice                              |
| Bank reconciliation result                                       | Payments or an explicitly authorized reconciliation capability |

This prevents Payments from becoming a shadow accounting system.

---

## 4. Payment posting and settlement are conflated

A payment may be:

1. created;
2. authorized or released;
3. posted internally;
4. submitted to the bank;
5. settled;
6. rejected or returned;
7. reversed.

The existing surface only defines draft, post and reverse behavior. It does not define settlement.

A more complete lifecycle is needed:

```text
draft
→ released
→ posted
→ pending_settlement
→ settled

pending_settlement
→ failed

posted / settled
→ reversed through a new reversal record
```

For cash transactions, `posted` and `settled` may occur together. For electronic payments, they usually must remain distinct.

---

## 5. Refund responsibility is unclear

The document gives Payments ownership of `Refund`, while Receivables owns credit notes.

These must not become interchangeable.

Recommended distinction:

| Operation                | Meaning                              | Owner       |
| ------------------------ | ------------------------------------ | ----------- |
| Credit note              | Reduces the customer’s receivable    | Receivables |
| Customer refund          | Sends money back to the customer     | Payments    |
| Supplier refund received | Receives funds from a supplier       | Payments    |
| Payment reversal         | Reverses an incorrect payment record | Payments    |
| Journal reversal         | Reverses accounting impact           | Accounting  |

A credit note may create refundable credit, but it does not itself move money.

---

## 6. Event-to-journal behavior is unspecified

The specification says Accounting consumes approved financial events, but it does not define:

* which events are financially postable;
* which accounting date to use;
* how debit and credit accounts are selected;
* how source currency and ledger currency are handled;
* what happens when a period is closed;
* how duplicate events are rejected;
* how reversals relate to original journals;
* which posting-rule version was used.

Without this contract, Accounting could become a collection of event handlers with inconsistent rules.

---

## 7. Money and currency policy is missing

Payments and Accounting require one shared semantic policy covering:

```text
transaction currency
settlement currency
ledger currency
exchange-rate source
exchange-rate date
decimal scale
rounding mode
rounding difference
functional currency
foreign-exchange gain/loss
```

This policy does not require a new shared package yet. It first requires an explicit contract.

---

## 8. Financial reconciliation is missing

The existing universal gate mentions operations and runbooks, but it does not define the financial reconciliation chain:

```text
Receivables / Payables
        ↕
     Payments
        ↕
 Bank or cash settlement
        ↕
     Accounting
```

Accounting cannot be considered closed merely because journals balance individually.

---

# Recommended next-document set

Keep the next pack small: **five human documents and one machine-readable register**.

## Document dependency map

```text
Afenda Packages Governance — Consolidated Program Spec
│
├── FIN-001 Financial Boundary and Ownership Contract
│   ├── P4.7 Payments Implementation Slice
│   └── P4.8 Accounting Implementation Slice
│
├── FINANCIAL-POSTING-RULE-REGISTER.yaml
│
├── FIN-002 Reconciliation, Period Close and Recovery
│
└── P4-FINANCE Integration and Closure Evidence
```

---

# 1. `FIN-001-financial-boundary-and-ownership.md`

## Purpose

This should be the **first next document**.

It resolves every cross-package financial ownership question before Payments coding begins.

## Required sections

### A. Financial domain ownership matrix

| Capability                      | Owner                        |
| ------------------------------- | ---------------------------- |
| Customer invoice and balance    | Receivables                  |
| Supplier invoice and balance    | Payables                     |
| Payment and settlement          | Payments                     |
| Customer invoice application    | Receivables                  |
| Supplier invoice application    | Payables                     |
| Bank/cash operational account   | Payments                     |
| General-ledger account          | Accounting                   |
| Journal and ledger              | Accounting                   |
| Financial posting configuration | Accounting                   |
| Cross-module orchestration      | Application composition root |

### B. Allocation contract

Define:

* payment application instruction;
* customer allocation;
* supplier allocation;
* partial allocation;
* overpayment;
* unapplied cash;
* reallocation;
* allocation reversal;
* allocation idempotency.

### C. Refund and reversal matrix

Define whether each operation:

* changes cash;
* changes a subledger;
* changes the general ledger;
* creates a new document;
* references an original document.

### D. Money and currency policy

Include:

* amount representation;
* supported scale;
* deterministic rounding;
* transaction and ledger currency;
* exchange-rate ownership;
* rounding-difference treatment.

### E. Organization and legal-entity scope

The current specification uses `organizationId`, but Accounting normally requires a financial reporting entity.

The document should explicitly decide:

```text
organizationId is the legal accounting entity
```

or introduce a separate controlled `legalEntityId`.

Do not leave that relationship implicit.

### F. Cross-domain consistency

Define the permitted flow:

```text
Owner commits aggregate
+ audit fact
+ outbox event
atomically

Composition root reacts
and invokes the receiving package
idempotently
```

---

# 2. `phase-4.7-payments-implementation-slice.md`

## Purpose

Convert the short Payments summary into an executable package contract.

## Required content

### Aggregate model

At minimum:

```text
Payment
Payment Line or Payment Leg
Payment Application Instruction
Payment Settlement
Payment Reversal
Refund
Payment Account
```

A separate `Payment Leg` is useful for transfers because a transfer normally has:

* one outgoing leg;
* one incoming leg;
* potentially fees or exchange differences.

### State machine

Define exact legal transitions.

Example:

```text
draft
→ released
→ posted
→ pending_settlement
→ settled

pending_settlement
→ failed

posted / settled
→ reversed
```

### Commands

The current surface should be reviewed and likely expanded:

```ts
createDraftPayment;
addPaymentApplicationInstruction;
releasePayment;
postPayment;
recordPaymentSettlement;
recordPaymentFailure;
reversePayment;
createRefund;
postRefund;
getPaymentById;
listPayments;
```

`releasePayment` is important for segregation between preparation and execution.

### Core invariants

```text
Amount must be positive.
Payment account must belong to the same organization.
Application instructions cannot exceed available payment value unless
explicit over-application policy exists.
Posted payments are immutable.
Reversal creates a new linked record.
Settled payments cannot be silently edited.
A transfer must balance outgoing and incoming legs.
External settlement reference must be idempotent.
```

### Required events

At minimum:

```text
payments.payment.created.v1
payments.payment.released.v1
payments.payment.posted.v1
payments.payment.settled.v1
payments.payment.failed.v1
payments.payment.reversed.v1
payments.refund.posted.v1
```

### Required tests

Include:

* duplicate bank reference;
* partial allocation;
* overpayment;
* cross-organization target;
* failed settlement;
* refund greater than original receipt;
* double reversal;
* transfer balancing;
* duplicate event delivery;
* rollback with no audit/outbox emission.

---

# 3. `phase-4.8-accounting-implementation-slice.md`

## Purpose

Define Accounting as a true ledger owner, not merely a journal CRUD package.

## Required aggregate ownership

```text
Chart of Accounts
Ledger Account
Fiscal Calendar
Accounting Period
Journal
Journal Line
Ledger Entry
Posting Profile
Source Posting Link
```

## Recommended commands

```ts
createLedgerAccount;
updateLedgerAccount;
deactivateLedgerAccount;

createDraftJournal;
addJournalLine;
postJournal;
reverseJournal;

openAccountingPeriod;
softCloseAccountingPeriod;
closeAccountingPeriod;
reopenAccountingPeriod;

postSourceEvent;
getJournalById;
listJournals;
getAccountActivity;
getTrialBalance;
```

A controlled `reopenAccountingPeriod` should exist even when heavily restricted. Operational reality sometimes requires it; omitting it merely forces unsafe database intervention.

## Core invariants

```text
Total debit equals total credit.
Posted journals are immutable.
Every reversal references the original journal.
Every source event and posting-rule version may post only once.
A closed period rejects ordinary postings.
A reopened period records actor, reason and approval evidence.
Every line has organization, account, currency and accounting date.
Inactive accounts reject new postings.
Control accounts reject unauthorized manual journals.
```

## Required queries

The current `getTrialBalance` alone is insufficient.

Add:

```text
journal detail
journal register
account activity
trial balance
period status
unposted source events
posting failures
source-to-journal trace
```

---

# 4. `FINANCIAL-POSTING-RULE-REGISTER.yaml`

## Purpose

Create one machine-verifiable mapping from financial source events to Accounting posting behavior.

This should be Accounting-owned, not package-governance-owned.

## Recommended schema

```yaml
version: 1

rules:
  - ruleId: payments.receipt.posted.v1
    sourceModule: payments
    sourceEvent: payments.payment.posted.v1
    sourceEventVersion: 1
    condition: direction == receipt
    accountingDateBasis: payment.postedAt
    debitAccountRole: payment_account
    creditAccountRole: unapplied_customer_cash
    amountBasis: payment.amount
    currencyBasis: payment.currency
    reversalRuleId: payments.receipt.reversed.v1
    status: active
```

Use **account roles**, not hard-coded account numbers.

Organization-specific mappings can then resolve:

```text
payment_account
accounts_receivable_control
accounts_payable_control
unapplied_customer_cash
unapplied_supplier_payment
bank_fee
foreign_exchange_gain
foreign_exchange_loss
```

## Validator requirements

The validator should fail when:

* an active financial event has no posting rule;
* a posting rule refers to a missing event contract;
* a reversal rule is missing;
* an account role is unknown;
* duplicate active rules overlap without precedence;
* the posting rule version changes without explicit versioning.

---

# 5. `FIN-002-reconciliation-period-close-and-recovery.md`

## Purpose

Define how the finance chain is proven correct after transactions have been processed.

## Required reconciliations

| Reconciliation       | Comparison                                     |
| -------------------- | ---------------------------------------------- |
| Customer subledger   | Receivables balances ↔ AR control account      |
| Supplier subledger   | Payables balances ↔ AP control account         |
| Payment settlement   | Payments ↔ bank/cash evidence                  |
| Payment accounting   | Posted Payments ↔ Accounting source links      |
| Customer application | Payment instructions ↔ Receivables allocations |
| Supplier application | Payment instructions ↔ Payables allocations    |
| General ledger       | Journal lines ↔ ledger entries                 |
| Trial balance        | Total debit ↔ total credit                     |

## Period close sequence

```text
1. Freeze or cut off transaction intake
2. Process pending outbox events
3. Resolve failed financial postings
4. Reconcile Payments with bank/cash evidence
5. Reconcile Receivables with AR control
6. Reconcile Payables with AP control
7. Resolve unapplied payments
8. Verify trial balance
9. Soft-close period
10. Review exceptions
11. Hard-close period
```

## Late-event policy

The document must decide what happens when an event arrives after a period closes:

* reject and place in a posting exception queue;
* post into the next open period with original source date retained;
* require controlled period reopen.

The system must not silently choose.

## Recovery scenarios

Cover:

* duplicate event;
* missing event;
* out-of-order event;
* posting-rule configuration missing;
* source document reversed before posting;
* closed-period failure;
* bank-settlement mismatch;
* partial subledger allocation;
* accounting handler unavailable.

---

# 6. `phase-4-finance-integration-and-closure-evidence.md`

## Purpose

This is the final Phase 4.7–4.8 program closure document.

It proves the packages work together without violating ownership.

## Required end-to-end scenarios

### Customer receipt

```text
Payment created
→ payment posted
→ customer allocation applied by Receivables
→ accounting journal created
→ AR and payment reconciliation passes
```

### Supplier disbursement

```text
Payment released
→ payment posted
→ supplier allocation applied by Payables
→ accounting journal created
→ AP and payment reconciliation passes
```

### Refund

```text
Receivables credit established
→ refund payment posted
→ receivable application recorded
→ accounting reversal/refund journal created
```

### Payment reversal

```text
Original payment retained
→ reversal record created
→ subledger allocation reversed
→ accounting reversal journal created
→ source trace remains complete
```

### Transfer

```text
Outgoing payment leg
→ incoming payment leg
→ both settlement states recorded
→ transfer clearing account resolves to zero
```

### Negative scenarios

```text
Cross-organization payment target rejected
Duplicate event does not create duplicate journal
Closed-period posting rejected
Failed transaction emits no outbox event
Peer package cannot directly update another package's tables
Reversal cannot exceed or duplicate original
```

## Evidence table

| Gate           | Evidence                                          |
| -------------- | ------------------------------------------------- |
| Ownership      | Table-owner validator and negative fixtures       |
| Authorization  | Operation-to-permission coverage                  |
| Events         | Event contract and posting-rule validation        |
| Transactions   | Audit/outbox atomicity tests                      |
| Accounting     | Balanced journal and duplicate-source tests       |
| Reconciliation | AR, AP, Payment and GL reconciliation reports     |
| Tenancy        | Hostile cross-organization tests                  |
| Operations     | Recovery runbook and structured failure telemetry |

---

# Small amendment required in the current parent document

Before Phase 4.7 starts, amend the consolidated document in three places.

## Replace Payments ownership

Current concept:

```text
Payment · Payment Allocation · Payment Reversal · Refund
```

Recommended:

```text
Payment · Payment Leg · Payment Application Instruction ·
Payment Settlement · Payment Reversal · Refund · Payment Account
```

Add:

```text
Receivables owns customer invoice application.
Payables owns supplier invoice application.
Payments records application instructions but does not mutate either
subledger's allocation tables.
```

## Expand Accounting ownership

Replace:

```text
Journal · Journal Line · Ledger Posting · Accounting Period
```

with:

```text
Chart of Accounts · Ledger Account · Fiscal Calendar · Accounting Period ·
Journal · Journal Line · Ledger Entry · Posting Profile · Source Posting Link
```

## Add posting idempotency law

```text
Every financial source event is posted at most once for a specific
posting-rule version.

Accounting records the source module, source aggregate, source event id,
event version and posting-rule version on every generated journal.

Reversal never deletes or mutates the original journal.
```

---

# Documents not needed yet

Do **not** authorize these merely because Payments and Accounting are starting:

* treasury package;
* tax engine;
* bank-feed connector;
* fixed assets;
* budgeting;
* consolidation;
* multi-ledger accounting;
* generic workflow package;
* shared transaction-core package;
* jobs package;
* authorization extraction;
* module-catalog runtime.

Those should remain roadmap candidates until a real delivery slice requires them.

---

# Recommended execution order

```text
1. Patch the consolidated parent specification
2. Author FIN-001 Financial Boundary and Ownership
3. Author and execute Phase 4.7 Payments
4. Author Phase 4.8 Accounting
5. Create the posting-rule register
6. Author reconciliation and period-close controls
7. Execute finance integration and closure evidence
8. Mark Phase 4 complete only after end-to-end reconciliation passes
```

The immediate next document should be **`FIN-001-financial-boundary-and-ownership.md`**. It removes the ownership ambiguity that would otherwise allow Payments, Receivables, Payables, and Accounting to develop conflicting records.
