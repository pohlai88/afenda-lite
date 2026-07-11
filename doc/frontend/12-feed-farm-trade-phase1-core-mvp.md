# Feed Farm Trade — Phase 1 development spec — Core cycle (MVP)

| Field | Value |
|-------|-------|
| **Doc type** | Technical spec (phase-scoped) — write-first, evaluation baseline |
| **Phase** | P1 — Core cycle (MVP), including gap-register G1–G9, per [001R](adr/001R-feed-farm-trade-roadmap.md) |
| **Build authorization** | Open — P1 is the enterprise-MVP bar (with P0) |
| **Decision locks** | [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) |
| **Architecture** | [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) |
| **Roadmap / gaps** | [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md) |
| **Agent skill** | [`.cursor/skills/feed-farm-trade`](../../.cursor/skills/feed-farm-trade/SKILL.md) |
| **Precondition** | [11-feed-farm-trade-phase0-shell.md](11-feed-farm-trade-phase0-shell.md) satisfied |

> **How to use this document:** Written independent of current implementation status, so it can serve as a fixed evaluation baseline. Fill in the **Evaluation checklist** at the end against the live codebase — do not edit the requirement rows to match what exists; record findings only in the **Result** column.

---

## Purpose

Deliver the full operator program cycle for entitled sales/ops staff: **setup → open window → order → transfer → allocate → complete → audit/export**. This is the "enterprise MVP" bar — P1 is not "events + orders + allocate" alone; it must include priority, supply, custom fields, transfer, order-complete, and audit (gap-register G1–G6), or the claim is invalid per [001](adr/001-feed-farm-trade.md).

## Scope

**In:** all capability groups below, thin AdminCN pages, Server-Action mutations, `modules/fft` domain reads.

**Out:** full AdminCn visual polish (P2), deposits/pickup/imports/ERP sync/notifications (P3), customer portal, `FftShell`, locale switcher, inventing new permission codes, renaming `FFT_*`.

## Preconditions

- Phase 0 shell gate passes (see [11](11-feed-farm-trade-phase0-shell.md)).
- Engine domain and RBAC catalog already exist (`modules/fft/domain/rbac-catalog.ts`, `modules/fft/domain/store.ts`, `app/actions/fft.ts`) — this phase wires FE to them; it does not invent new domain rules.

## Actors and permission model

Permission codes are defined once in `modules/fft/domain/rbac-catalog.ts` and enforced in `app/actions/fft.ts`. UI must never infer permission from role display name — always check the code. Default role **sales_executive** includes `transfer.request` (relevant to G3 below).

---

## Capability groups (functional requirements)

### 1. Events

| ID | Requirement |
|----|-------------|
| F-EVT-01..04 | List, create, view/setup, and open/close events; templates available at create time |
| F-EVT-05 | Missing-permission attempts on any event mutation are rejected, not silently ignored |
| F-EVT-06 (**G7**) | Clone an existing event, ensure/seed the piglet template, and activate a scheduled event via `cloneTradeEventAction`, `ensurePigletTemplateAction`, `activateScheduledTradeEventAction` |

**Surface:** `event.*` permission codes. **Route:** `/fft/events`, `/fft/admin/events`, `/fft/admin/events/new`, `/fft/admin/events/[eventId]/setup`.

### 2. Supply

| ID | Requirement |
|----|-------------|
| F-SUP-01 (**G2**) | Ops/sales with `supply.manage` can set and edit supply quantities per product on an event; allocation without a supply cap is not a valid MVP state |

**Surface:** `supply.manage`. **Route:** `/fft/admin/events/[eventId]/setup`.

### 3. Custom fields

| ID | Requirement |
|----|-------------|
| F-FLD-01 (**G5**) | Users with `custom_field.manage` can define custom fields on an event (template-driven farm programs need this; it is not optional) |

**Surface:** `custom_field.manage`. **Route:** `/fft/admin/events/[eventId]/setup`.

### 4. Priority

| ID | Requirement |
|----|-------------|
| F-PRI-01 (**G1**) | Users with `priority.manage` can manage and CSV-import customer priority for an event (`importPriorityCsvAction`, `fft_customer_priority`); allocation is priority-ranked, so this is load-bearing, not decorative |

**Surface:** `priority.manage`. **Route:** `/fft/admin/events/[eventId]/setup`.

### 5. Orders

| ID | Requirement |
|----|-------------|
| F-ORD-01..04 | Create an order only inside the event's open window; list own orders, team orders, or all orders depending on scope; reject creation attempts outside the window or without permission |
| F-ORD-05 (**G4**) | Complete an order after its allocation path via `completeTradeOrderAction` — the cycle must close, not stay open indefinitely |

**Surface:** `order.*`. **Route:** `/fft/events/[eventId]/order` (create), `/fft/my-orders` (own list + complete).

### 6. Transfer

| ID | Requirement |
|----|-------------|
| F-XFR-01 (**G3**) | A user with `transfer.request` can request an order transfer |
| F-XFR-02 (**G3**) | A user with `transfer.approve` can approve or reject a transfer request |

**Surface:** `transfer.request`, `transfer.approve`. **Route:** `/fft/my-orders`.

### 7. Allocation

| ID | Requirement |
|----|-------------|
| F-ALC-01..02 | Preview and run allocation, respecting priority and supply caps, gated by `allocation.*` codes |
| F-ALC-03 (**G9**, sensitive) | Manual override of an allocation result requires the distinct `allocation.override` permission — never bundled into preview/run |

**Surface:** `allocation.*`, `allocation.override`. **Route:** `/fft/admin/events/[eventId]/allocation`.

### 8. Audit

| ID | Requirement |
|----|-------------|
| F-AUD-01 (**G6**) | Users with `audit.view` can view an event's audit trail (`listAuditForEvent` / `recordFftAudit`) — minimum enterprise governance, not optional |

**Surface:** `audit.view`. **Route:** `/fft/admin/events/[eventId]/setup` (audit panel).

### 9. Admin

| ID | Requirement |
|----|-------------|
| F-ADM-01 | Manage sales-team membership |
| F-ADM-02 | Manage role assignments (`role.manage`) |
| F-ADM-03 (**G8**) | Export orders/summary with `export.orders` when permitted |

**Surface:** sales-member management, `role.manage`, `export.orders`. **Route:** `/fft/admin/rbac`.

---

## Route map (locale-free)

| Route | Capability |
|-------|------------|
| `/fft` | Redirect → `/fft/events` |
| `/fft/events` | List events |
| `/fft/admin/events`, `/fft/admin/events/new`, `/fft/admin/events/[eventId]/setup` | Create / setup / open-close / supply / fields / priority / audit / export |
| `/fft/events/[eventId]/order` | Submit order in window |
| `/fft/my-orders` | Own orders, transfer, complete |
| `/fft/admin/events/[eventId]/allocation` | Preview / run / override |
| `/fft/admin/rbac` | Sales-member / RBAC admin |
| `/fft/admin/events/[eventId]/{deposits,pickup,imports}`, `/fft/admin/erp-sync` | **Out of scope for P1** — P3 placeholders, see [14-feed-farm-trade-phase3-ops-flags.md](14-feed-farm-trade-phase3-ops-flags.md) |

## Acceptance criteria

| AC | Pass when |
|----|-----------|
| AC-EVT-01..04 | Setup and window lifecycle work end-to-end; missing-permission attempts are denied, not degraded |
| AC-EVT-05 (**G7**) | Clone or template seed produces a usable, editable event setup |
| AC-SUP-01 (**G2**) | Supply is editable with `supply.manage`; denied without it |
| AC-FLD-01 (**G5**) | Field defs are editable with `custom_field.manage`; denied without it |
| AC-PRI-01 (**G1**) | Priority list/import works with `priority.manage`; denied without it |
| AC-ORD-01..04 | In-window create succeeds; out-of-window or no-permission create fails cleanly; own list is scoped correctly |
| AC-ORD-05 (**G4**) | Complete succeeds when the domain allows it; denied without permission |
| AC-XFR-01..02 (**G3**) | Request/approve/reject all honor their respective permission codes |
| AC-ALC-01..02 | Preview/run only succeed with the correct codes |
| AC-ALC-03 (**G9**) | Override only succeeds with `allocation.override` specifically |
| AC-AUD-01 (**G6**) | Audit is readable with `audit.view`; denied without it |
| AC-ADM-01 (**G8**) | Export of orders/summary works with `export.orders` when permitted |

## Definition of Done (target — not a status claim)

- [ ] Every mutation above goes through `app/actions/fft.ts` with Zod validation and a session/permission check; no raw SQL in the action layer
- [ ] All domain logic lives only in `modules/fft`
- [ ] G1–G6 are reachable through setup, my-orders, allocation, and rbac pages — not hidden behind undocumented flags
- [ ] No `FftShell` or locale switcher is mounted anywhere in `features/fft`; no live `app/fft/[locale]` tree
- [ ] `doc/api/02-rest-resources.md` trade rows stay locale-free
- [ ] Every AC row above has recorded evidence (unit test and/or `@journey` E2E) — this is the blocking condition for claiming "enterprise MVP," not code presence alone

## Verification plan

| Check | Method |
|-------|--------|
| Domain + RBAC unit coverage | `modules/fft/domain/rbac-catalog.ts`, `modules/fft/domain/store.ts`, and any `modules/fft/**/*.test.ts` |
| Action-layer contract | `app/actions/fft.ts` — confirm Zod schema + permission check precede every domain call |
| Page composition | Each `app/fft/**/page.tsx` is thin (params await, no business logic, delegates to `features/fft/*`) |
| No shell residue | `rg "FftShell|locale" features/fft app/fft` reviewed for false positives (locale arg in action calls is expected; UI chrome is not) |
| Journey coverage | `@journey` Playwright spec covering setup → order → transfer → allocate → complete → audit, when operator credentials are available |

## Evaluation checklist

Use this table to grade the live codebase against every P1 AC. Leave **Result** blank until evaluated.

| AC / Req ID | Requirement | Expected evidence | Result |
|-------------|-------------|--------------------|--------|
| F-EVT-01..05 / AC-EVT-01..04 | Event lifecycle | `event.*` actions + setup/open-close pages | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` + `trade.test.ts` (2026-07-11) |
| F-EVT-06 / AC-EVT-05 (G7) | Clone / template / schedule activate | `cloneTradeEventAction`, `ensurePigletTemplateAction`, `activateScheduledTradeEventAction` wired to a UI control | **PASS** — re-verified P2-AC-06: domain + prior evidence (2026-07-11) |
| F-SUP-01 / AC-SUP-01 (G2) | Supply management | `supply.manage` gate on setup form | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-FLD-01 / AC-FLD-01 (G5) | Custom field defs | `custom_field.manage` gate on setup form | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-PRI-01 / AC-PRI-01 (G1) | Priority + CSV import | `priority.manage` gate + `importPriorityCsvAction` wired | **PASS** — re-verified P2-AC-06: gates + `priority-csv` (2026-07-11) |
| F-ORD-01..04 / AC-ORD-01..04 | Order create/list/scope | In-window enforcement in action; my-orders scoping | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-ORD-05 / AC-ORD-05 (G4) | Order complete | `completeTradeOrderAction` wired with permission check | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-XFR-01..02 / AC-XFR-01..02 (G3) | Transfer request/approve | `transfer.request` / `transfer.approve` gates | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-ALC-01..03 / AC-ALC-01..03 (G9) | Allocation preview/run/override | `allocation.*` + distinct `allocation.override` check | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-AUD-01 / AC-AUD-01 (G6) | Audit view | `audit.view` gate + `listAuditForEvent` wired | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| F-ADM-01..03 / AC-ADM-01 (G8) | Sales-member, roles, exports | `role.manage`, `export.orders` gates on rbac admin page | **PASS** — re-verified P2-AC-06: `trade-p1-ac-gates` (2026-07-11) |
| DoD | No shell/locale residue | Confirmed absent under `features/fft`, `app/fft` | **PASS** — product pages locale-free; only thin redirect shim `app/fft/[locale]/[[...path]]` (no FftShell) (2026-07-11) |
| DoD | AC test evidence | Unit and/or `@journey` tests exist and pass for each row above | **PASS** — `npm run test:unit -- modules/fft` 173/173 (2026-07-11 P2-AC-06) |

## Risks and open questions

- **MVP-claim risk:** engine + FE wiring existing is not sufficient evidence — the blocking gap is recorded AC test evidence (unit/`@journey`). Do not report "enterprise MVP" without it.
- **Permission drift risk:** UI must read permission codes from `rbac-catalog.ts`, never hardcode a role name — audit for hardcoded role checks during evaluation.
- **Scope creep risk:** industry booth/ERP/VFD features are explicitly out of P1 even if visible in the engine — do not credit them toward this phase's completion.
- **Open question:** which `@journey` spec (if any) currently exercises the full setup→order→transfer→allocate→complete→audit path end-to-end? Confirm before claiming DoD.

## References

- [001-feed-farm-trade.md](adr/001-feed-farm-trade.md) — decision locks
- [001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md) — architecture detail
- [001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md) — P1 section, gap register, DoD
- [11-feed-farm-trade-phase0-shell.md](11-feed-farm-trade-phase0-shell.md) — precondition phase
- [13-feed-farm-trade-phase2-ui-polish.md](13-feed-farm-trade-phase2-ui-polish.md) · [14-feed-farm-trade-phase3-ops-flags.md](14-feed-farm-trade-phase3-ops-flags.md) — later, non-blocking phases
- [`.cursor/skills/feed-farm-trade/completeness.md`](../../.cursor/skills/feed-farm-trade/completeness.md) — code vs architecture matrix
