# FFT-MOD-002 Domain and Ownership

| Field | Value |
|-------|-------|
| ID | FFT-MOD-002 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-002 Domain and Ownership |

## Bounded context

**Feed Farm Trade** — B2B feed & farm trade sales events: catalog setup, sales orders, priority/FCFS allocation, deposits/pickup ops, Excel import, outbound mail, optional ERP push.

Host product: **Afenda-Lite**. Shell id: `fft`. Engine env prefix: `FFT_*`.

## Ubiquitous language

| Term | Meaning |
|------|---------|
| Event | Trade sales event (`fft_event` and children) |
| Allowlist | `fft_sales_member` roster (not module entry SoT) |
| Module entry | Platform permission `fft.access` (org-scoped) |
| Trade RBAC | Module permission catalog (ADR-006) when `FFT_RBAC_ENABLED` |
| Depth docs | Typed evidence under `adr/` `ops/` `spec/` — not the 10-MOD spine |

## Code ownership map

| Area | Path | Notes |
|------|------|-------|
| Routes | `app/fft/**` | Locale-free; legacy locale shim is redirect-only |
| UI | `features/fft/*` | Under `AdminCnShell` — **no** `FftShell` |
| Domain | `modules/fft/domain/` | Store, allocation, ERP, etc. |
| Auth / gates | `modules/fft/auth/` | `fft-session`, phase2b/2d |
| Actions | `app/actions/fft.ts` | Server Actions entry |
| Schema | `db/migrations/013_*` … trade lane | See FFT-MOD-004 |
| E2E | `e2e/trade-fft.spec.ts` | `@smoke` / `@journey` |

## Doc ownership

| Concern | Doc |
|---------|-----|
| Spine + navigation | [FFT-MOD-010](FFT-MOD-010-module-docs-index.md) |
| Ops / prod | [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) |
| Material decisions | `adr/ADR-006`…`009` |
| Phase contracts | `spec/GUIDE-015`…`018` |
| FE product locks | [FFT-MOD-001](FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](FFT-MOD-010-module-docs-index.md) |
| Skill | `.cursor/skills/feed-farm-trade` |

## Forbidden

- Inventing `modules/trade` or a separate FFT stack
- Restoring `FftShell` / locale-switcher product UI
- Teaching soft SQL tenancy or first-org stamp as current
- Mixing declaration / atmosphere work into FFT commits
