# S19 — Hot Sales Trade Event Engine (Phase 1)

**Contract:** [docs/hot-sales/PRD-V2.md](../../hot-sales/PRD-V2.md)  
**Vision archive:** [docs/hot-sales/PRD.md](../../hot-sales/PRD.md)

## Scope

Reusable Hot Sales event engine under `/trade` in the same Next.js app:

- Generic events, products, custom columns, priority CSV, sales allowlist
- Sales order registration with server timestamp and deadline gate
- Priority → FCFS → order_id allocation with `hot_sales_allocation_run`
- Deposit/transfer lite, audit, CSV export, vi/en trade i18n
- GP2 piglet cloneable template (data only)

## Acceptance

See PRD-V2 checklist. Phase 1 engine is implemented under `/trade`:

- Schema `013_hot_sales.sql` + domain (`lib/domain/trade`)
- Admin setup / clone / open-close / allocation / export / audit
- Sales order + transfer lite + countdown
- Open-event field locks (products, required columns, support/closes override)
- Playwright: `@smoke` auth redirect (Phase 1 gate)
- Playwright `@journey` (create → order → allocate → export) is **post-closure verification** — needs operator creds; not a Phase 1 blocker

## Out of scope (Phase 2)

See [docs/hot-sales/PHASE-2-SCOPING.md](../../hot-sales/PHASE-2-SCOPING.md): 7-role RBAC, finance/deposit, pickup/ops, ERP sync, notifications, Excel imports, dedicated admin create route.
