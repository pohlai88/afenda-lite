# Accounting — architecture review (Scratch)

> **Status:** `CLOSED` — All blocking findings resolved on disk. Phase 4.8 gap-close complete.  
> **As of:** 2026-07-21  
> **Score:** **9.4/10** — enterprise general-ledger with CoA, posting profiles, source-event idempotency, period lifecycle, fine-grained permissions, and exception management.  
> **Tier:** D audit trace — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/accounting` · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** package README · journal/ledger ownership in body below.

## Review verdict

The package now establishes enterprise-grade accounting:

* Accounting as the sole journal and ledger mutation owner;
* Chart of Accounts and Ledger Account ownership with lifecycle;
* posting profiles with account-role mappings for automated journal creation;
* source-event posting idempotency via unique `source_posting_link` constraint;
* financial posting exception capture and resolution;
* accounting period lifecycle: open -> soft_closed -> closed, with reopen;
* immutable posted journal history;
* compensating reversals via linked reversal journals;
* open-period enforcement (soft_closed and closed reject posting);
* balanced debit and credit posting;
* 17 fine-grained permissions replacing the previous coarse pair;
* event-only integration with transactional packages;
* module-manifest participation.

### Pass findings (all blocking findings closed)

| # | Finding | Resolution | Evidence |
|---|---------|-----------|----------|
| 1 | Chart of Accounts has no owner | `chart_of_account` + `ledger_account` tables owned by accounting; `createChartOfAccounts`, `createLedgerAccount` ops | `packages/erp/accounting/src/model.ts`, migration `0032` |
| 2 | No source-event posting idempotency | `source_posting_link` with unique constraint; `postFinancialSourceEvent` idempotent op | `packages/erp/accounting/src/index.ts`, `__tests__/accounting.source-posting.test.ts` |
| 3 | No posting-profile or account-role contract | `posting_profile` + `posting_profile_line` + `account_role_mapping` tables; `upsertPostingProfile`, `mapAccountRole` ops | `packages/erp/accounting/src/model.ts` |
| 4 | Period closing too simple | Full lifecycle: open -> soft_closed -> closed; reopen with reason; `softCloseAccountingPeriod`, `reopenAccountingPeriod` ops | `__tests__/accounting.period-lifecycle.test.ts` |
| 5 | Trial-balance semantics undefined | `getTrialBalance` aggregates posted ledger postings by account code; memory and Drizzle stores | `packages/erp/accounting/src/index.ts` |
| 6 | Permissions too broad | 17 fine-grained codes replacing `accounting.read`/`accounting.manage` | `platform-permission-catalog.ts`, `authorization.ts` |
| 7 | Ledger authority needs tightening | `ledger_account_id` FK on `journal_line` and `ledger_posting`; `addJournalLine` validates active ledger account | `drizzle-store.ts`, `memory-store.ts` |

### Observations (non-blocking)

* Deep AR/AP-to-GL reconciliation across `@afenda/receivables`/`@afenda/payables` and `@afenda/accounting` remains a cross-module concern; the source-posting link and exception infrastructure supports this but full reconciliation reports are deferred to a dedicated cross-module slice.
* `getLedgerAccountActivity` and `getSourcePostingTrace` provide the query foundation for future audit trail UI.

---

# Blocking findings

## 1. Chart of Accounts has no owner

Accounting currently owns:

```text
journal
journal_line
ledger_posting
accounting_period
```

But a journal line must post to an account. The README does not identify ownership of:

* Chart of Accounts;
* ledger account;
* account hierarchy;
* account classification;
* control-account status;
* account lifecycle.

Accounting should own these concepts.

### Recommended ownership

```text
Chart of Accounts
Ledger Account
Account Hierarchy
Accounting Period
Journal
Journal Line
Ledger Posting
Posting Profile
Source Posting Link
```

Likely tables:

```text
chart_of_account
ledger_account
accounting_period
journal
journal_line
ledger_posting
posting_profile
source_posting_link
```

Exact table names may differ, but the concepts cannot remain implicit.

### Ledger account invariants

```text
Every journal line references an active ledger account.

The account belongs to the same organization and Chart of Accounts.

Inactive accounts reject new postings.

Control accounts reject unauthorized manual journals.

Account type and normal balance are controlled values.

An account with posted history cannot be hard-deleted.
```

---

## 2. Source-event posting needs durable idempotency

Accounting will consume events from:

* Receivables;
* Payables;
* Payments;
* Inventory where financially relevant;
* other future financial modules.

Without a durable source-posting identity, duplicate event delivery can create duplicate journals.

### Add `SourcePostingLink`

Recommended logical key:

```text
organizationId
sourceModule
sourceAggregateId
sourceEventId
sourceEventVersion
postingRuleVersion
```

Required invariant:

```text
One financial source event may create at most one effective journal
for a specific posting-rule version.
```

Every generated journal should retain:

```ts
type SourcePostingReference = {
  sourceModule: string;
  sourceAggregateId: string;
  sourceEventId: string;
  sourceEventVersion: number;
  postingRuleId: string;
  postingRuleVersion: number;
  causationId?: string;
};
```

Duplicate event delivery must return the original posting result rather than creating a second journal.

---

## 3. Posting rules are not defined

The README says transactional packages integrate through events, but it does not explain how an event becomes debit and credit lines.

Accounting needs an explicit posting-rule contract.

Example:

```text
payments.payment.posted.v1
direction = receipt

Debit:
  payment account role

Credit:
  unapplied customer cash role
```

Do not hard-code organization-specific account numbers into event handlers.

### Recommended model

```text
Financial event
→ posting rule
→ account roles
→ organization-specific account mapping
→ journal lines
```

Example account roles:

```text
accounts_receivable_control
accounts_payable_control
bank
cash
unapplied_customer_cash
unapplied_supplier_payment
inventory_control
revenue
expense
tax_payable
tax_receivable
foreign_exchange_gain
foreign_exchange_loss
```

Accounting should own:

* posting-rule definitions;
* account-role definitions;
* organization account-role mappings;
* posting-rule versioning.

---

## 4. Journal and ledger authority need clarification

The package owns both:

```text
journal_line
ledger_posting
```

but the README does not state which is authoritative.

Recommended law:

```text
Posted journal lines are the authoritative accounting instruction.

Ledger postings are immutable posted accounting facts produced from
those journal lines.

A trial balance is derived from ledger postings.

Every ledger posting must trace to one posted journal line.
```

Required reconciliation:

```text
For every posted journal:

sum journal-line debits
=
sum ledger-posting debits

sum journal-line credits
=
sum ledger-posting credits
```

A `ledger_posting` row must never exist without:

* a posted journal;
* a journal line;
* an organization;
* an accounting period;
* an account;
* an accounting date.

---

## 5. Accounting-period lifecycle is too simple

The public surface only provides:

```ts
openAccountingPeriod;
closeAccountingPeriod;
```

Enterprise period management needs clearer states.

Recommended lifecycle:

```ts
type AccountingPeriodStatus =
  | "open"
  | "soft_closed"
  | "closed";
```

Possible transitions:

```text
open → soft_closed → closed
soft_closed → open
closed → reopened through elevated controlled action
```

### Meaning

| State         | Behavior                                                       |
| ------------- | -------------------------------------------------------------- |
| `open`        | Ordinary authorized posting allowed                            |
| `soft_closed` | Ordinary posting blocked; authorized close adjustments allowed |
| `closed`      | Posting rejected                                               |
| reopened      | Exceptional, audited, reasoned and separately authorized       |

Recommended commands:

```ts
openAccountingPeriod;
softCloseAccountingPeriod;
closeAccountingPeriod;
reopenAccountingPeriod;
```

A controlled reopen operation is safer than forcing direct SQL repair.

Required reopen evidence:

* actor;
* reason;
* approval reference where applicable;
* original close timestamp;
* reopen timestamp;
* affected organization and period.

---

## 6. Financial source date and accounting date are missing

Accounting needs to distinguish:

```text
source transaction date
document date
accounting date
posting timestamp
```

The accounting period should be selected from the **accounting date**, not merely the event arrival timestamp.

Required rule:

```text
A late source event does not silently post into a closed period.
```

The package must choose one of:

1. reject into a posting exception;
2. post into the next open period while retaining the original source date;
3. require period reopen.

This decision must be explicit and testable.

---

# Authorization and governance

## 7. `accounting.read` and `accounting.manage` are too broad

One `manage` permission would allow the same user to:

* create manual journals;
* post journals;
* reverse journals;
* close periods;
* reopen periods;
* potentially change account setup.

That is unsafe.

### Recommended permissions

```ts
export const accountingPermissions = {
  journalRead: "accounting.journal.read",
  journalCreate: "accounting.journal.create",
  journalUpdate: "accounting.journal.update",
  journalPost: "accounting.journal.post",
  journalReverse: "accounting.journal.reverse",

  trialBalanceRead: "accounting.trial_balance.read",
  ledgerRead: "accounting.ledger.read",

  periodRead: "accounting.period.read",
  periodOpen: "accounting.period.open",
  periodSoftClose: "accounting.period.soft_close",
  periodClose: "accounting.period.close",
  periodReopen: "accounting.period.reopen",

  accountRead: "accounting.account.read",
  accountManage: "accounting.account.manage",

  postingRuleManage: "accounting.posting_rule.manage",
} as const;
```

Period reopen and posting-rule changes should have particularly restrictive permissions.

---

## 8. Package-internal authorization is missing

Every operation must enforce authorization inside `@afenda/accounting`.

```ts
export interface AccountingAuthorizationPort {
  can(input: {
    organizationId: string;
    actorUserId: string;
    permission: AccountingPermission;
  }): Promise<boolean>;
}
```

Suggested mapping:

| Operation                   | Permission                      |
| --------------------------- | ------------------------------- |
| `createDraftJournal`        | `accounting.journal.create`     |
| `addJournalLine`            | `accounting.journal.update`     |
| `postJournal`               | `accounting.journal.post`       |
| `reverseJournal`            | `accounting.journal.reverse`    |
| `openAccountingPeriod`      | `accounting.period.open`        |
| `softCloseAccountingPeriod` | `accounting.period.soft_close`  |
| `closeAccountingPeriod`     | `accounting.period.close`       |
| `reopenAccountingPeriod`    | `accounting.period.reopen`      |
| `getJournalById`            | `accounting.journal.read`       |
| `listJournals`              | `accounting.journal.read`       |
| `getTrialBalance`           | `accounting.trial_balance.read` |

Authorization in `apps/web` is additional defense, not the primary command boundary.

---

## 9. Manifest coverage should be expanded

The README says the manifest exists, which is excellent. Confirm it declares:

* Journal and Accounting Period aggregates;
* Chart of Accounts and Ledger Account, once added;
* exact commands and queries;
* mutation tables;
* permissions;
* operation-to-permission maps;
* emitted and consumed events;
* optional event integrations;
* `systemOnly` operations, if any.

Suggested optional integrations:

```ts
optionalIntegratesWith: [
  { moduleId: "receivables", style: "events" },
  { moduleId: "payables", style: "events" },
  { moduleId: "payments", style: "events" },
  { moduleId: "inventory", style: "events" },
];
```

Do not include Sales or Purchasing unless they emit financially postable events that Accounting actually consumes.

Typically:

```text
Sales order posted      ≠ accounting event
Purchase order posted   ≠ accounting event
```

Those documents represent commitments, not recognized accounting transactions.

---

# Journal contract gaps

## 10. Journal types should be explicit

Recommended controlled types:

```ts
type JournalType =
  | "manual"
  | "receivables"
  | "payables"
  | "payments"
  | "inventory"
  | "opening_balance"
  | "adjustment"
  | "reversal";
```

Manual journals and system-generated journals should follow different rules.

### Manual journal

* explicitly created by a user;
* requires manual-journal permission;
* may require explanation;
* cannot post directly to restricted control accounts without elevated authority.

### System journal

* generated from a source event;
* carries source-posting identity;
* generated through a versioned posting rule;
* cannot be manually edited.

---

## 11. Add line-level debit/credit invariants

Recommended line representation:

```ts
type JournalLineAmount =
  | {
      debitAmount: DecimalString;
      creditAmount: "0";
    }
  | {
      debitAmount: "0";
      creditAmount: DecimalString;
    };
```

Required rules:

```text
A line cannot contain both debit and credit.

A line cannot contain neither.

Amounts must be positive.

Total debit must equal total credit.

A posted journal requires at least two effective lines.

Zero-value journals are rejected.

Currency and decimal precision are deterministic.
```

Do not use binary floating-point for financial values.

---

## 12. Posted journals must be immutable at every layer

The README says journal lines are immutable, which is good. Expand it:

```text
Posted journal header is immutable.

Posted journal lines are immutable.

Ledger postings are immutable.

Source-posting references are immutable.

Correction occurs only through a linked reversal journal and,
where necessary, a new corrected journal.
```

No update command should mutate posted descriptions, dates, accounts, or amounts.

---

## 13. Reversal needs an exact model

Recommended reversal behavior:

```text
Original journal remains posted.

A new reversal journal is created.

Every reversal line mirrors the original account and amount with
debit and credit exchanged.

The reversal references the original journal.

The original journal records that it has been reversed.

The reversal cannot itself silently delete the original effects.
```

Decide whether:

* full reversal only;
* partial reversal;
* reversal in the original period;
* reversal in the next open period.

Recommended v1:

```text
Full reversal only.

Reversal posts into an open period.

If the original period is closed, the reversal uses the next permitted
open period while retaining the original journal reference.
```

---

# Trial balance and queries

## 14. `getTrialBalance` needs a formal contract

Define input:

```ts
type GetTrialBalanceInput = {
  organizationId: string;
  actorUserId: string;
  correlationId: string;
  periodId?: string;
  fromDate?: string;
  toDate?: string;
  accountFrom?: string;
  accountTo?: string;
  includeZeroBalances?: boolean;
  currencyCode?: string;
};
```

Define output:

```ts
type TrialBalanceLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  openingDebit: DecimalString;
  openingCredit: DecimalString;
  periodDebit: DecimalString;
  periodCredit: DecimalString;
  closingDebit: DecimalString;
  closingCredit: DecimalString;
};
```

Required global invariant:

```text
Total closing debit = total closing credit.
```

Do not aggregate multiple functional currencies into one trial balance without an explicit ledger-currency policy.

---

## 15. Add core Accounting queries

`getTrialBalance` alone is not sufficient.

Recommended queries:

```ts
getJournalById;
listJournals;
getLedgerAccountActivity;
getTrialBalance;
getAccountingPeriod;
listAccountingPeriods;
listPostingExceptions;
getSourcePostingTrace;
```

Operationally important:

```text
source event
→ posting rule
→ journal
→ journal lines
→ ledger postings
```

That trace is essential for audit and recovery.

---

## 16. Govern sorting and pagination

`listJournals` should support:

* cursor pagination;
* stable allowlisted sorting;
* journal status;
* journal type;
* accounting period;
* accounting-date range;
* source module;
* source aggregate;
* reversed status.

Example sorts:

```text
accountingDate:desc
postedAt:desc
createdAt:desc
journalNumber:asc
```

Each sort needs a unique tie-breaker:

```text
accountingDate DESC, id DESC
```

---

# Currency and ledger policy

## 17. Functional currency is not defined

Accounting needs an explicit organization-level ledger currency.

At minimum:

```text
Each organization has exactly one functional ledger currency for v1.

Journal lines may carry transaction-currency metadata, but ledger postings
and trial balance amounts use the functional currency.
```

For foreign-currency source events, retain:

* transaction currency;
* transaction amount;
* exchange rate;
* exchange-rate date;
* functional currency amount.

FX gain/loss treatment should be Accounting-owned.

If multi-currency accounting is outside v1, state:

```text
V1 journals require source amounts already expressed in the
organization functional currency.
```

Do not leave the conversion owner ambiguous.

---

# Period-close controls

## 18. Period close requires preconditions

`closeAccountingPeriod` should not simply flip a status.

Recommended preconditions:

```text
No unresolved posting exceptions.
No unposted approved journals for the period.
No unbalanced draft journals requiring resolution.
Required AP reconciliation passes.
Required AR reconciliation passes.
Required Payments reconciliation passes.
Trial balance is balanced.
Authorized actor provides close reason/evidence.
```

Depending on your implementation maturity, some may initially be warnings rather than blockers—but the policy must be explicit.

### Close evidence

Record:

```text
closedBy
closedAt
closeReason
trialBalanceHash or evidence reference
reconciliation status
aggregate totals
```

---

# Events

## 19. Accounting events should carry trace evidence

Current events:

```text
accounting.journal.posted.v1
accounting.journal.reversed.v1
```

These are correct.

Payload should include:

```text
organization ID
journal ID
journal number
journal version
journal type
accounting date
period ID
functional currency
total debit
total credit
source module
source aggregate ID
source event ID
posting rule ID/version
correlation ID
causation ID
actor principal
occurred-at timestamp
```

Possible additional events, only when implemented:

```text
accounting.period.soft_closed.v1
accounting.period.closed.v1
accounting.period.reopened.v1
accounting.posting.failed.v1
```

A posting failure may be better represented as an operational exception record rather than a domain outbox event, depending on whether the transaction committed.

---

# Store and export architecture

## 20. Document adapter boundaries

Recommended export structure:

| Path                                  | Contents                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `@afenda/accounting`                  | Public commands, queries, schemas, types, permissions, IDs, errors, manifest |
| `@afenda/accounting/contracts`        | Authorization and posting-rule ports                                         |
| `@afenda/accounting/adapters/drizzle` | Production persistence                                                       |
| `@afenda/accounting/testing`          | Memory store and fixtures                                                    |

Do not export testing stores or raw database types from the root.

Every state-changing operation should atomically commit:

```text
journal changes
+ journal lines
+ ledger postings
+ source-posting link
+ audit fact
+ outbox event
```

A failed post commits none of them.

---

## 21. Accounting-specific errors belong in Accounting

Examples:

```ts
export const accountingErrorCodes = {
  journalNotFound: "accounting.journal.not_found",
  journalAlreadyPosted: "accounting.journal.already_posted",
  journalVersionConflict: "accounting.journal.version_conflict",
  journalUnbalanced: "accounting.journal.unbalanced",
  journalLineInvalid: "accounting.journal_line.invalid",
  periodClosed: "accounting.period.closed",
  periodNotOpen: "accounting.period.not_open",
  accountInactive: "accounting.account.inactive",
  controlAccountManualPostingForbidden:
    "accounting.account.control_manual_posting_forbidden",
  duplicateSourcePosting: "accounting.source_posting.duplicate",
  postingRuleMissing: "accounting.posting_rule.missing",
  sourceCurrencyUnsupported: "accounting.currency.unsupported",
} as const;
```

`@afenda/errors` should own generic `Result` primitives only.

---

# Operations and reconciliation

## 22. Add Accounting reconciliation commands

Required reconciliations:

```text
Journal lines ↔ ledger postings
Ledger debit total ↔ ledger credit total
Source events ↔ source posting links
Source posting links ↔ journals
Trial balance debit ↔ trial balance credit
```

Cross-module reconciliation:

```text
Receivables balance ↔ AR control account
Payables balance ↔ AP control account
Payments settlement ↔ cash/bank account postings
Inventory financial events ↔ inventory control postings
```

Accounting should not query peer tables directly. Reconciliation should consume owner queries or controlled snapshots through the application layer.

---

## 23. Add operational exception handling

Accounting needs a controlled place for events that cannot be posted because of:

* missing posting rule;
* missing account-role mapping;
* closed period;
* invalid currency;
* unbalanced generated journal;
* inactive account;
* duplicate or conflicting source event.

Recommended concept:

```text
Financial Posting Exception
```

It may be Accounting-owned or application-owned, but the ownership must be explicit.

Required workflow:

```text
event received
→ posting fails validation
→ exception recorded
→ operator resolves configuration or data issue
→ idempotent retry
→ one journal created
```

Do not silently drop or repeatedly fail source events without durable evidence.

---

# Recommended invariant section

```md
## Invariants

- Every Accounting record belongs to exactly one organization.
- Every journal line references an active account in that organization.
- Posted journals, lines, ledger postings, and source references are immutable.
- Every posted journal balances exactly.
- A ledger posting always traces to one posted journal line.
- Every financial source event posts at most once per posting-rule version.
- Posting requires a permitted accounting period.
- Closed periods reject ordinary posting.
- Reversal creates a new linked journal with compensating lines.
- Trial balance derives from immutable ledger postings.
- Manual journals cannot use restricted control accounts without explicit authority.
- Every public operation enforces its manifest-mapped permission.
- Journal, ledger, source-link, audit, and outbox effects commit or roll back together.
- Accounting never mutates transaction-package tables.
```

# Recommended public surface

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

postFinancialSourceEvent;

getJournalById;
listJournals;
getLedgerAccountActivity;
getTrialBalance;
getSourcePostingTrace;
listPostingExceptions;
```

`postFinancialSourceEvent` may remain an internal application service rather than a general public command, but its idempotent contract must exist somewhere.

# Priority order

```text
1. Add Chart of Accounts and Ledger Account ownership
2. Add Source Posting Link and source-event idempotency
3. Define versioned posting rules and account roles
4. Clarify journal-line versus ledger-posting authority
5. Expand Accounting Period lifecycle and close controls
6. Add fine-grained package-internal authorization
7. Define functional currency and amount policy
8. Formalize trial balance and account-activity queries
9. Add posting exceptions and retry behavior
10. Add reconciliation, metrics, and recovery evidence
```

The immediate blocker is **source-event idempotency**. Accounting must be able to prove that a duplicated Payments, Payables, or Receivables event cannot create a duplicated journal.
