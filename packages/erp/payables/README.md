# `@afenda/payables`

Org-scoped accounts-payable execution for supplier invoices, invoice lines,
three-way matching, posting, supplier credit notes, payment allocation,
cancellation, and supplier balance queries.

The package owns mutations for `supplier_invoice`, `supplier_invoice_line`,
`supplier_credit_note`, `supplier_allocation`, `three_way_match_result`, and
`supplier_balance_projection`; schemas remain in `@afenda/db`.

## Consume

Import the public operations from `@afenda/payables`:
`createDraftSupplierInvoice`, `addSupplierInvoiceLine`,
`matchSupplierInvoice`, `postSupplierInvoice`, `issueSupplierCreditNote`,
`allocateSupplierPayment`, `cancelSupplierInvoice`,
`getSupplierInvoiceById`, `listSupplierInvoices`, and `getSupplierBalance`.

Every mutation requires organization, actor, and correlation identity.
State-changing operations use optimistic versions where the current invoice
version is part of the command contract.

## ERP boundary

Payables never imports peer ERP packages directly and never writes purchasing,
receiving, payment, ledger, or journal tables. Supplier and item references are
identities and DB-level foreign keys; cross-module integration uses versioned
outbox events.

## Events

- `payables.invoice.created.v1`
- `payables.invoice.matched.v1`
- `payables.invoice.posted.v1`
- `payables.credit_note.posted.v1`
- `payables.allocation.posted.v1`

## Maintain

```bash
pnpm --filter @afenda/payables lint
pnpm --filter @afenda/payables typecheck
pnpm --filter @afenda/payables test
pnpm --filter @afenda/payables check
```

Permissions are `payables.read` and `payables.manage`.
