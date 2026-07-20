# Operational payables contract (Scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/payables/operational-payables-contract.md` |
| Authority | **Scratch** — not Living DOC-001 |
| Purpose | Bound invoice lifecycle, match ports, payment application, and projection rules |
| Parents | [README.md](README.md) · package [`@afenda/payables`](../../packages/erp/payables/README.md) |
| Updated | 2026-07-21 |

## Lifecycle

```text
draft → matched → posted
  ↓        ↓
cancelled  cancelled
```

| Transition | Guard |
|------------|-------|
| Match | Draft invoice with lines; PO + GR ports succeed; `evaluateThreeWayMatch` → status |
| Post | Status `matched`; version CAS |
| Cancel | Status `draft` or `matched` only — **posted cancel rejected** |
| Apply payment | Posted invoice; posted payment same currency; amount ≤ open |

## Match ports

Composition root (`apps/web`) injects:

- `PurchaseOrderMatchQueryPort` → purchasing `getPurchaseOrderById`
- `GoodsReceiptMatchQueryPort` → receiving `getGoodsReceiptById`

Package stores match evidence on `three_way_match_result` and stamps
`supplier_invoice.purchase_order_id` for purchasing commitment queries. No
`FROM` / `JOIN` on `purchase_order` / `goods_receipt` inside `@afenda/payables`.

Match requires same supplier and same currency as the PO basis, plus GR coverage
of invoiced quantities. Match status vocabulary (domain): `pending` \| `matched` \|
`matched_with_tolerance` \| `exception`. Port success path writes `matched`.
Validation failure does not write a match row.

## Payment application

1. Payments module posts a `payment` (and may write `payment_allocation` for its own concerns).
2. Payables `applySupplierPayment` requires `paymentId` + `PostedPaymentQueryPort`.
3. Payables writes `supplier_allocation` and reduces invoice `open_amount` + projection.

Fail-closed: missing port, non-posted payment, currency mismatch, over-apply.

## Balance projection

`supplier_balance_projection.open_balance` is authoritative for AP open AP.
Mutated only when financial effects land (post / apply / credit). Cancelling an
unposted document must not invent projection deltas.

## Permissions (coarse DNA)

| Code | Duty |
|------|------|
| `payables.read` | Get / list invoices · supplier balance |
| `payables.manage` | Create, line, match, post, credit, apply, reverse, cancel |

Fine-grained codes are out of this contract until a named RBAC mission.

## Credit notes

Lifecycle: draft → line(s) → posted via `createDraftSupplierCreditNote`,
`addSupplierCreditNoteLine`, `postSupplierCreditNote`.
`issueSupplierCreditNote` composes that path for a single credit line.
`applySupplierCredit` writes `supplier_allocation.credit_note_id`.

## Dual allocation vocabulary

| Term | Module | Meaning |
|------|--------|---------|
| `payment_allocation` | Payments | How a payment is split across documents inside Payments |
| `supplier_allocation` | Payables | AP fact that a posted payment (or credit) was applied to a supplier invoice |

## Payment application

`applySupplierPayment` requires `paymentId`, `paymentApplicationInstructionId`,
and `idempotencyKey`. Reversal is `reverseSupplierPaymentApplication` (marks
allocations `reversed`; never deletes).

## Match evidence

PO/GR ports supply line unit prices and evidence versions. Match status may be
`matched`, `matched_with_tolerance`, or `exception`. Exception retains the
invoice in `draft`. Post rejects stale PO/GR evidence versions.
