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

- Operator chrome: AdminCN — [ARCH-015](../../architecture/frontend/ARCH-015-admincn-alignment.md) · [ARCH-018](../../architecture/tech-stack/ARCH-018-admincn-customization.md).
- UI implementation: `features/fft/*` — **no** `FftShell`.

## Client vs operator

| Audience | Entry |
|----------|-------|
| Operator / trade users with `fft.access` | `/fft` |
| Declaration preview client | Not auto on sales allowlist; separate client routes |

## Thin page rule

`app/fft/**/page.tsx` stays thin RSC → feature runners / domain. Mutations via Server Actions. Align with [ARCH-013](../../architecture/frontend/ARCH-013-bff-and-data-flow.md).

## Product locks

[FFT-MOD-001](FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](FFT-MOD-010-module-docs-index.md).

Roadmap / phase status: [FFT-MOD-010](FFT-MOD-010-module-docs-index.md). Ops: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).
