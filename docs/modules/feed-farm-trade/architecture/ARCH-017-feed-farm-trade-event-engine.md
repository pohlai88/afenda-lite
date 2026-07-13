# ARCH-017 Feed Farm Trade Event Engine

| Field | Value |
|-------|-------|
| ID | ARCH-017 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| **Doc type** | `ARCHITECTURE` — slice brief |
| **Status** | Accepted |
| **Baseline** | commit `1bc1294` · tag `fft-phase-1` |
| **Agent entry** | [RUNTIME.md](../FFT-MOD-008-ops-runtime.md) |
| **Contract** | [spec/phase-1-prd.md](../spec/GUIDE-015-feed-farm-trade-phase-1-prd.md) |

## Scope

Reusable Feed Farm Trade event engine under `/fft` in the same Next.js app:

- Generic events, products, custom columns, priority CSV, sales allowlist
- Sales order registration with server timestamp and deadline gate
- Priority → FCFS → order_id allocation with `fft_allocation_run`
- Deposit/transfer lite, audit, CSV export, vi/en trade i18n
- GP2 piglet cloneable template (data only)

## Acceptance

Phase 1 accepted at `1bc1294`. Checklist in [spec/phase-1-prd.md](../spec/GUIDE-015-feed-farm-trade-phase-1-prd.md). Shipped under `/fft`:

- Schema `013_hot_sales.sql` + domain (`modules/fft/domain` — formerly `lib/domain/fft`)
- Admin setup / clone / open-close / allocation / export / audit
- Sales order + transfer lite + countdown
- Open-event field locks (products, required columns, support/closes override)
- Playwright: `@smoke` auth redirect (Phase 1 gate)
- Playwright `@journey` (create → order → allocate → export) is **post-closure verification** — run only when operator credentials are available; not a Phase 1 blocker

## Hygiene

Keep unrelated layout / repo-migration WIP off Feed Farm Trade history. Do not fold portal layout renames into trade commits.

## Phase 2+ docs (same directory)

| Type | Doc |
|------|-----|
| SPEC | [spec/phase-2a-prd.md](../spec/GUIDE-016-feed-farm-trade-phase-2a-prd.md) · [spec/phase-2a-slices.md](../spec/GUIDE-017-feed-farm-trade-phase-2a-slices.md) |
| ADR | [adr/001-rbac.md](../adr/ADR-006-feed-farm-trade-rbac.md) |
| OPS | [ops/gate-register.md](../ops/RB-002-feed-farm-trade-gate-register.md) · [ops/rollout.md](../ops/RB-004-feed-farm-trade-ops-rollout.md) · [ops/release-readiness.md](../ops/RB-003-feed-farm-trade-release-readiness.md) |
| ARCHIVE | [archive/phase-2-feedback.md](../archive/GUIDE-020-feed-farm-trade-phase-2-feedback-archive.md) · [archive/phase-2-scoping.md](../archive/GUIDE-021-feed-farm-trade-phase-2-scoping-archive.md) |

**Phase 2A closed** (tag `fft-phase-2a`). **No 2B–2D** without new ADR. See [RUNTIME.md](../FFT-MOD-008-ops-runtime.md).
