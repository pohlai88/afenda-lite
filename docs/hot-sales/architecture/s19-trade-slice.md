# S19 — Hot Sales Trade Event Engine (Phase 1)

| Field | Value |
|-------|-------|
| **Doc type** | `ARCHITECTURE` — slice brief |
| **Status** | Accepted |
| **Baseline** | commit `1bc1294` · tag `hot-sales-phase-1` |
| **Agent entry** | [RUNTIME.md](../RUNTIME.md) |
| **Contract** | [spec/phase-1-prd.md](../spec/phase-1-prd.md) |

## Scope

Reusable Hot Sales event engine under `/trade` in the same Next.js app:

- Generic events, products, custom columns, priority CSV, sales allowlist
- Sales order registration with server timestamp and deadline gate
- Priority → FCFS → order_id allocation with `hot_sales_allocation_run`
- Deposit/transfer lite, audit, CSV export, vi/en trade i18n
- GP2 piglet cloneable template (data only)

## Acceptance

Phase 1 accepted at `1bc1294`. Checklist in [spec/phase-1-prd.md](../spec/phase-1-prd.md). Shipped under `/trade`:

- Schema `013_hot_sales.sql` + domain (`lib/domain/trade`)
- Admin setup / clone / open-close / allocation / export / audit
- Sales order + transfer lite + countdown
- Open-event field locks (products, required columns, support/closes override)
- Playwright: `@smoke` auth redirect (Phase 1 gate)
- Playwright `@journey` (create → order → allocate → export) is **post-closure verification** — run only when operator credentials are available; not a Phase 1 blocker

## Hygiene

Keep unrelated layout / repo-migration WIP off Hot Sales history. Do not fold portal layout renames into trade commits.

## Phase 2+ docs (same directory)

| Type | Doc |
|------|-----|
| SPEC | [spec/phase-2a-prd.md](../spec/phase-2a-prd.md) · [spec/phase-2a-slices.md](../spec/phase-2a-slices.md) |
| ADR | [adr/001-rbac.md](../adr/001-rbac.md) |
| OPS | [ops/gate-register.md](../ops/gate-register.md) · [ops/rollout.md](../ops/rollout.md) · [ops/release-readiness.md](../ops/release-readiness.md) |
| ARCHIVE | [archive/phase-2-feedback.md](../archive/phase-2-feedback.md) · [archive/phase-2-scoping.md](../archive/phase-2-scoping.md) |

**Phase 2A closed** (tag `hot-sales-phase-2a`). **No 2B–2D** without new ADR. See [RUNTIME.md](../RUNTIME.md).
