# `@afenda/payments`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/payments`

Org-scoped payment accounts, money-movement payments (`draft` → `posted` | `reversed`), application instructions, transfers, and refunds. **`posted` ≡ settled** — there is no separate settlement status. Outcomes use `@afenda/errors` `Result`.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `payment` / `payment_account` / `payment_allocation` / `payment_reversal` from `apps/web` or peer ERP packages. Payments never imports `@afenda/receivables`, `@afenda/payables`, or `@afenda/accounting`.

## Consume

```ts
import {
  createPaymentAccount,
  createDraftPayment,
  addPaymentApplicationInstruction,
  postPayment,
  reversePayment,
  createAndPostPaymentTransfer,
  postRefund,
  getPaymentById,
  listPayments,
  getPaymentApplicationAvailability,
} from "@afenda/payments";
```

Pass `organizationId`, `actorUserId`, `correlationId`, and `idempotencyKey` on every material mutation.

### Directions and purpose

| Direction | Meaning |
| --- | --- |
| `receipt` | Money in |
| `disbursement` | Money out |
| `refund` | Refund against an original posted payment |

`transfer` is **not** a direction. Use `createAndPostPaymentTransfer` to create a paired disbursement + receipt with the same `transferGroupId`.

Purpose enum: `customer_receipt` · `supplier_disbursement` · `customer_refund` · `supplier_refund_receipt` · `internal_transfer` · `manual_receipt` · `manual_disbursement`.

### Application instructions

`payment_allocation` rows are **PaymentApplicationInstruction** records (`targetModule`, `targetDocumentType`, `targetDocumentId`, `intendedAmount`, `appliedAmount`, `status`). V1 command input accepts **invoice** document types only (`customer_invoice` \| `supplier_invoice`). Composition roots mark applied/rejected via `markApplicationInstructionApplied` / `markApplicationInstructionRejected`.

Availability for a posted payment:

`availableToApply = amount − Σ(intended of pending|applied|partially_applied) − Σ(posted refunds)`

### Permissions

| Operation | Permission |
| --- | --- |
| `createDraftPayment` | `payments.payment.create` |
| `postPayment` | `payments.payment.post` |
| `reversePayment` | `payments.payment.reverse` |
| `addPaymentApplicationInstruction` / mark applied\|rejected | `payments.application_instruction.manage` |
| `createAndPostPaymentTransfer` | `payments.transfer.create` + `payments.transfer.post` |
| `postRefund` | `payments.refund.create` + `payments.refund.post` |
| `createPaymentAccount` | `payments.account.manage` |
| `listPaymentAccounts` | `payments.account.read` |
| `getPaymentById` / `listPayments` | `payments.payment.read` |
| `getPaymentApplicationAvailability` | `payments.availability.read` |

### Store surfaces

| Surface | Backend |
| --- | --- |
| Production | `DrizzlePaymentsStore` (`@afenda/payments/adapters/drizzle`) — entity + `platform_domain_event` same TX |
| Vitest | `MemoryPaymentsStore` (`@afenda/payments/testing`) — not exported from root |

### Reconcile

```bash
pnpm --filter @afenda/payments reconcile -- --organizationId=<org>
```

Reports unbalanced transfer pairs, pending/rejected instructions on posted payments, and reversed payments that still hold active instructions.

### V1 carve-outs

- No `releasePayment` / async settlement APIs (`posted` ≡ settled)
- No FX / multi-currency application
- No fee / net-settlement fields
- No external bank / gateway sync
- Accounting auto-journal from payment events is out of this package (events are emitted)
- Credit-document application targets (`customer_credit` / `supplier_credit`) — out of v1

### Ops

```bash
pnpm --filter @afenda/payments lint
pnpm --filter @afenda/payments typecheck
pnpm --filter @afenda/payments test
pnpm --filter @afenda/payments check
pnpm --filter @afenda/payments reconcile -- --organizationId=<org>
```

Contract: [`docs-V2/_scratch/erp/payments.md`](../../../docs-V2/_scratch/erp/payments.md).
