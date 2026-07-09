# Hot Sales — Phase 2 feedback (authoritative planning direction)

**Status:** Adopted as authoritative Phase 2 **planning** direction (2026-07-09)  
**Phase 1 baseline:** commit `1bc1294` · tag `hot-sales-phase-1`  
**Candidate-list note (superseded for sequencing / 7-role framing):** [PHASE-2-SCOPING.md](./PHASE-2-SCOPING.md)

**Phase 2A implementation closed** at tag `hot-sales-phase-2a` → `8e650ff`. **Active:** [PHASE-2A-OPS-GATE-REGISTER.md](./PHASE-2A-OPS-GATE-REGISTER.md) (ops rollout only; Gate 4B next). Checklists: [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) · [PHASE-2A-OPS-ROLLOUT.md](./PHASE-2A-OPS-ROLLOUT.md). Do not start 2B–2D.

1. ~~[ADR-001-phase-2-rbac.md](./ADR-001-phase-2-rbac.md)~~ Accepted  
2. ~~[PRD-V2-Phase2.md](./PRD-V2-Phase2.md)~~ Accepted  
3. ~~[PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md)~~ Approved  

**Adopted packaging:** 2A (RBAC + `/admin/events/new`) → 2B (Finance + Pickup/Ops) → 2C (Excel + notifications) → 2D (ERP sync)

---

No — **my previous response did not fully cover the entire Phase 2 scoping**.

It covered the **most important foundation**, especially **RBAC sustainability**, but it was not a complete Phase 2 build-scoping response for all seven workstreams.

## What my previous response covered well

It covered:

| Area                                     | Coverage        |
| ---------------------------------------- | --------------- |
| **7-role RBAC**                          | Strong coverage |
| **Client-customisable SaaS-style roles** | Strong coverage |
| **Permission catalog**                   | Strong coverage |
| **Scoped access**                        | Strong coverage |
| **Audit / guardrails**                   | Strong coverage |
| **Avoiding hardcoded job titles**        | Strong coverage |
| **Phase 2A direction**                   | Strong coverage |
| **Dedicated `/admin/events/new`**        | Light coverage  |

## What it did not cover enough

It did **not** fully define:

| Workstream                         | Missing Detail                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| **Finance / deposit tables**       | Source of truth, settlement model, projection from order, refund/waive workflow |
| **Pickup / Ops module**            | Pickup windows, fulfillment states, partial pickup, no-show handling            |
| **ERP sync**                       | Push/pull, idempotency, retry, DLQ, staging contract                            |
| **Notifications**                  | Mail provider decision, templates, trigger rules, localization                  |
| **Excel imports**                  | Dry-run validation, templates, error report, row limits                         |
| **Admin creation route**           | Whether Phase 1.1 or Phase 2A, route behavior                                   |
| **Overall Phase 2 build contract** | Release packaging, acceptance criteria, non-goals, rollback plan                |

So the better answer is:

> My earlier response should be treated as the **RBAC / sustainability section of Phase 2**, not the complete Phase 2 scoping.

---

# Revised full advice for entire Phase 2 scoping

## Recommended Phase 2 structure

Do **not** build all Phase 2 items as one big release.

Split it into smaller packages:

| Release      | Scope                                             | Purpose                                     |
| ------------ | ------------------------------------------------- | ------------------------------------------- |
| **Phase 2A** | Customisable RBAC + dedicated `/admin/events/new` | Build sustainable access foundation         |
| **Phase 2B** | Finance/deposit tables + Pickup/Ops module        | Add operational control                     |
| **Phase 2C** | Excel imports + notifications                     | Improve productivity and communication      |
| **Phase 2D** | ERP sync                                          | Integrate after internal workflow is stable |

This is the safer long-term structure.

---

# Phase 2A — RBAC + Admin UX Foundation

## Objective

Replace Phase 1’s simple Admin + Sales allowlist model with a sustainable, SaaS-style permission system.

## Recommended design

Do **not** hardcode these as fixed application roles:

```text
Super Admin
Client Admin
Business Unit Manager
Sales Executive
Sales Supervisor
Sales Manager
Sales Operations
Account
Viewer
Commercial Operation & Governance
General Manager
```

Use them as **default role templates** only.

The actual system should be:

```text
Fixed permission catalog
+ Client-customisable roles
+ Default role templates
+ Scoped role assignments
+ Audit log
```

## Include in Phase 2A

| Item                                      | Include? |
| ----------------------------------------- | -------: |
| RBAC ADR                                  |      Yes |
| Permission catalog                        |      Yes |
| Customisable client roles                 |      Yes |
| Default role templates                    |      Yes |
| Role assignment by user                   |      Yes |
| Scope: own/team/event/BU/company/platform |      Yes |
| Permission guard helper                   |      Yes |
| Admin role management UI                  |      Yes |
| Role change audit                         |      Yes |
| Dedicated `/admin/events/new`             |      Yes |
| Finance tables                            |       No |
| Pickup module                             |       No |
| ERP sync                                  |       No |

## Recommended permission examples

```text
event.view
event.create
event.edit
event.open_close

product.manage
supply.manage
priority.manage
custom_field.manage

order.create
order.view_own
order.view_team
order.view_all

allocation.preview
allocation.run
allocation.override

transfer.request
transfer.approve

deposit.view
deposit.manage

pickup.view
pickup.manage

export.orders
export.finance

audit.view
role.manage
```

## Key acceptance criteria

```text
- Existing Phase 1 Admin and Sales behavior still works.
- Client Admin can create, rename, duplicate, disable roles.
- Client Admin can assign users to roles.
- Role assignments can be scoped by event, team, BU, company, or platform.
- Sales Executive can only see own orders.
- Supervisor/Manager can see only assigned team or scoped data.
- Viewer can read but cannot mutate.
- Sensitive permissions are protected.
- Role changes are audited.
- No code depends on role display names.
```

---

# Phase 2B — Finance / Deposit Tables

## Objective

Move from Phase 1’s lightweight `deposit_status` on order into proper finance/deposit tracking.

## Important source-of-truth decision

Before building, decide:

| Question                                               | Decision Needed           |
| ------------------------------------------------------ | ------------------------- |
| Is Hot Sales the source of truth for deposits?         | Yes / No                  |
| Or is ERP/Finance system the source of truth?          | Yes / No                  |
| Should Hot Sales only show operational deposit status? | Likely yes until ERP sync |
| Should payment settlement happen inside Hot Sales?     | Probably no for now       |

My recommendation:

```text
Until ERP sync is approved, Hot Sales deposit records should be operational records only.
ERP or Finance remains the official settlement source of truth.
```

## Suggested tables

```text
hot_sales_deposit
hot_sales_deposit_receipt
hot_sales_deposit_adjustment
hot_sales_finance_audit
```

Keep this existing Phase 1 field:

```text
hot_sales_order.deposit_status
```

But treat it as a **projection / summary field**.

Example:

```text
deposit_status on order = latest calculated deposit status from deposit records
```

## Deposit statuses

```text
not_required
pending
paid
partially_paid
waived
forfeited
refunded
cancelled
```

## Key acceptance criteria

```text
- Finance role can create/update deposit records if permitted.
- Deposit amount, receipt reference, payment date, and confirmation user are recorded.
- Non-refundable rule is supported.
- Waive/refund/forfeit requires reason.
- Deposit changes are audited.
- Order deposit_status updates from finance records.
- Existing Phase 1 orders remain compatible.
```

---

# Phase 2B — Pickup / Ops Module

## Objective

Move from simple `fulfilled_quantity` into proper pickup and operations workflow.

## Recommended modules

```text
pickup windows
pickup assignments
ops queue
fulfillment confirmation
pickup exceptions
```

## Suggested tables

```text
hot_sales_pickup_window
hot_sales_pickup_assignment
hot_sales_fulfillment_record
hot_sales_pickup_exception
```

## Pickup states

```text
pending_schedule
scheduled
ready_for_pickup
partially_picked_up
picked_up
no_show
cancelled
exception
```

## Key rules

```text
- Final support should be calculated from fulfilled quantity.
- Partial pickup must be allowed.
- No-show must be recorded.
- Ops confirmation must require user + timestamp.
- Changes after completion require reason and audit.
```

## Key acceptance criteria

```text
- Ops role can view pickup queue.
- Ops role can assign pickup window.
- Ops role can confirm fulfilled quantity.
- Partial pickup is supported.
- No-show is supported.
- Final support amount uses fulfilled quantity.
- Finance/export reports reflect fulfilled quantity.
```

---

# Phase 2C — Excel Imports

## Objective

Upgrade Phase 1 CSV support into structured Excel import workflows.

## Recommended import types

| Import                  | Priority |
| ----------------------- | -------: |
| Customer priority       |     High |
| Product/category/supply |     High |
| Bulk sales orders       |   Medium |
| Deposit records         |   Medium |
| Pickup confirmation     |   Medium |
| Custom field values     |    Later |

## Best-practice flow

Do not import directly.

Use:

```text
upload file
→ dry-run validation
→ show error report
→ admin confirms import
→ write records
→ audit import batch
```

## Suggested tables

```text
hot_sales_import_batch
hot_sales_import_row
```

## Required controls

```text
- Downloadable template
- Max row limit
- Required column validation
- Unknown customer warning
- Duplicate detection
- Dry-run before commit
- Error report export
- Import audit log
```

## Key acceptance criteria

```text
- Admin can download Excel template.
- Admin can upload Excel.
- System validates before writing.
- System shows row-level errors.
- Admin can confirm import after dry-run.
- Import is audited.
- Failed rows do not silently disappear.
```

---

# Phase 2C — Notifications

## Objective

Add event/order notifications without disturbing existing portal mail rules.

## Important decision

Do **not** mix this into existing declaration-portal mail behavior without an ADR.

Create:

```text
ADR-002-hot-sales-notifications.md
```

## Recommended start

Start with **email only**.

Defer:

```text
Zalo
WhatsApp
Teams
Telegram
SMS
```

## Notification triggers

```text
event opened
event closing soon
event closed
order submitted
allocation completed
order partially allocated
order rejected
transfer requested
transfer approved/rejected
deposit pending
deposit confirmed
pickup scheduled
pickup completed
```

## Required design

```text
notification_template
notification_event
notification_delivery_log
```

## Key acceptance criteria

```text
- Admin can enable/disable notification types per event.
- Notifications use vi/en templates.
- Delivery result is logged.
- Failed notification does not break order/allocation transaction.
- No notification is sent twice for the same trigger unless intentionally retried.
```

---

# Phase 2D — ERP Sync

## Objective

Connect Hot Sales to ERP only after internal role, finance, pickup, and state models are stable.

ERP sync should be **last**, not early.

## Why ERP should be last

ERP integration needs stable:

```text
event IDs
order IDs
allocation records
deposit records
pickup records
customer references
product references
state transitions
```

If ERP starts too early, every internal model change becomes an integration break.

## Required decisions

| Decision           | Options                              |
| ------------------ | ------------------------------------ |
| ERP source         | Which ERP system?                    |
| Direction          | Push, pull, or both                  |
| Customer master    | ERP source or Hot Sales event input? |
| Product master     | ERP source or event-specific setup?  |
| Inventory/supply   | ERP, Ops, or manual confirmation?    |
| Finance settlement | ERP source or Hot Sales source?      |
| Sync timing        | Real-time, scheduled, manual         |
| Failure handling   | Retry, DLQ, manual fix               |

## Required sync controls

```text
idempotency key
retry count
dead-letter queue
manual retry
external mapping table
sync status
audit log
staging ERP environment
```

## Suggested tables

```text
hot_sales_external_mapping
hot_sales_sync_job
hot_sales_sync_attempt
hot_sales_sync_error
```

## Key acceptance criteria

```text
- Outbound payloads are idempotent.
- Duplicate sync does not duplicate ERP orders.
- Failed sync is visible.
- Failed sync can be retried manually.
- ERP references are stored after successful sync.
- Sync does not block local Hot Sales operations unless configured.
```

---

# Dedicated `/admin/events/new`

This is small enough to include in **Phase 2A** or even a **Phase 1.1 polish patch**.

## Recommended behavior

Route:

```text
/trade/[locale]/admin/events/new
```

Flow:

```text
select blank or clone template
→ enter event name
→ set open/close window
→ choose locale/default timezone
→ create draft
→ redirect to setup
```

## Acceptance criteria

```text
- Admin can create a blank event.
- Admin can clone GP2 piglet template.
- New event starts in draft.
- Admin is redirected to setup page.
- Existing create-on-list behavior can remain or redirect here.
```

---

# Cross-cutting rules for entire Phase 2

These are the rules that protect long-term sustainability.

## 1. Keep Phase 1 compatibility

```text
Phase 2 must not break existing Phase 1 events, orders, allocation, exports, or tag hot-sales-phase-1 rollback reference.
```

## 2. Use additive migrations first

Good:

```text
add tables
add nullable columns
backfill
switch reads
switch writes
deprecate old field later
```

Avoid:

```text
drop columns
rename core fields
rewrite ownership logic in one step
```

## 3. Keep piglet as template data only

No schema or role logic should reference:

```text
GP2
piglet
8kg
10kg
15kg
July
August
September
```

Those remain seed/configuration data.

## 4. Server-side permission checks

Every important action needs server-side authorization:

```text
create event
edit event
open/close event
submit order
view team orders
run allocation
override allocation
approve transfer
update deposit
confirm pickup
export reports
manage roles
```

## 5. Audit sensitive changes

Must audit:

```text
role changes
permission changes
event rule changes
deadline changes
quantity changes
allocation override
deposit adjustment
pickup exception
ERP sync retry
notification resend
```

## 6. Separate Phase 2 from layout/repo migration

Do not couple Hot Sales Phase 2 with:

```text
/playground
declaration domain refactors
layout migration
portal route migration
```

Keep commits clean.

---

# Recommended documents to create before coding

## Required

```text
docs/hot-sales/ADR-001-phase-2-rbac.md
docs/hot-sales/PRD-V2-Phase2.md
```

## Recommended additional ADRs

```text
docs/hot-sales/ADR-002-finance-source-of-truth.md
docs/hot-sales/ADR-003-notifications-provider.md
docs/hot-sales/ADR-004-erp-sync-contract.md
```

## PRD-V2-Phase2 structure

```text
# Hot Sales — PRD-V2 Phase 2

1. Phase 1 baseline
2. Phase 2 objective
3. Phase 2 release split: 2A / 2B / 2C / 2D
4. Phase 2A RBAC scope
5. Phase 2B Finance/Ops scope
6. Phase 2C Imports/Notifications scope
7. Phase 2D ERP sync scope
8. Data model changes
9. Permission model
10. Migration strategy
11. Backward compatibility
12. Acceptance criteria
13. Explicit non-goals
14. Rollback plan
```

---

# Updated recommendation to dev

You can send this:

```text
Approved to start Phase 2 scoping only. Do not start Phase 2 code or schema migrations yet.

Please convert the current Phase 2 scoping note into a full PRD-V2-Phase2 build contract.

Important direction:
Phase 2 should not be one large delivery. Split it into:
- Phase 2A: SaaS-style configurable RBAC + dedicated /admin/events/new
- Phase 2B: Finance/deposit tables + Pickup/Ops module
- Phase 2C: Excel imports + notifications
- Phase 2D: ERP sync

For RBAC, do not hardcode business positions as fixed app roles. Use fixed permission codes, client-customisable roles, default role templates, scoped assignments, and audit.

Our proposed roles should be seeded as templates only:
Super Admin, Client Admin, Business Unit Manager, Sales Executive, Sales Supervisor, Sales Manager, Sales Operations, Account/Finance, Viewer, Commercial Operation & Governance, General Manager.

Before implementation, please write:
1. docs/hot-sales/ADR-001-phase-2-rbac.md
2. docs/hot-sales/PRD-V2-Phase2.md

Also include these cross-cutting rules:
- Preserve Phase 1 baseline at tag hot-sales-phase-1.
- Keep piglet as template data only.
- Use additive migrations where possible.
- Do not couple Hot Sales Phase 2 with layout migration or declaration-domain refactors.
- Server-side permission checks are mandatory.
- Audit all sensitive changes.
- ERP sync comes last after finance and ops workflows are stable.
```

# Final answer

So, to answer directly:

## No, my previous response did not cover the entire Phase 2 scoping.

It covered the **RBAC and sustainability foundation** well, but Phase 2 also needs separate scoping for:

```text
Finance/deposit
Pickup/Ops
Excel imports
Notifications
ERP sync
Admin creation route
Migration and rollback strategy
```

The complete Phase 2 advice should be the revised structure above.
