# FFT-MOD-004 Data Model

| Field | Value |
|-------|-------|
| ID | FFT-MOD-004 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-004 Data Model |

## Entities / tables (summary)

Trade lane rooted on events and related children (orders, allocation runs, sales members, RBAC assignments, deposits/pickup, notifications, ERP sync jobs). Authoritative migration lane: `013`–`023` (see [FFT-MOD-008](FFT-MOD-008-ops-runtime.md)); RBAC `014_fft_rbac.sql`; hot sales `013_hot_sales.sql`.

Detail matrices and SQL checks: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).

## Relationships

- Parent **event** scopes children (orders, allocation, templates).
- Sales allowlist rows are roster data — **not** module entry SoT.
- ERP sync store is module-local (`modules/fft/domain/erp-sync-store.ts`).

## `organization_id` rules

- Hard `organization_id = $org` on tenant roots (platform cutover / migration `027`).
- Do not reintroduce soft `(IS NULL OR = $org)` dual-mode.
- FFT child denorm of `organization_id` is **deferred** (ARCH-023 **D4**) — resolve via parent event + org-scoped getters.

## Migration ownership

| Lane | Owner |
|------|-------|
| `013`–`023` Feed Farm Trade | FFT module |
| Platform RBAC / tenancy `025`/`027`/`028` | Platform (not FFT-only commits) |

## Indexes / hot paths

Gate-register and production smokes own index/SQL evidence. Prefer existing getters with org arguments over ad-hoc cross-tenant queries.

## Deferred / limits

- Notification triggers in `023` deferred where noted in RUNTIME.
- No schema-per-tenant or project-per-tenant for this product (ARCH-023 **D5** / **R5**).

**Platform tenancy SSOT:** [ARCH-023](../../architecture/turborepo/ARCH-023-multi-tenancy.md).
