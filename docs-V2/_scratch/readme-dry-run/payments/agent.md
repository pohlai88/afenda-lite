# `@afenda/payments`

Org-scoped payment execution for receipts, disbursements, transfers, refunds, allocations, posting, and reversal.

The package solely mutates `payment`, `payment_allocation`, and `payment_reversal`; schemas remain in `@afenda/db`. Refunds are `payment` rows with `direction = refund`; there is no separate refund table.

## Consume

Import `createDraftPayment`, `addPaymentAllocation`, `postPayment`, `reversePayment`, `postRefund`, `getPaymentById`, and `listPayments` from `@afenda/payments`.

Every mutation requires organization, actor, and correlation identity. Posting and reversal use optimistic versions. Refund creation and posting are one transaction.

## ERP boundary

Payments does not import peer ERP packages (`@afenda/receivables`, `@afenda/payables`, `@afenda/accounting`) and does not write receivables, payables, journal, ledger, or accounting tables. Allocations retain target identities; versioned events let the application composition root invoke the owning packages.

## Events

- `payments.payment.created.v1`
- `payments.payment.posted.v1`
- `payments.payment.reversed.v1`
- `payments.refund.posted.v1`

## Maintain

```bash
pnpm --filter @afenda/payments lint
pnpm --filter @afenda/payments typecheck
pnpm --filter @afenda/payments test
pnpm --filter @afenda/payments check
```

Permissions are `payments.read` and `payments.manage`.

## Authority

- Package source: `packages/erp/payments`
- Scratch review (target-state critique): [`docs-V2/_scratch/erp/payment.md`](../../erp/payment.md)
