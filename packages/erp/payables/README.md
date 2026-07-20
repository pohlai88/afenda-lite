# `@afenda/payables`

Org-scoped accounts-payable execution for supplier invoices, invoice lines,
three-way matching, posting, supplier credit notes, payment application,
cancellation, and supplier balance queries.

The package owns mutations for `supplier_invoice`, `supplier_invoice_line`,
`supplier_credit_note`, `supplier_allocation`, `three_way_match_result`, and
`supplier_balance_projection`; schemas remain in `@afenda/db`.

Scratch ops pack: [`docs-V2/payables/`](../../../docs-V2/payables/README.md).

## Consume

Import the public operations from `@afenda/payables`:
`createDraftSupplierInvoice`, `addSupplierInvoiceLine`,
`matchSupplierInvoice`, `postSupplierInvoice`, `issueSupplierCreditNote`,
`createDraftSupplierCreditNote`, `addSupplierCreditNoteLine`,
`postSupplierCreditNote`, `applySupplierCredit`, `applySupplierPayment`,
`reverseSupplierPaymentApplication`, `cancelSupplierInvoice`,
`getSupplierInvoiceById`, `listSupplierInvoices`, and `getSupplierBalance`.

Every mutation requires organization, actor, and correlation identity.
State-changing operations use optimistic versions where the current invoice
version is part of the command contract.

Permissions are coarse DNA: `payables.read` and `payables.manage`.

## Invariants

| Rule | Behavior |
|------|----------|
| Match before post | Only `draft` invoices with lines may match; only `matched` may post |
| Cancel | Only `draft` \| `matched`; **posted is immutable** via cancel; unposted cancel does **not** touch `supplier_balance_projection` |
| Balance projection | Adjusted on **post**, active **payment apply**, active **credit application**, and **credit note post** only |
| Payment apply | Requires posted invoice + `PostedPaymentQueryPort` basis: org-scoped, **posted**, **same currency**, payment-application instruction, and idempotency key |
| Match ports | `PurchaseOrderMatchQueryPort` + `GoodsReceiptMatchQueryPort` required; package never `FROM`/`JOIN` `purchase_order` / `goods_receipt` |
| Match result status | Closed enum: `pending` \| `matched` \| `matched_with_tolerance` \| `exception`; immutable evidence includes PO/GR versions and line quantity/price variances. Exception results retain the invoice in `draft`. |
| Stale match | Post reloads PO and GR port bases. A version change requires a new match before posting. |
| Credit notes | Lifecycle is draft → line(s) → posted. `issueSupplierCreditNote` composes that lifecycle for a single credit line. |
| Reversal | Reversal marks active allocations `reversed` with actor and time; it never deletes allocation facts. |

## Payment vs application ownership

| Surface | Owner | Table |
|---------|-------|-------|
| Money movement / payment lifecycle | `@afenda/payments` | `payment`, `payment_allocation` |
| AP application of a posted payment to a supplier invoice | `@afenda/payables` | `supplier_allocation` |

`applySupplierPayment` records a Payables-owned application fact with
`paymentId`, `paymentApplicationInstructionId`, and `applyIdempotencyKey`. It never creates or mutates Payment rows. Do not confuse
`payment_allocation` (Payments module) with `supplier_allocation` (this package).

## ERP boundary

Payables never imports peer ERP packages directly and never writes purchasing,
receiving, payment, ledger, or journal tables. Cross-module reads for match and
apply go through injected query ports at the composition root (`apps/web`).
Cross-module integration for accounting uses versioned outbox events.

Optional integrations (manifest): purchasing / receiving / payments → `ports`;
accounting → `events`.

## Same-TX outbox

Match, post, apply, and credit paths commit domain rows + `supplier_balance_projection`
(where applicable) + outbox event in one Neon HTTP transaction (CTE). Audit
facts are not always co-committed with the domain write — treat audit as best-effort
unless a named mission expands that contract.

## Events

- `payables.invoice.created.v1`
- `payables.invoice.matched.v1`
- `payables.invoice.posted.v1`
- `payables.invoice.cancelled.v1`
- `payables.credit_note.posted.v1`
- `payables.allocation.posted.v1` (emitted when a supplier payment application posts)
- `payables.payment_application.reversed.v1`

## Maintain

```bash
pnpm --filter @afenda/payables lint
pnpm --filter @afenda/payables typecheck
pnpm --filter @afenda/payables test
pnpm --filter @afenda/payables check
```
