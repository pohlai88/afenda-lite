# Payables (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/payables/README.md` |
| Authority | **Scratch** — monorepo-discipline · `@afenda/payables` · web Actions |
| Purpose | Accounts-payable spine: supplier invoice lifecycle, three-way match ports, payment application, balance projection |
| Updated | 2026-07-21 |

Operational contract: [operational-payables-contract.md](operational-payables-contract.md).
Package README: [`packages/erp/payables/README.md`](../../packages/erp/payables/README.md).
Gap review (Tier C/D): [`_scratch/erp/payable.md`](../_scratch/erp/payable.md).

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

## AP-ALIGN-1 closed

| ID | Outcome |
|----|---------|
| AP-01 / AP-12 | `applySupplierPayment` + `PostedPaymentQueryPort` + same-currency fail-closed |
| AP-02 / AP-18 | Match via PO/GR ports; no peer-table SQL in package; manifest `ports` |
| AP-03 | Cancel only `draft` \| `matched`; no projection adjust on unposted cancel |
| AP-06 (minimal) | `ThreeWayMatchStatus` closed enum; v1 success → `matched` |
| AP-20 / AP-22 | This pack + package README distinguish `payment_allocation` vs `supplier_allocation` |

## Named leftovers (not silent)

| Follow-on | Scope |
|-----------|--------|
| AP-REV | `reverseSupplierPaymentApplication` |
| AP-MATCH-EVIDENCE | Qty/price variance + Purchasing tolerance snapshot |
| AP-CREDIT-DRAFT | Full credit draft/line lifecycle |
| Fine-grained RBAC | `payables.invoice.*` (coarse `read`/`manage` remains DNA) |
| Non-PO / commercial fields | Source types, tax, richer invoice headers |

## Verify

```bash
pnpm --filter @afenda/payables typecheck test
pnpm --filter @afenda/web typecheck test -- payables
pnpm --filter @afenda/db test -- tenancy
pnpm audit:tenancy-nulls
```
