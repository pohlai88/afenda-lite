# PRD-V2 — Hot Sales Event Engine (Phase 1 build contract)

**Status:** Authoritative Phase 1 implementation contract  
**Vision archive:** [PRD.md](./PRD.md)  
**First variant seed:** [hot-sales.md](./hot-sales.md) (GP2 piglet — template data only)

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

```text
/trade/[locale]/admin/events
/trade/[locale]/admin/events/new
/trade/[locale]/admin/events/[id]/setup
/trade/[locale]/admin/events/[id]/allocation
/trade/[locale]/events
/trade/[locale]/events/[id]/order
/trade/[locale]/my-orders
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

- Dedicated `/admin/events/new` route deferred — create lives on `/admin/events`.
- Trade UI copy is mostly inline `vi`/`en` ternaries; `messages/trade/*` powers the shell nav.
- Full Excel import suite remains Phase 2.

### Post-closure verification (not a Phase 1 blocker)

Journey Playwright (`@journey` in `e2e/trade-hot-sales.spec.ts`) needs operator credentials (`SHARED_ADMIN_*` / `E2E_OPERATOR_*`). Run when creds are available:

```bash
npx playwright test --project=journey --grep "Trade Hot Sales"
```

Smoke auth redirect is the Phase 1 gate; journey is optional post-closure verification.

## Phase 2 (later)

Scoping note: [PHASE-2-SCOPING.md](./PHASE-2-SCOPING.md). Do not implement until a Phase 2 build contract is approved.

Candidates: 7-role RBAC, finance/deposit tables, pickup/ops, ERP sync, notifications, Excel imports, dedicated `/admin/events/new`.
