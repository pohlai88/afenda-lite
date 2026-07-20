# `@afenda/accounting`

Org-scoped accounting periods, journals, immutable journal lines, ledger
postings, reversals, and trial balances.

The package solely mutates `journal`, `journal_line`, `ledger_posting`, and
`accounting_period`; schemas remain in `@afenda/db`.

Phase 4.8 is promoted. The package is a Living R1-F module with its manifest
included in `pnpm validate:modules`.

## Consume

Import `createDraftJournal`, `addJournalLine`, `postJournal`, `reverseJournal`,
`openAccountingPeriod`, `closeAccountingPeriod`, `getJournalById`,
`listJournals`, and `getTrialBalance` from `@afenda/accounting`.

Every operation requires explicit organization and actor identity. Posting and
reversal use optimistic versions. Posting requires an open period and balanced
debits and credits, then atomically writes ledger postings and a versioned
outbox event. Reversal writes compensating postings and preserves posted lines.

## ERP boundary

Accounting does not import transaction packages. Optional integrations with
Sales, Purchasing, Inventory, Receivables, Payables, and Payments are
events-only.

## Events

- `accounting.journal.posted.v1`
- `accounting.journal.reversed.v1`

## Maintain

```bash
pnpm --filter @afenda/accounting lint
pnpm --filter @afenda/accounting typecheck
pnpm --filter @afenda/accounting test
pnpm --filter @afenda/accounting check
```

Permissions are `accounting.read` and `accounting.manage`.
