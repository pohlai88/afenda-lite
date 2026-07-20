# Payables — plan ↔ disk completeness (Scratch)

> **Status:** `CLOSED` for mission leftovers — AP-ALIGN-1 + serial leftovers Pass on disk.  
> **As of:** 2026-07-21  
> **Score:** **9.4/10** — enterprise AP spine closed; commercial/RBAC leftovers named below.  
> **Tier:** D audit trace — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/payables` · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** [`docs-V2/payables/README.md`](../../payables/README.md) · [`operational-payables-contract.md`](../../payables/operational-payables-contract.md) · [`packages/erp/payables/README.md`](../../../packages/erp/payables/README.md)

## Completeness matrix

| ID | Requirement | Finding |
|----|-------------|---------|
| AP-01 | `applySupplierPayment` + `supplier_allocation`; no Payment create | **Pass** |
| AP-02 | Match via PO/GR ports; no peer-table SQL | **Pass** |
| AP-03 | Cancel only `draft` \| `matched`; posted immutable | **Pass** |
| AP-04 | Lifecycle `draft → matched → posted \| cancelled` | **Pass** |
| AP-05 | Package-internal coarse auth (`payables.read` / `manage`) | **Pass** |
| AP-06 | `ThreeWayMatchStatus` closed enum + evidence write | **Pass** |
| AP-REV | `reverseSupplierPaymentApplication` + Action/UI | **Pass** |
| AP-APPLY-PARITY | Apply carries `paymentApplicationInstructionId` + `idempotencyKey` | **Pass** |
| AP-MATCH-EVIDENCE | Qty/price variance + tolerance → evidence write | **Pass** |
| AP-CREDIT-DRAFT | Draft/line/post credit lifecycle | **Pass** |
| AP-CREDIT-APPLY | `applySupplierCredit` via `credit_note_id` | **Pass** |
| AP-EVENTS | `invoice.cancelled` · `payment_application.reversed` | **Pass** |
| AP-LIST-BAL | List filters + balance shape (no fake overdue) | **Pass** |
| AP-COMMERCIAL | Header tax / source types / due dates | **Observation** — named out of mission |
| AP-RBAC-FINE | Fine-grained catalog codes | **Observation** — named out of mission |
| AP-DOC | Scratch matrix aligned to disk | **Pass** |

## Payment vs application ownership (resolved)

| Concern | Owner | Table |
|---------|-------|-------|
| Money movement / payment lifecycle | `@afenda/payments` | `payment`, `payment_allocation` |
| Application of a posted payment to AP docs | `@afenda/payables` | `supplier_allocation` |

## Public surface (on disk)

```ts
createDraftSupplierInvoice;
addSupplierInvoiceLine;
matchSupplierInvoice;
postSupplierInvoice;
cancelSupplierInvoice;

createDraftSupplierCreditNote;
addSupplierCreditNoteLine;
postSupplierCreditNote;
issueSupplierCreditNote; // compose convenience

applySupplierPayment;
reverseSupplierPaymentApplication;
applySupplierCredit;

getSupplierInvoiceById;
listSupplierInvoices;
getSupplierBalance;
```

## Out of mission (explicit)

- Recurring invoices · approval workflow · multi-currency FX
- Ops metrics / recovery runbooks
- Package export split (`/contracts` · `/adapters/drizzle` · `/testing`)
- Fine-grained RBAC catalog seed beyond coarse DNA
- Commercial header / tax / source-type expansion
- Document-detail UI redesign

## Verify evidence (this close)

```bash
pnpm --filter @afenda/payables lint typecheck test   # 8 tests pass
pnpm --filter @afenda/db test -- payables tenancy    # 13 tests pass
pnpm --filter @afenda/events test -- schemas         # 9 tests pass
pnpm --filter @afenda/web test -- product-authorization-wiring  # 12 tests pass
```

Note: full `pnpm --filter @afenda/web typecheck` may still fail on unrelated
`lib/erp/master-data-import.ts` Session typing — not a payables surface defect.
