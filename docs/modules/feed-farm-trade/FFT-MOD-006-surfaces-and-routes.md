# FFT-MOD-006 Surfaces and Routes

| Field | Value |
|-------|-------|
| ID | FFT-MOD-006 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-006 Surfaces and Routes |

## Route map

| Surface | Path | Notes |
|---------|------|-------|
| Trade app | `app/fft/**` | Locale-free product routes |
| Legacy locale | `app/fft/[locale]/[[...path]]` | Redirect shim only |
| Layout | `app/fft/layout.tsx` | `AdminCnShell` |
| RBAC admin | `/fft/admin/rbac` | Control plane |

Canonical route inventory: [ARCH-012](../../architecture/frontend/ARCH-012-app-router-routes.md).

## Layout / shell

- Operator chrome: AdminCN — [ARCH-015](../../architecture/frontend/ARCH-015-admincn-alignment.md) · [ARCH-018](../../architecture/ARCH-018-admincn-customization.md).
- UI implementation: `features/fft/*` — **no** `FftShell`.

## Client vs operator

| Audience | Entry |
|----------|-------|
| Operator / trade users with `fft.access` | `/fft` |
| Declaration preview client | Not auto on sales allowlist; separate client routes |

## Thin page rule

`app/fft/**/page.tsx` stays thin RSC → feature runners / domain. Mutations via Server Actions. Align with [ARCH-013](../../architecture/frontend/ARCH-013-bff-and-data-flow.md).

## Product locks

[ADR-003](../../adr/frontend/ADR-003-feed-farm-trade-module.md) · [ADR-004](../../adr/frontend/ADR-004-feed-farm-trade-architecture.md) · [ADR-005](../../adr/frontend/ADR-005-feed-farm-trade-roadmap.md).

Phase task guides: [GUIDE-010](../../guides/GUIDE-010-feed-farm-trade-phase-0-shell.md)…[GUIDE-013](../../guides/GUIDE-013-feed-farm-trade-phase-3-ops-flags.md).
