# `@afenda/accounting`

Org-scoped general ledger: chart of accounts, ledger accounts, posting profiles,
accounting periods (open / soft-close / close / reopen), manual and system
journals, immutable journal lines, ledger postings, reversals, trial balances,
source-event posting with idempotency, and posting exception management.

The package mutates `chart_of_account`, `ledger_account`, `account_role_mapping`,
`posting_profile`, `posting_profile_line`, `journal`, `journal_line`,
`ledger_posting`, `accounting_period`, `source_posting_link`, and
`financial_posting_exception`; schemas remain in `@afenda/db`.

## Consume

```ts
import {
  createChartOfAccounts,
  createLedgerAccount,
  updateLedgerAccount,
  deactivateLedgerAccount,
  listLedgerAccounts,
  mapAccountRole,
  upsertPostingProfile,
  createDraftJournal,
  addJournalLine,
  postJournal,
  reverseJournal,
  openAccountingPeriod,
  softCloseAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
  postFinancialSourceEvent,
  getJournalById,
  listJournals,
  getTrialBalance,
  getLedgerAccountActivity,
  getSourcePostingTrace,
  listPostingExceptions,
  resolvePostingException,
} from "@afenda/accounting";
```

Every operation requires explicit organization and actor identity.

### Key invariants

- **Posting** requires an open period and balanced debits = credits; atomically
  writes ledger postings and a versioned outbox event.
- **Reversal** creates a new linked journal (type `reversal`) with compensating
  lines; original postings are preserved, original status set to `reversed`.
- **Period lifecycle:** open -> soft_closed -> closed. Close requires prior
  soft-close. Reopen from soft_closed or closed requires a reason and
  `accounting.period.reopen` permission.
- **Source posting idempotency:** `postFinancialSourceEvent` checks the unique
  `source_posting_link` constraint; duplicate delivery returns the original
  journal without creating a second. Failures record a
  `financial_posting_exception`.

## ERP boundary

Accounting does not import transaction packages. Optional integrations with
Sales, Purchasing, Inventory, Receivables, Payables, and Payments are
events-only via `postFinancialSourceEvent`.

## Events

- `accounting.journal.posted.v1`
- `accounting.journal.reversed.v1`

## Permissions

| Code | Description |
|------|-------------|
| `accounting.journal.read` | View journals and lines |
| `accounting.journal.create` | Create draft journals and add lines |
| `accounting.journal.update` | Update draft journal metadata |
| `accounting.journal.post` | Post journals |
| `accounting.journal.reverse` | Reverse posted journals |
| `accounting.trial_balance.read` | View trial balance |
| `accounting.ledger.read` | View ledger activity |
| `accounting.period.read` | View accounting periods |
| `accounting.period.open` | Open new periods |
| `accounting.period.soft_close` | Soft-close periods |
| `accounting.period.close` | Hard-close periods |
| `accounting.period.reopen` | Reopen closed/soft-closed periods |
| `accounting.account.read` | View chart of accounts and ledger accounts |
| `accounting.account.manage` | Create/update/deactivate accounts |
| `accounting.posting_rule.manage` | Manage posting profiles and account roles |
| `accounting.exception.read` | View posting exceptions |
| `accounting.exception.manage` | Resolve posting exceptions |

## Maintain

```bash
pnpm --filter @afenda/accounting lint
pnpm --filter @afenda/accounting typecheck
pnpm --filter @afenda/accounting test
pnpm --filter @afenda/accounting check
```
