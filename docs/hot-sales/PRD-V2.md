# PRD-V2 — Hot Sales Event Engine (Phase 1 build contract)

**Status:** **Accepted** — Phase 1 closed  
**Baseline commit:** `1bc1294` (`feat(trade): close Hot Sales Phase 1 event engine`)  
**Baseline tag:** `hot-sales-phase-1`  
**Accepted:** 2026-07-09  

**Vision archive:** [PRD.md](./PRD.md)  
**First variant seed:** [hot-sales.md](./hot-sales.md) (GP2 piglet — template data only)  
**Phase 2:** Authoritative planning — [PHASE-2-FEEDBACK.md](./PHASE-2-FEEDBACK.md). Build contract — [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) (**Accepted**). RBAC — [ADR-001-phase-2-rbac.md](./ADR-001-phase-2-rbac.md) (**Accepted**). Slice plan — [PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md) (**Approved**). Candidate list — [PHASE-2-SCOPING.md](./PHASE-2-SCOPING.md) (superseded for planning). Implement 2A only per approved slices; not 2B–2D.

## Objective

Reusable **Hot Sales / Spot-Selling Event Engine** under `/trade` in the same Next.js + Neon + Vercel app. Client Admin creates time-boxed events without engineering. **Not** a one-off piglet page.

## Phase 1 scope

| In scope | Out of scope |
|----------|--------------|
| Admin + Sales allowlist | 7-role RBAC |
| Event wizard, products, priority CSV, custom columns | Full finance/deposit/pickup modules |
| Sales order + server timestamp + deadline block | End-customer portal |
| Priority → FCFS allocation + allocation_run | Live ERP sync |
| Deposit/transfer **lite** (status only) | Notifications |
| Audit + CSV export | Formula/file custom fields |
| Trade i18n `vi` + `en` | Full Excel import suite |

Deposit UI is **status tracking only, not finance settlement**. ERP-ready data shape; **no live ERP sync** in Phase 1.

## Guardrails

### Engine, not piglet case

Never hardcode July/August/September, 8kg/10kg/15kg, GP2, or VND100k in schema. Piglet = **cloneable template data**.

### Allocation tie-breaker

```text
Sort by:
1. priority_rank ascending
2. registered_at ascending
3. order_id ascending
```

Manual adjustment never exceeds `final_confirmed_quantity`. Every manual adjustment requires reason + audit. Allocation runs in a DB transaction.

### Allocation run record

Table `hot_sales_allocation_run`: tracks each calculation (`auto` / `manual` / `rerun`), `run_by`, `run_at`, `reason`, `result_summary`. Orders store `allocation_run_id`.

### Open-event field locks

| Field | Draft | Open | Closed / Allocating |
|-------|------:|-----:|--------------------:|
| Event name / description | Editable | Editable | Editable |
| Opening time | Editable | Locked | Locked |
| Closing time | Editable | Admin override + audit | Locked after close |
| Product rows | Editable | Limited | Locked |
| Final confirmed quantity | Editable | Editable + audit | Editable + audit |
| Custom **required** fields | Editable | Must not change | Locked |
| Support amount | Editable | Locked or override + audit | Locked |
| Allocation method | Editable | Locked | Locked |

### Support amount

```text
estimated_support = confirmed_quantity × support_amount_per_unit
final_support = fulfilled_quantity × support_amount_per_unit
Order cannot complete without fulfilled_quantity
```

### Event clone

Admin can clone event (or seed template): products, custom fields, rules, support config, priority — then edit window/supply before open.

### Server-side controls

Deadline and supply caps enforced server-side and transaction-safe. Browser countdown is UX only.

## Roles (Phase 1)

- **Admin** — `isAdminSession` (Client Admin)
- **Sales** — allowlisted Neon users; own orders only

## Data model

See `db/migrations/013_hot_sales.sql`.

## Routes

**Phase 1 (shipped):**

```text
/trade/[locale]/admin/events          — list + create-on-list
/trade/[locale]/admin/events/[id]/setup
/trade/[locale]/admin/events/[id]/allocation
/trade/[locale]/events
/trade/[locale]/events/[id]/order
/trade/[locale]/my-orders
```

**Phase 2A (not Phase 1):**

```text
/trade/[locale]/admin/events/new      — dedicated create wizard (slice 2A-8)
```

Default locale: `vi`.

## Acceptance checklist

### Admin

- [x] Create / clone event; open/close; timezone `Asia/Ho_Chi_Minh`
- [x] Products; tentative + final supply; support; rules; custom fields
- [x] Priority list + CSV import
- [x] Run allocation; manual adjust + reason; export; audit

### Sales

- [x] Submit only while open; core + custom fields; own orders only
- [x] Request transfer if allowed

### System

- [x] Server timestamp; deadline block; dynamic field validation
- [x] Allocation sort; no oversell; allocation_run; estimated vs final support
- [x] `vi`/`en`; declaration domain untouched

### Notes

- Dedicated `/admin/events/new` is **Phase 2A** (not Phase 1). Phase 1 create lives on `/admin/events`.
- Trade UI copy is mostly inline `vi`/`en` ternaries; `messages/trade/*` powers the shell nav.
- Full Excel import suite remains Phase 2C.

### Post-closure verification (not a Phase 1 blocker)

Journey Playwright (`@journey` in `e2e/trade-hot-sales.spec.ts`) needs operator credentials (`SHARED_ADMIN_*` / `E2E_OPERATOR_*`). Run when creds are available:

```bash
npx playwright test --project=journey --grep "Trade Hot Sales"
```

Smoke auth redirect is the Phase 1 gate; journey is optional post-closure verification.

## Next safe actions

1. Baseline is tagged `hot-sales-phase-1` at `1bc1294` — use for bisect / rollback reference.
2. Run journey e2e only when operator credentials are available (command above).
3. Keep unrelated layout / repo-migration WIP on separate commits from Hot Sales history.

## Phase 2 (later)

| Doc | Role |
|-----|------|
| [PHASE-2-FEEDBACK.md](./PHASE-2-FEEDBACK.md) | Authoritative planning direction |
| [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) | Build contract (**Accepted**) |
| [ADR-001-phase-2-rbac.md](./ADR-001-phase-2-rbac.md) | RBAC decision (**Accepted**) |
| [PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md) | Phase 2A slice plan (**Approved** / closed) |
| [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) | Operational packaging (flag dark → verify → enable) |
| [PHASE-2A-OPS-ROLLOUT.md](./PHASE-2A-OPS-ROLLOUT.md) | Ops rollout checklist (tracker; no 2A reopen) |
| [PHASE-2-SCOPING.md](./PHASE-2-SCOPING.md) | Historical candidate list (superseded for planning) |

**Gate before Phase 2B+:** separate ADRs/slices. Phase 2A may proceed per [PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md).

**Adopted packaging:** 2A RBAC + `/admin/events/new` → 2B Finance + Pickup/Ops → 2C Excel + notifications → 2D ERP sync.
