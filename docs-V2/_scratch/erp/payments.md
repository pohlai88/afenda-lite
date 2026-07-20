# Payments — Scratch contract (operative)

> **Status:** `OPERATIVE` — Tier A Scratch contract; PAY-REQ ledger Pass (v1 carve-outs = Observation, not gaps).  
> **As of:** 2026-07-21  
> **Score:** **Pass** — REQ ledger closed; no open blocking findings in this file.  
> **Tier:** A operative contract — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/payments` · Tables: `@afenda/db` · Band: R1-F ERP · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** [package README](../../../packages/erp/payments/README.md) · this file owns gap ledger + invariants (Living `docs/` dormant).

## Purpose

Org-scoped money movement: receipts, disbursements, internal transfers, and refunds. Payments is the **sole mutator** of `payment_account`, `payment`, `payment_allocation` (application instructions), and `payment_reversal`. Receivables and Payables own subledger applications. Accounting owns journals. Master Data is read-only for Party references.

## Ownership model

| Surface | Purpose |
| --- | --- |
| `payment_account` | Operational bank/cash/gateway/clearing account (Payments-owned) |
| `payment` | Money movement aggregate (`draft` → `posted` \| `reversed`) |
| `payment_allocation` | **Application instruction** (intent) — not AR/AP allocation |
| `payment_reversal` | Linked reversal record; original Payment immutable after post |
| Availability query | `availableToApply` from posted amount minus reserved/applied instructions and refunds |

**Direction (cash sense):** `receipt` \| `disbursement` \| `refund`  
**Transfer:** paired payments (`transfer_group_id`) — not a single-direction Payment alone.

**Purpose:** `customer_receipt` \| `supplier_disbursement` \| `customer_refund` \| `supplier_refund_receipt` \| `internal_transfer` \| `manual_receipt` \| `manual_disbursement`

**Settlement policy (v1):** `posted` ≡ settled (cash/synchronous). Async bank settlement, `releasePayment`, FX, fees, and external bank sync are **out of v1**.

**Accounting:** Payments emits versioned events; automatic journal posting is Accounting-owned and **out of this slice**.

## Operation map

| Operation | Permission |
| --- | --- |
| `createPaymentAccount` / `listPaymentAccounts` | `payments.account.manage` / `payments.account.read` |
| `createDraftPayment` | `payments.payment.create` |
| `addPaymentApplicationInstruction` | `payments.application_instruction.manage` |
| `postPayment` | `payments.payment.post` |
| `reversePayment` | `payments.payment.reverse` |
| `createAndPostPaymentTransfer` | `payments.transfer.create` + `payments.transfer.post` |
| `postRefund` | `payments.refund.create` + `payments.refund.post` |
| `getPaymentById` / `listPayments` | `payments.payment.read` |
| `getPaymentApplicationAvailability` | `payments.availability.read` |
| Mark instruction applied/rejected | `payments.application_instruction.manage` |

## Application instruction

Table name may remain `payment_allocation`. Domain meaning is **Payment Application Instruction**:

- `targetModule`: `receivables` \| `payables`
- `targetDocumentType`: customer/supplier invoice or credit
- `intendedAmount` / `appliedAmount` / `currencyCode`
- `status`: `pending` \| `applied` \| `partially_applied` \| `rejected` \| `reversed`

Receivables/Payables create authoritative customer/supplier allocations at the composition root.

## Invariants

- Every Payment belongs to exactly one organization.
- Payment Accounts and counterparties must belong to that organization.
- Posted Payments are immutable; reversals and refunds create new linked records.
- Application records are instructions, not AP or AR allocations.
- Receivables and Payables remain the authoritative subledger application owners.
- Application instructions cannot exceed available Payment value (concurrency-safe).
- Different currencies cannot be applied (v1: payment, instruction, and target currencies match).
- Transfers: source ≠ dest accounts; same org; both active; same amount; both legs atomic; net org cash = 0.
- Refunds: positive outward amount; currency matches source; cumulative ≤ refundable; never mutate/delete original Payment.
- Every public operation is authorized through its manifest-mapped permission inside the package.
- Every material mutation is idempotent and concurrency-safe.
- Payment changes, audit facts and outbox events commit or roll back together.
- Payments never writes Receivables, Payables or Accounting tables.
- Payments never imports peer ERP packages.

## V1 carve-outs (Observations — not gaps)

| Item | Stance |
| --- | --- |
| `releasePayment`, settlement/failure APIs | Out of v1; posted ≡ settled |
| FX / multi-currency apply | Out of v1 |
| Fee / net settlement fields | Not modeled |
| External bank / gateway sync | Future integration |
| Accounting auto-journal from events | Accounting farm |

## Completeness ledger (PAY-REQ)

| ID | Requirement | Status | Slice | Verify |
| --- | --- | --- | --- | --- |
| PAY-REQ-001 | Application instruction semantics on `payment_allocation` | Pass | S1/S2 | schema + domain tests |
| PAY-REQ-002 | Payment Account aggregate + reference on Payment | Pass | S1/S2 | schema + commands |
| PAY-REQ-003 | Transfer dual legs + transfer_group_id | Pass | S2 | transfer tests |
| PAY-REQ-004 | Direction vs purpose enums | Pass | S2 | types + schemas |
| PAY-REQ-005 | Fine-grained permissions | Pass | S3 | catalog + auth tests |
| PAY-REQ-006 | idempotencyKey on material mutations | Pass | S2 | schemas + indexes |
| PAY-REQ-007 | getPaymentApplicationAvailability + race | Pass | S2/S7 | race test |
| PAY-REQ-008 | Refund source + max refundable | Pass | S2 | refund tests |
| PAY-REQ-009 | Events: payment + instruction + transfer | Pass | S4 | events schema tests |
| PAY-REQ-010 | Export split; Memory off prod barrel | Pass | S2 | package.json exports |
| PAY-REQ-011 | Package error codes | Pass | S2 | error-codes.ts |
| PAY-REQ-012 | Composition-root AR/AP apply on post/reverse | Pass | S5 | web orchestrator |
| PAY-REQ-013 | module.manifest + catalog aligned | Pass | S3 | validate:modules |
| PAY-REQ-014 | Counterparty snapshot at post | Pass | S2 | post path |
| PAY-REQ-015 | Reconcile CLI + README Ops | Pass | S7 | `pnpm --filter @afenda/payments reconcile` |
| PAY-REQ-016 | Actions/UI/AGENTS surface sync | Pass | S6 | wiring tests + AGENTS |
| PAY-REQ-017 | release/settlement/FX/fees/bank | Pass | S0 | Out of scope |
| PAY-REQ-018 | Accounting auto-journal | Pass | S0 | Out of scope |
| PAY-REQ-019 | Memory ≡ Drizzle atomic contract | Pass | S2 | both adapters |
| PAY-REQ-020 | No peer ERP imports from payments | Pass | S2 | anti-shadow |
| PAY-REQ-021 | Posted ≡ settled documented | Pass | S0 | README + this contract |
| PAY-REQ-022 | Invariants in package contract | Pass | S0 | README |

## Priority order (execution)

```text
1. Redefine payment_allocation as application instructions
2. Separate posting from external settlement (v1: posted ≡ settled)
3. Add Payment Account ownership
4. Define atomic transfer legs
5. Define refund source and maximum refundable amount
6. Replace read/manage with fine-grained permissions
7. Package-internal authorization and manifest mappings
8. Idempotency and application concurrency controls
9. Reversal and composition-root application-reversal
10. Currency, reconciliation, metrics and recovery contracts
```

## Public surfaces

| Path | Role |
| --- | --- |
| `@afenda/payments` | Commands, queries, schemas, types, permissions, error codes, auth port |
| `@afenda/payments/adapters/drizzle` | Production store |
| `@afenda/payments/testing` | Memory store |
| `@afenda/payments/module-manifest` | R1-F manifest |

## Verify

```bash
pnpm --filter @afenda/payments check
pnpm --filter @afenda/payments reconcile
pnpm --filter @afenda/receivables test
pnpm --filter @afenda/payables test
pnpm --filter @afenda/web test -- product-authorization-wiring
pnpm validate:modules
```

## Authority

| Topic | Link |
| --- | --- |
| Package README | [packages/erp/payments/README.md](../../../packages/erp/payments/README.md) |
| Monorepo DAG | [docs-V2/monorepo/README.md](../../monorepo/README.md) |
| Events | [docs-V2/events/README.md](../../events/README.md) |
| Tenancy | [docs-V2/tenancy/README.md](../../tenancy/README.md) |
| Checkout | [AGENTS.md](../../../AGENTS.md) |
