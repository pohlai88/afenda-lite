# S19 — Hot Sales Trade Event Engine (Phase 1)

**Status:** Accepted  
**Baseline:** commit `1bc1294` · tag `hot-sales-phase-1` (2026-07-09)  
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

Phase 1 accepted at `1bc1294`. Checklist in PRD-V2. Shipped under `/trade`:

- Schema `013_hot_sales.sql` + domain (`lib/domain/trade`)
- Admin setup / clone / open-close / allocation / export / audit
- Sales order + transfer lite + countdown
- Open-event field locks (products, required columns, support/closes override)
- Playwright: `@smoke` auth redirect (Phase 1 gate)
- Playwright `@journey` (create → order → allocate → export) is **post-closure verification** — run only when operator credentials are available; not a Phase 1 blocker

## Hygiene

Keep unrelated layout / repo-migration WIP off Hot Sales history. Do not fold portal layout renames into trade commits.

## Out of scope (Phase 2)

| Doc | Role |
|-----|------|
| [PHASE-2-FEEDBACK.md](../../hot-sales/PHASE-2-FEEDBACK.md) | Authoritative planning |
| [PRD-V2-Phase2.md](../../hot-sales/PRD-V2-Phase2.md) | Build contract (**Accepted**) |
| [ADR-001-phase-2-rbac.md](../../hot-sales/ADR-001-phase-2-rbac.md) | RBAC (**Accepted**) |
| [PHASE-2A-SLICES.md](../../hot-sales/PHASE-2A-SLICES.md) | 2A slices (**Approved** / closed) |
| [PHASE-2A-RELEASE-READINESS.md](../../hot-sales/PHASE-2A-RELEASE-READINESS.md) | 2A release readiness (ops packaging) |
| [PHASE-2A-OPS-ROLLOUT.md](../../hot-sales/PHASE-2A-OPS-ROLLOUT.md) | 2A ops rollout checklist |
| [PHASE-2-SCOPING.md](../../hot-sales/PHASE-2-SCOPING.md) | Candidate list (superseded for planning) |

**Phase 2A** may proceed per approved slices. **No 2B–2D** until separately approved.
