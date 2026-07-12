# Phase 2B–2D — Implementation slice plan

| Field | Value |
|-------|-------|
| **Status** | **2B Implemented** · **2C Implemented** · **2D In progress** (2D-1 framework) |
| **Proposed** | 2026-07-10 |
| **Date** | 2026-07-10 |
| **Contract** | [./phase-2a-prd.md](./phase-2a-prd.md) §§5–7 |
| **ADRs** | [002](../adr/002-finance-deposit-pickup-ops.md) · [003](../adr/003-imports-notifications.md) · [004](../adr/004-erp-sync.md) (**Accepted**) |
| **Phase 2A baseline** | Tag `fft-phase-2a` → `8e650ff` · ops Gates 1–7 closed |

### Gate

```text
ADR-002 / ADR-003 / ADR-004 = Accepted (2026-07-10)
2B slices = Approved + implemented (flags default off)
2C slices = Approved + implemented (flags default off)
2D slices = Approved — 2D-1 framework in progress

No 2D-3 vendor adapter until integration contract per customer.
```

**Sequence:** 2B → 2C → 2D (strict). Do not parallelize 2D with 2B.

---

## Execution clarifications (binding)

1. **Feature flags** — `FFT_DEPOSIT_ENABLED`, `FFT_PICKUP_OPS_ENABLED`, `FFT_NOTIFICATIONS_ENABLED`, `FFT_ERP_SYNC_ENABLED` (manifest + accessors). Default `false` until slice acceptance + prod promotion checklist.
2. **Additive schema only** — No destructive changes to `013_hot_sales.sql` / `014_fft_rbac.sql` tables.
3. **Permission checks** — Every write path uses ADR-001 permission codes server-side; new codes (e.g. `sync.retry`) require catalog seed + audit rules.
4. **Mail boundary** — Feed Farm Trade notifications use dedicated provider (ADR-003); never Neon Auth shared mail.
5. **Commit lane** — Feed Farm Trade 2B–2D commits stay isolated from declaration portal, Guardian Auth, PA, repo normalization.

---

## Dependency order

```text
2B-0  slice approval (2B)
  ↓
2B-1  deposit schema + domain
  ↓
2B-2  deposit admin UI + projection sync
  ↓
2B-3  pickup schema + domain
  ↓
2B-4  pickup ops UI + fulfillment rollup
  ↓
2C-0  slice approval (2C)
  ↓
2C-1  import pipeline + priority/supply Excel
  ↓
2C-2  bulk order + deposit/pickup import types
  ↓
2C-3  notification templates + delivery log
  ↓
2C-4  notification triggers + env gate
  ↓
2D-0  slice approval (2D) + ERP contract doc
  ↓
2D-1  sync framework + noop adapter + job runner
  ↓
2D-2  mapping admin UI + DLQ/retry
  ↓
2D-3  customer ERP adapter (per integration pack)
```

2C-1 may start after 2B-2 (deposit UI optional for 2C-1). 2C-2 requires 2B-4. 2D requires 2C-4 stable.

---

## Phase 2B — Finance + Pickup/Ops

**ADR:** [002-finance-deposit-pickup-ops.md](../adr/002-finance-deposit-pickup-ops.md)

### 2B-0 — Program reopen + slice approval

| | |
|--|--|
| **Goal** | Stakeholder approves 2B slices; program explicitly reopens |
| **AC** | This doc status for 2B-* marked Approved; gate-register / RUNTIME updated |
| **Depends on** | ADR-002 Accepted |

### 2B-1 — Deposit schema + domain

| | |
|--|--|
| **Goal** | Migration `015_fft_deposit.sql`; domain services for deposit CRUD, adjustments, audit |
| **AC** | Tables per ADR-002; `deposit_status` projection updater; L0 tests; `deposit.manage` / `deposit.view` enforced |
| **Flag** | `FFT_DEPOSIT_ENABLED` |
| **Depends on** | 2B-0 |

### 2B-2 — Deposit admin UI

| | |
|--|--|
| **Goal** | Finance/ops UI under `/fft/[locale]/admin` — record receipt, waive, refund, forfeit |
| **AC** | Reason required on sensitive actions; audit visible; order list shows projected `deposit_status` |
| **Depends on** | 2B-1 |

### 2B-3 — Pickup schema + domain

| | |
|--|--|
| **Goal** | Migration `016_fft_pickup_ops.sql`; windows, assignments, fulfillment, exceptions |
| **AC** | State machine per ADR-002; `fulfilled_quantity` rollup; `pickup.manage` / `pickup.view` enforced; L0 tests |
| **Flag** | `FFT_PICKUP_OPS_ENABLED` |
| **Depends on** | 2B-2 |

### 2B-4 — Pickup ops UI

| | |
|--|--|
| **Goal** | Ops queue: schedule, confirm pickup, partial/no-show, exceptions |
| **AC** | Post-`picked_up` changes need reason + audit; allocation/export reads rollup qty |
| **Depends on** | 2B-3 |

**2B closure:** Tag `fft-phase-2b` after 2B-4 + smoke — checklist in [ops/gate-register.md](../ops/gate-register.md) § Phase 2B closure tag.

---

## Phase 2C — Excel + Notifications

**ADR:** [003-imports-notifications.md](../adr/003-imports-notifications.md)

### 2C-0 — Slice approval

| | |
|--|--|
| **Goal** | Approve 2C slices; sender domain / API key provisioned |
| **AC** | Env keys in manifest; from-address verified for target deployment |
| **Depends on** | 2B-4 |

### 2C-1 — Import pipeline (priority + supply)

| | |
|--|--|
| **Goal** | `fft_import_batch` / `import_row`; dry-run + confirm; templates for priority + supply |
| **AC** | No commit without confirm; row errors retained; max row limit; permission-gated |
| **Depends on** | 2C-0 |

### 2C-2 — Extended import types

| | |
|--|--|
| **Goal** | Bulk orders, deposit records, pickup confirmation imports |
| **AC** | Deposit/pickup types blocked unless 2B flags enabled; duplicate detection in dry-run |
| **Depends on** | 2C-1, 2B-4 |

### 2C-3 — Notification core

| | |
|--|--|
| **Goal** | Template + event tables; delivery log; idempotency; provider adapter |
| **AC** | Failed send does not roll back trade txn; vi/en templates for core events |
| **Flag** | `FFT_NOTIFICATIONS_ENABLED` |
| **Depends on** | 2C-1 |

### 2C-4 — Notification triggers

| | |
|--|--|
| **Goal** | Wire triggers from allocation, transfer, deposit, pickup, event lifecycle |
| **AC** | Per-event enable/disable; idempotency keys tested; no Neon Auth mail path |
| **Depends on** | 2C-3, 2B-4 |
| **Status** | **Done** — includes `event.closing_soon` cron + `deposit.pending` on order/import |

**2C closure:** Tag `fft-phase-2c` after 2C-4 + notification smoke — checklist in [ops/gate-register.md](../ops/gate-register.md) § Phase 2C closure tag.

---

## Phase 2D — ERP sync

**ADR:** [004-erp-sync.md](../adr/004-erp-sync.md)

### 2D-0 — Slice approval + integration contract

| | |
|--|--|
| **Goal** | Approve 2D slices; document customer ERP endpoint, auth, entity mapping |
| **AC** | Integration spec in `docs/fft/integrations/<customer>.md` (or generic stub) |
| **Depends on** | 2C-4 |

### 2D-1 — Sync framework

| | |
|--|--|
| **Goal** | Mapping + job + attempt + error tables; `ErpAdapter` interface; noop adapter; async runner |
| **AC** | No sync in HTTP request path; idempotency on push; `FFT_ERP_SYNC_ENABLED` default false |
| **Depends on** | 2D-0 |

### 2D-2 — Ops UI + DLQ

| | |
|--|--|
| **Goal** | Admin view of sync jobs, errors, manual retry |
| **AC** | `export.finance` or `sync.retry` for retry; full audit |
| **Depends on** | 2D-1 |
| **Status** | **Done** — DLQ detail panel, audited manual retry, events admin nav link |

### 2D-3 — Customer ERP adapter

| | |
|--|--|
| **Goal** | Vendor-specific pack under `modules/fft/domain/erp/<vendor>/` |
| **AC** | Push order + deposit_summary + fulfillment_summary; handle ERP duplicate as success |
| **Depends on** | 2D-2, integration contract |
| **Status** | **Reference pack** — `http-rest` adapter + [integrations/http-rest-vendor-pack.md](../integrations/http-rest-vendor-pack.md); customer fork required for prod |

**2D closure:** Tag `fft-phase-2d` after 2D-2 minimum (2D-3 per customer project).

---

## Verification (per phase)

| Phase | Unit | Interaction | E2E |
|-------|------|-------------|-----|
| 2B | `modules/fft/domain/deposit*`, `pickup*` | Admin forms | Extend `e2e/trade-fft.spec.ts` |
| 2C | import validators, notification idempotency | Import confirm dialog | Dry-run + disabled notification smoke |
| 2D | adapter + job state machine | Retry UI | Sync disabled default; enabled integration smoke |

---

## Out of scope (all phases)

- Payment processor / Stripe / bank capture
- Zalo, WhatsApp, SMS, Teams notifications
- Declaration-portal email changes
- RBAC model rewrite (ADR-001 frozen)
- Repo `lib/` / `components/` normalization
- New permissions beyond catalog additions tied to 2B–2D features

---

## Approval record

| Slice group | Status | Approved by | Date |
|-------------|--------|-------------|------|
| 2B (2B-0 … 2B-4) | **Approved** | Program reopen | 2026-07-10 |
| 2C (2C-0 … 2C-4) | **Approved** | Program reopen | 2026-07-10 |
| 2D (2D-0 … 2D-3) | **Approved** | Program reopen | 2026-07-10 |

To approve: flip row status to **Approved**, add name + date, update [../RUNTIME.md](../RUNTIME.md) and [../ops/gate-register.md](../ops/gate-register.md).
