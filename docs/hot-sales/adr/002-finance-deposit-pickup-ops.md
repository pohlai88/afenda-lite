| **Doc type** | `ADR` — Phase 2B Finance + Pickup/Ops (**Accepted**) |
| **Agent entry** | [../RUNTIME.md](../RUNTIME.md) |

# ADR-002: Hot Sales Phase 2B — Finance/deposit SoT + Pickup/Ops

| Field | Value |
|-------|-------|
| **Status** | **Accepted** |
| **Accepted** | 2026-07-10 |
| **Date** | 2026-07-10 |
| **Owners** | Hot Sales / Trade |
| **Scope** | Operational deposit tracking + pickup/fulfillment workflow under `/trade` |
| **Out of scope** | Payment settlement engine, ERP sync (ADR-004), Excel import (2C), notification delivery (ADR-003) |

**Related:** [../spec/phase-2a-prd.md](../spec/phase-2a-prd.md) §5 · [../archive/phase-2-feedback.md](../archive/phase-2-feedback.md) · [001-rbac.md](./001-rbac.md) · [./phase-2bcd-slices.md](../spec/phase-2bcd-slices.md)

**Gate:** ADR accepted — **no schema or application code** until [../spec/phase-2bcd-slices.md](../spec/phase-2bcd-slices.md) is **Approved** per phase (2B-1 … 2B-4).

---

## Context

Phase 1 stores a lightweight `hot_sales_order.deposit_status` (`not_required | pending | paid | waived`) and `fulfilled_quantity` for pickup support. That is insufficient for:

- Finance/ops teams recording receipts, adjustments, waive/forfeit/refund with audit
- Pickup scheduling, partial pickup, no-show, and exception handling beyond a single quantity field

Phase 2A shipped permission codes `deposit.view`, `deposit.manage`, `pickup.view`, `pickup.manage` — but no domain tables or UI for them yet.

---

## Decision

### 2B.1 Finance / deposit — source of truth

| Layer | SoT | Rule |
|-------|-----|------|
| **Official settlement** | External ERP/Finance (future ADR-004) | Hot Sales does **not** become payment settlement SoT in 2B |
| **Operational deposits** | Hot Sales `hot_sales_deposit*` tables | Staff record operational deposit state for sales workflow |
| **Order summary** | `hot_sales_order.deposit_status` | **Projection only** — derived from deposit records, not authoritative |

**No in-app payment processor** in 2B (no Stripe/bank capture). Amounts, receipt references, payment dates, and confirmation actors are **recorded**, not settled.

Extend `deposit_status` enum (additive migration) toward:

```text
not_required | pending | paid | partially_paid | waived | forfeited | refunded | cancelled
```

Phase 1 values remain valid; new states apply only when deposit records exist.

### 2B.2 Finance tables (additive)

```text
hot_sales_deposit           — order-linked deposit record (amount, currency, due date, status)
hot_sales_deposit_receipt   — receipt reference, paid_at, recorded_by
hot_sales_deposit_adjustment — waive / refund / forfeit / correction (reason required)
hot_sales_finance_audit     — append-only finance mutation log
```

**Rules:**

1. Waive, refund, forfeit, and amount corrections require **reason** + **actor** + audit row.
2. Non-refundable flag supported at deposit level (template/policy field).
3. `deposit.manage` required for writes; `deposit.view` for read/export.
4. Order `deposit_status` updated by domain service after deposit mutation (single write path).

### 2B.3 Pickup / Ops workflow

Move from bare `fulfilled_quantity` to explicit ops state machine.

**Tables (additive):**

```text
hot_sales_pickup_window      — event-scoped pickup slots
hot_sales_pickup_assignment  — order/customer ↔ window
hot_sales_fulfillment_record — qty confirmed, actor, timestamp
hot_sales_pickup_exception   — no-show, partial, cancel, override (reason + audit)
```

**States (planning):**

```text
pending_schedule | scheduled | ready_for_pickup | partially_picked_up | picked_up | no_show | cancelled | exception
```

**Rules:**

1. `fulfilled_quantity` on order remains the **rollup** used by allocation/export; updated from fulfillment records.
2. Post-`picked_up` changes require `pickup.manage` + reason + audit.
3. Partial pickup and no-show are first-class (not silent qty drift).
4. Pickup permissions from ADR-001 (`pickup.view` / `pickup.manage`) enforced server-side on every mutation.

### 2B.4 Release packaging

Ship 2B in slices (see phase-2bcd-slices): **deposit domain → deposit UI → pickup domain → pickup UI**. Do not combine with 2C/2D in one migration.

---

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Hot Sales as finance settlement SoT | Scope creep; conflicts with ERP; regulatory/compliance risk |
| Keep Phase 1 `deposit_status` only | Blocks finance role and audit requirements |
| Pickup = edit `fulfilled_quantity` only | No scheduling, exceptions, or ops queue |
| Single “Ops” mega-table | Poor audit and reporting; split by concern |

---

## Consequences

### Positive

- Clear operational workflow without pretending to be ERP
- ADR-004 can sync deposit projections outbound without rewriting 2B
- RBAC permissions from 2A become meaningful

### Negative / costs

- New migrations + admin/ops UI surface area
- Projection sync between deposit records ↔ order field must stay consistent
- Training: staff must understand operational vs official settlement

### Follow-ups

- [ADR-003](./003-imports-notifications.md) — deposit/pickup notification triggers
- [ADR-004](./004-erp-sync.md) — deposit master sync when ERP contract exists

---

## Acceptance criteria (ADR)

```text
- [x] Accepted 2026-07-10
- [ ] phase-2bcd-slices 2B-* Approved before any migration
- [ ] No payment settlement engine in 2B code
- [ ] deposit_status remains projection; deposit tables are write SoT for ops
- [ ] Waive/refund/forfeit require reason + audit
- [ ] pickup.manage required for fulfillment/exception writes
- [ ] Phase 1 orders/events remain compatible (additive only)
```

---

## Rollback

Feature-flag `HOT_SALES_DEPOSIT_ENABLED` / `HOT_SALES_PICKUP_OPS_ENABLED` (env, default false until slice acceptance). If rolled back: stop writes to new tables; continue Phase 1 `deposit_status` + `fulfilled_quantity` manual path; tables remain unused.
