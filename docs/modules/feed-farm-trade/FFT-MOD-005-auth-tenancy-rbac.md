# FFT-MOD-005 Auth, Tenancy and RBAC

| Field | Value |
|-------|-------|
| ID | FFT-MOD-005 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-005 Auth, Tenancy and RBAC |

## Identity source

Neon Auth — session, org membership, invitations. Credential MFA (if any) is Neon-owned, not AdminCN chrome.

## Org resolution

Active → slug → sole membership (platform). Hard fail-closed multi-org. Ops stamps use explicit `--organization-id`. See [ARCH-011](../../architecture/ARCH-011-platform-tenancy-rbac.md) · [ARCH-023](../../architecture/turborepo/ARCH-023-multi-tenancy.md).

## Platform vs module permissions

| Layer | Mechanism | Role |
|-------|-----------|------|
| Platform entry | `fft.access` | Org-scoped module SoT |
| Module RBAC | Permission catalog (ADR-006) | Fine-grained trade actions when `FFT_RBAC_ENABLED` |
| Sales allowlist | `fft_sales_member` | Roster only — does **not** auto-promote entry |

Write-time `ensureFftMemberPlatformAccess` on sales upsert / FFT role assign. Backfill: `npm run backfill:fft-access`.

## Route / action gates

- Session gate: `modules/fft/auth/fft-session.ts` (incl. own-scope `resourceOwnerUserId`).
- Phase 2B: `modules/fft/auth/trade-phase2b.ts` + deposit/pickup flags.
- Phase 2D: `modules/fft/auth/trade-phase2d.ts` + `FFT_ERP_SYNC_ENABLED`.
- Control plane: `/fft/admin/rbac` + `org.roles.manage` / `role.manage` as shipped.

## Deny behavior

Signed-in user without `fft.access` hitting `/fft` → `/auth/sign-in?reason=fft-access-denied` → session exists → `/client`. Expected — not an RBAC regression.

## Key decision

[FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md) — permission-catalog RBAC. Do not hardcode org-chart job titles as enums.

**Evidence:** [ARCH-023](../../architecture/turborepo/ARCH-023-multi-tenancy.md).
