# Feed Farm Trade — Phase 3 development spec — Ops flags

| Field | Value |
|-------|-------|
| **Doc type** | Technical spec (phase-scoped) — write-first, evaluation baseline |
| **Phase** | P3 — Ops flags, not MVP, per [001R](adr/001R-feed-farm-trade-roadmap.md) |
| **Build authorization** | **Flag enablement closed** — flags default `false`; enabling in production requires the Feed Farm Trade [gate-register](../../docs/fft/ops/gate-register.md) checklist. FE placeholder work described here is scoped, not a promotion authorization. |
| **Decision locks** | [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) |
| **Architecture** | [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) |
| **Roadmap / gaps** | [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md) |
| **Engine ADRs (source of truth for this phase)** | [002 finance/pickup](../../docs/fft/adr/002-finance-deposit-pickup-ops.md) · [003 imports/notifications](../../docs/fft/adr/003-imports-notifications.md) · [004 ERP sync](../../docs/fft/adr/004-erp-sync.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../.cursor/skills/feed-farm-trade/SKILL.md) |
| **Precondition** | [12-feed-farm-trade-phase1-core-mvp.md](12-feed-farm-trade-phase1-core-mvp.md) AC all green |

> **How to use this document:** Written independent of current implementation status, so it can serve as a fixed evaluation baseline. Fill in the **Evaluation checklist** at the end against the live codebase — do not edit the requirement rows to match what exists; record findings only in the **Result** column. Ownership note: the engine-side rules (tables, flags, job semantics) belong to the Feed Farm Trade ops lane (`docs/fft/`) — this document consolidates them only as they surface in the Feed Farm Trade FE for evaluation purposes. Do not edit `docs/fft/**` from this document.

---

## Purpose

Give entitled ops staff deposit tracking, pickup/fulfillment workflow, structured Excel imports, outbound notifications, and ERP sync — **all behind flags that default off**, so P1 core cycle keeps working whether or not any P3 capability is enabled.

## Scope

**In:** FE surfaces for the five ops capabilities below, each gated by its own env flag and permission code, each degrading to a safe read-only/hidden state when its flag is off.

**Out:** flipping any flag to `true` in production without a gate-register promotion checklist; inventing new permission codes beyond what the engine ADRs define; a specific ERP vendor adapter (2D-3) without a customer integration contract; folding P3 work into the same PR as P1/P2 changes.

## Preconditions

- P1 core cycle AC all green (see [12](12-feed-farm-trade-phase1-core-mvp.md)) — P3 must never be a substitute for a broken P1.
- The relevant engine ADR (002/003/004) is **Accepted** and its slice group is **Approved** in `docs/fft/spec/phase-2bcd-slices.md` before any schema or write-path code — this document does not itself approve a slice.

---

## Capability 1 — Deposits (engine ADR-002 §2B.1–2B.2)

| Field | Value |
|-------|-------|
| Env flag | `FFT_DEPOSIT_ENABLED` (default `false` in prod and local) |
| Permission codes | `deposit.view` (read/export), `deposit.manage` (write) |
| Tables (engine-owned) | `fft_deposit`, `fft_deposit_receipt`, `fft_deposit_adjustment`, `fft_finance_audit` |
| FE surface | `/fft/admin/events/[eventId]/deposits` |
| Rule | `deposit_status` on the order is a **projection**, never written directly by the FE; waive/refund/forfeit require a reason and produce an audit row |
| Behavior when flag off | Deposit UI is hidden or read-only; order `deposit_status` stays on the Phase-1 lightweight enum |

**Requirements:**

| ID | Requirement |
|----|-------------|
| F-OPS-DEP-01 | Deposit list/detail view for an event, gated by `deposit.view` |
| F-OPS-DEP-02 | Record receipt, waive, refund, or forfeit, gated by `deposit.manage`, each requiring a reason |
| F-OPS-DEP-03 | When `FFT_DEPOSIT_ENABLED=false`, the deposit UI does not accept writes |

## Capability 2 — Pickup / fulfillment ops (engine ADR-002 §2B.3)

| Field | Value |
|-------|-------|
| Env flag | `FFT_PICKUP_OPS_ENABLED` (default `false`) |
| Permission codes | `pickup.view`, `pickup.manage` |
| Tables (engine-owned) | `fft_pickup_window`, `fft_pickup_assignment`, `fft_fulfillment_record`, `fft_pickup_exception` |
| FE surface | `/fft/admin/events/[eventId]/pickup` |
| Rule | `fulfilled_quantity` on the order is a rollup derived from fulfillment records, not edited directly once pickup ops is enabled; post-`picked_up` changes require `pickup.manage` + reason + audit |
| Behavior when flag off | Pickup UI hidden or read-only; Phase-1 single-quantity field remains the manual path |

**Requirements:**

| ID | Requirement |
|----|-------------|
| F-OPS-PICK-01 | Pickup window scheduling and assignment view, gated by `pickup.view` |
| F-OPS-PICK-02 | Fulfillment confirmation, partial pickup, and no-show/exception handling, gated by `pickup.manage` with reason + audit |
| F-OPS-PICK-03 | When `FFT_PICKUP_OPS_ENABLED=false`, only the Phase-1 quantity field is editable |

## Capability 3 — Excel imports (engine ADR-003 §3.1)

| Field | Value |
|-------|-------|
| Env flag | None dedicated — import dry-run and confirm/write are **always allowed**; only the notification side-effect is gated (see Capability 4) |
| Permission codes by import type | Customer priority → `priority.manage`; product/supply → `supply.manage`; bulk orders → `order.create` + scope; deposit records → `deposit.manage` (requires deposits enabled); pickup confirmation → `pickup.manage` (requires pickup ops enabled) |
| Tables (engine-owned) | `fft_import_batch`, `fft_import_row` |
| FE surface | `/fft/admin/events/[eventId]/imports` |
| Mandatory flow | upload → parse → dry-run validate → error report → admin confirm → write → audit batch — no step may be skipped |

**Requirements:**

| ID | Requirement |
|----|-------------|
| F-OPS-IMP-01 | Downloadable `.xlsx` template per import type |
| F-OPS-IMP-02 | Dry-run validation with a row-level error report before any write; failed rows are never silently dropped |
| F-OPS-IMP-03 | Explicit admin confirm step gates the commit; commit is server-side parsed, never trusting client-parsed data |
| F-OPS-IMP-04 | Import UI respects the underlying import-type permission (e.g., cannot commit a deposit-record import without `deposit.manage` **and** `FFT_DEPOSIT_ENABLED=true`) |

## Capability 4 — Notifications (engine ADR-003 §3.2)

| Field | Value |
|-------|-------|
| Env flag | `FFT_NOTIFICATIONS_ENABLED` (default `false`) |
| Sender | Product-controlled address, **never** `auth@mail.myneon.app` (Neon Auth is portal-identity-only) |
| Tables (engine-owned) | `fft_notification_template`, `fft_notification_event`, `fft_notification_delivery` |
| Triggers | `event.opened/closing_soon/closed`, `order.submitted`, `allocation.completed/partial`, `order.rejected`, `transfer.requested/approved/rejected`, `deposit.pending/confirmed`, `pickup.scheduled/completed` |
| FE surface | Per-event or admin-level enable/disable toggle per `notification_event`; no dedicated route beyond admin settings |
| Rule | Idempotency key per (event_key, entity_id, recipient, version); a failed send must never roll back the underlying trade transaction |

**Requirements:**

| ID | Requirement |
|----|-------------|
| F-OPS-NOTIF-01 | Notification triggers can be enabled/disabled per event key without a deploy |
| F-OPS-NOTIF-02 | When `FFT_NOTIFICATIONS_ENABLED=false`, triggers may fire internally but no outbound email is sent |
| F-OPS-NOTIF-03 | Delivery failures are visible (status/error) without affecting the originating order/allocation/deposit transaction |

## Capability 5 — ERP sync (engine ADR-004)

| Field | Value |
|-------|-------|
| Env flag | `FFT_ERP_SYNC_ENABLED` (default `false`) |
| Related flags | `FFT_ERP_VENDOR`, `FFT_ERP_BASE_URL` (unset by default) |
| Permission code | Manual retry requires `export.finance` or a dedicated `sync.retry` code (to be added to the catalog only within an approved 2D slice — do not add speculatively) |
| Tables (engine-owned) | `fft_external_mapping`, `fft_sync_job`, `fft_sync_attempt`, `fft_sync_error` |
| FE surface | `/fft/admin/erp-sync` |
| Rule | No synchronous ERP call in the order/allocation request path; every outbound push carries an idempotency key; sync errors are visible and manually retryable; **2D-1** ships framework + no-op adapter + manual mapping UI + job runner only — a **customer-specific vendor adapter (2D-3) is forbidden without an integration contract**, per both `docs/fft/RUNTIME.md` and the portal's Feed Farm Trade agent rule |

**Requirements:**

| ID | Requirement |
|----|-------------|
| F-OPS-ERP-01 | Manual mapping UI for entity types (`customer`, `product`, `supply_line`, `order`, `order_line`, `deposit_summary`, `fulfillment_summary`) |
| F-OPS-ERP-02 | Sync job / attempt / error visibility with manual retry, gated by permission |
| F-OPS-ERP-03 | When `FFT_ERP_SYNC_ENABLED=false`, no job runner executes and no outbound call is made |
| F-OPS-ERP-04 | No vendor-specific adapter code exists under `modules/fft/domain/erp/<vendor>/` unless a customer integration contract has been explicitly approved |

---

## FE placeholder inventory (current routes, for orientation only)

| Route | Capability | Note |
|-------|------------|------|
| `/fft/admin/events/[eventId]/deposits` | Deposits | Placeholder / flag-gated |
| `/fft/admin/events/[eventId]/pickup` | Pickup ops | Placeholder / flag-gated |
| `/fft/admin/events/[eventId]/imports` | Imports | Placeholder / flag-gated |
| `/fft/admin/erp-sync` | ERP sync | Placeholder / flag-gated |

This inventory is orientation only — it is not a completion claim. Use the Evaluation checklist below to assess actual wiring.

## Overall acceptance criteria (from 001R)

| AC | Pass when |
|----|-----------|
| AC-OPS-01 | With all P3 flags off, ops writes are blocked and P1 core cycle still works end-to-end |
| AC-OPS-02 | With a flag on **and** gate-register promotion recorded, the corresponding `F-OPS-*` surface honors its permission code |

## Verification plan

| Check | Method |
|-------|--------|
| Flag defaults | Confirm `env.config` / Vercel production show all five flags at their documented default (`false`) unless a gate-register promotion is on record |
| Flag-off behavior | Manual QA: with each flag off, confirm the corresponding admin route is hidden or read-only, and P1 core cycle (setup/order/allocate/complete) is unaffected |
| Permission enforcement | Confirm each write path checks its documented permission code, not a role name |
| No premature vendor adapter | `rg` for any file under `modules/fft/domain/erp/<vendor>/` other than `generic-noop.ts` / `types.ts` |
| Ops SSOT alignment | Cross-check flag names and defaults against `docs/fft/RUNTIME.md` § Env flags — do not let this FE doc drift from that table |

## Evaluation checklist

| AC / Req ID | Requirement | Expected evidence | Result |
|-------------|-------------|--------------------|--------|
| F-OPS-DEP-01..03 | Deposits FE + flag gate | Deposits page respects `FFT_DEPOSIT_ENABLED` + `deposit.*` codes | **Partial** — FE wired flag-on (`TradeDepositPanel`); flag-off = `TradeOpsPlaceholder`; actions gated; prod flag false (P3_TODO_EXECUTE 2026-07-11) |
| F-OPS-PICK-01..03 | Pickup ops FE + flag gate | Pickup page respects `FFT_PICKUP_OPS_ENABLED` + `pickup.*` codes | **Partial** — FE wired flag-on; flag-off placeholder; actions gated |
| F-OPS-IMP-01..04 | Import pipeline | Dry-run → error report → confirm → write → audit, all present | **Partial** — FE `TradeImportPanel` mounted; deposit/pickup types flag-gated in UI+action |
| F-OPS-NOTIF-01..03 | Notification triggers | `FFT_NOTIFICATIONS_ENABLED` gate; failure isolation from trade txn | **Partial** — send path live when flag on + Resend keys (defer closed 2026-07-11); no FE toggle |
| F-OPS-ERP-01..04 | ERP sync framework | `FFT_ERP_SYNC_ENABLED` gate; no customer vendor without contract | **Partial** — FE wired flag-on; `retry` + **`processErpSyncJobsAction`** action-gated (2026-07-11); 2D-3 forbidden |
| AC-OPS-01 | Flags off → P1 unaffected | P1 evaluation checklist still passes with all P3 flags off | **PASS** — defaults `false`; deposit/pickup + ERP retry/process writes blocked; FE placeholders when flag off; P1 independent |
| AC-OPS-02 | Flag on → permission honored | Gate-register promotion record exists before any flag is `true` in prod | **BLOCKED** — prod promotion **not** started |

**Gate-register review (REVIEW_P3 2026-07-11 — no flag changes):**

| Step | Status |
|------|--------|
| 0 `npm run audit:fft-promotion` | **PASS** (`ok:true`, Ready for ordered flag promotion) |
| 1–5 prod enable | **Not run** (explicit: evaluation only) |
| Resend defer | **Closed 2026-07-11** — keys on Vercel; schedule closing-soon after one `sent` smoke |

## Risks and open questions

- **Doc-drift risk (resolved 2026-07-12):** `docs/fft/RUNTIME.md` code map now points at `modules/fft/auth/fft-session.ts`, `app/fft/layout.tsx`, and AdminCN — not legacy `trade-session` / `FftShell` paths.
- **Slice-approval risk:** none of the five capabilities may get schema or write-path code until their slice group is Approved in `docs/fft/spec/phase-2bcd-slices.md` — a P3 evaluation finding "code exists" without a recorded approval is itself a finding to report, not a pass.
- **2D-3 boundary:** any customer-specific ERP adapter code found during evaluation without a documented integration contract should be flagged as a rule violation, not credited as progress.

## References

- [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) · [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) · [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md)
- [docs/fft/RUNTIME.md](../../docs/fft/RUNTIME.md) — flags, env defaults, code map (engine SSOT)
- [docs/fft/ops/gate-register.md](../../docs/fft/ops/gate-register.md) — promotion checklist
- [docs/fft/adr/002-finance-deposit-pickup-ops.md](../../docs/fft/adr/002-finance-deposit-pickup-ops.md)
- [docs/fft/adr/003-imports-notifications.md](../../docs/fft/adr/003-imports-notifications.md)
- [docs/fft/adr/004-erp-sync.md](../../docs/fft/adr/004-erp-sync.md)
- [12-feed-farm-trade-phase1-core-mvp.md](12-feed-farm-trade-phase1-core-mvp.md) — precondition phase
