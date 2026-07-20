# Payables (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/payables/README.md` |
| Authority | **Scratch** — monorepo-discipline · `@afenda/payables` · web Actions |
| Purpose | Accounts-payable spine: supplier invoice lifecycle, three-way match ports, payment application, balance projection |
| Updated | 2026-07-21 |

Operational contract: [operational-payables-contract.md](operational-payables-contract.md).
Package README: [`packages/erp/payables/README.md`](../../packages/erp/payables/README.md).
Gap matrix: [`_scratch/erp/payable.md`](../_scratch/erp/payable.md).

## Verdict

**Keep `@afenda/payables` as the sole write path** for supplier invoices, match
results, supplier allocations, credit notes, and supplier balance projections.
Schemas live in `@afenda/db`. Payments owns money movement; Payables applies
posted payments via ports.

| Concern | Owner |
|---------|-------|
| Tables `supplier_*` · `three_way_match_result` | `@afenda/db` (`schema/payables.ts`) |
| Domain commands · Zod · store · match validation | `@afenda/payables` |
| PO/GR/posted-payment reads | Ports + adapters in `apps/web/lib/erp/` |
| Outbox catalog | `@afenda/events` (`payables.*`) |
| Server Actions / shell | `apps/web` (`features/payables` · `app/actions/*supplier*`) |

## Closed on disk

| ID | Outcome |
|----|---------|
| AP-01 / AP-12 | `applySupplierPayment` + `PostedPaymentQueryPort` + same-currency fail-closed |
| AP-02 / AP-18 | Match via PO/GR ports; no peer-table SQL in package; manifest `ports` |
| AP-03 | Cancel only `draft` \| `matched`; no projection adjust on unposted cancel |
| AP-04 | Invoice lifecycle `draft → matched → posted \| cancelled` |
| AP-05 | Package-internal coarse auth |
| AP-06 / AP-MATCH-EVIDENCE | Qty/price variance + tolerance status + immutable evidence + stale post guard |
| AP-APPLY-PARITY | Apply carries `paymentApplicationInstructionId` + `idempotencyKey` |
| AP-REV | `reverseSupplierPaymentApplication` + Action/UI (status mark, not delete) |
| AP-CREDIT-DRAFT | Draft/line/post credit lifecycle (+ compose `issueSupplierCreditNote`) |
| AP-CREDIT-APPLY | `applySupplierCredit` via `credit_note_id` |
| AP-EVENTS | `invoice.cancelled.v1` · `payment_application.reversed.v1` |
| AP-LIST-BAL | List filters (status/supplier/currency/documentType) + enriched balance shape |
| AP-20 / AP-22 | `payment_allocation` vs `supplier_allocation` vocabulary |

## Named leftovers (out of this serial)

| Follow-on | Scope |
|-----------|--------|
| Fine-grained RBAC | `payables.invoice.*` (coarse `read`/`manage` remains DNA) |
| Non-PO / commercial fields | Source types, tax, richer invoice headers / due-date overdue |

## Verify

```bash
pnpm --filter @afenda/payables typecheck test
pnpm --filter @afenda/db test -- payables tenancy
pnpm --filter @afenda/events test -- schemas
pnpm --filter @afenda/web typecheck test -- product-authorization-wiring
pnpm audit:tenancy-nulls
```
