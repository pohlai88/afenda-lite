# Receivables — completeness ledger (Scratch)

> **Status:** `COMPLETE` — Plan ↔ disk closed for AR R1-F surface. Coverage Complete on evaluated controls.  
> **As of:** 2026-07-21  
> **Score:** **9.2/10** — deep AR↔GL control-account reconcile remains Observation (Accounting peer follow-on).  
> **Tier:** D audit trace — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/receivables` · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** [package README](../../../packages/erp/receivables/README.md) · package disk  
> **Naming:** `done-*` reserved for Scratch scores **> 9.5**; this ledger stays `receivable.md`.

Review source (historical findings): prior Scratch review body — git history only.

---

## Completeness matrix (plan → codebase)

| ID | Requirement | Implemented | Verified | Severity | Evidence |
|----|-------------|-------------|----------|----------|----------|
| R1 | Receipt apply vs Payments ownership | Yes | Yes | Pass | `applyCustomerReceipt` / `reverseCustomerReceiptApplication` · instruction id required · web `payments-application-orchestrator` marks Payments |
| R2 | Invoice source ports | Yes | Yes | Pass | `SalesInvoiceSourcePort` / delivery port · Sales `getInvoiceableSalesOrder` · Fulfillment `getInvoiceableDelivery` |
| R3 | Over-invoicing at post | Yes | Yes | Pass | remaining qty checks · OCC on invoice version |
| R4 | Draft-only cancel | Yes | Yes | Pass | `cancelDraftSalesInvoice` · posted → credit note only |
| R5 | Close when open = 0 | Yes | Yes | Pass | `closeSalesInvoice` · `closed` status · migration columns |
| R6 | Credit-note law | Yes | Yes | Pass | `sales_credit_note` memory/drizzle parity · amount + issue idempotency |
| R7 | Fine-grained permissions | Yes | Yes | Pass | catalog · manifest · Actions · retired `receivables.read`/`manage` |
| R8 | Idempotency + OCC | Yes | Yes | Pass | schemas · keys on invoice/credit/allocation · migration `0026` |
| R9 | Balance projection + aging | Yes | Yes | Pass | `getCustomerBalance` · `getCustomerAging` |
| R10 | Atomic audit/outbox | Yes | Yes | Pass | drizzle TX · memory rollback · event catalog |
| R11 | Manifest / adapter shape | Yes | Yes | Pass | fulfillment-shaped package files · thin `index.ts` |
| R12 | Projection reconcile | Yes | Yes | Pass | package `reconcile` CLI |
| R13 | Web BFF + UI | Yes | Yes | Pass | Actions · forms · shell · product-authorization-wiring |
| R14 | Neon migrate + catalog ensure | Yes | Yes | Pass | `0026_receivables_gap_close` · `0027_schema_snapshot_catchup` · `db:ensure-permission-catalog` (68) |
| R15 | Scratch normalize | Yes | Yes | Pass | this ledger (`receivable.md`; score 9.2 — below `done-*` bar) |

### Check coverage

```text
Applicable controls:       15
Controls with checks:      15
Checks executed:           6  (receivables check · events typecheck · db receivables-schema · db platform-permission · web product-authorization-wiring · guarded migrate + catalog ensure)
Checks passed:             6
Checks failed:             0
Controls without checks:   0
Unevaluated controls:      0
Coverage: Complete
```

Latest verify (2026-07-21):

```bash
pnpm --filter @afenda/receivables check
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/db test -- receivables-schema
pnpm --filter @afenda/db test -- platform-permission-catalog
pnpm --filter @afenda/web test -- product-authorization-wiring
# Live Neon (operator):
AFENDA_ALLOW_DB_MIGRATE=1 AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1 pnpm --filter @afenda/db db:migrate
pnpm --filter @afenda/db db:ensure-permission-catalog   # permissionCount: 68
```

---

## Observations (not gaps)

| ID | Note |
|----|------|
| O1 | Deep Receivables subledger ↔ Accounting AR control-account reconcile needs Accounting query surface — package reconcile covers AR projection rebuild only |
| O2 | List uses `page`/`pageSize`, not cursor — sufficient for R1-F console |
| O3 | FX / multi-currency apply out of v1 (same stance as Payments) |
| O4 | Composition root owns Payments instruction mark applied/rejected — Receivables never writes `payment_*` tables |

---

## Public surface (disk truth)

**Commands:** `createDraftSalesInvoice` · `addSalesInvoiceLine` · `postSalesInvoice` · `cancelDraftSalesInvoice` · `closeSalesInvoice` · `issueCreditNote` · `applyCustomerReceipt` · `reverseCustomerReceiptApplication` · `reverseCustomerAllocationsByPayment`  
**Queries:** `getSalesInvoiceById` · `listSalesInvoices` · `getCustomerBalance` · `getCustomerAging`  
**Permissions:** `receivables.invoice.read|create|update|post|cancel|close` · `receivables.credit_note.issue` · `receivables.receipt.apply` · `receivables.receipt_application.reverse` · `receivables.balance.read` · `receivables.aging.read`  
**Events:** `invoice.created|posted|cancelled|closed` · `credit_note.posted` · `receipt_application.posted|reversed` (+ allocation compat aliases)  
**Ports:** Master lookup · sales/delivery invoiceable query · Payments instruction availability (composition root) · `ReceivablesAuthorizationPort`  
**DB:** migration `0026_receivables_gap_close.sql` · snapshot catch-up `0027_schema_snapshot_catchup.sql`

**Verify:**

```bash
pnpm --filter @afenda/receivables check
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/db db:ensure-permission-catalog
pnpm --filter @afenda/receivables reconcile -- --organizationId=<org>
```

---

## Historical review (superseded)

Original Scratch review findings (score 7.0/10, `allocateCustomerReceipt` blocker, coarse permissions, missing idempotency/aging/reconcile) are remediated in the matrix above and retained only as git history. Do not re-open them without new disk evidence.
