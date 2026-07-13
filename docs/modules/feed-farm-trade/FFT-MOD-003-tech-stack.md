# FFT-MOD-003 Tech Stack

| Field | Value |
|-------|-------|
| ID | FFT-MOD-003 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-003 Tech Stack |

## Runtime

- **Default:** Node.js server (Next.js App Router RSC + Server Actions).
- **Edge:** only as a documented exception — not the FFT default.
- **Host:** Afenda-Lite on Vercel (`afenda-lite`); local `npm run dev` against production Neon branch policy.

## Frameworks / UI

| Layer | Choice |
|-------|--------|
| App | Next.js App Router |
| Operator shell | AdminCN (`AdminCnShell`) |
| UI feature code | `features/fft/*` |
| i18n | vi/en trade strings (engine) |

## Data access

- Neon Postgres shared schema + hard `organization_id` predicates (platform).
- Domain modules under `modules/fft/domain/` (Drizzle/SQL via existing app data layer — Turborepo `@afenda/db` is Target).

## Auth dependency

- Neon Auth for identity and org membership.
- Platform `fft.access` for module entry.
- Module RBAC when `FFT_RBAC_ENABLED=true` ([FFT-MOD-005](FFT-MOD-005-auth-tenancy-rbac.md)).

## Module feature flags / env keys

| Variable | Production | Local | Notes |
|----------|------------|-------|-------|
| `FFT_RBAC_ENABLED` | `true` | `false` | Manifest SSOT |
| `FFT_DEPOSIT_ENABLED` | `false` | `false` | 2B |
| `FFT_PICKUP_OPS_ENABLED` | `false` | `false` | 2B |
| `FFT_NOTIFICATIONS_ENABLED` | `true` | `true` | 2C |
| `FFT_EMAIL_FROM` | set | set | 2C sender |
| `RESEND_API_KEY` | set (Vercel) | set | not via `sync:vercel` |
| `FFT_ERP_SYNC_ENABLED` | `false` | `false` | 2D |
| `FFT_ERP_VENDOR` / `FFT_ERP_BASE_URL` | unset until tenant pack | unset | `syncOptional` |

Never edit `.env` by hand. Never `vercel env pull`. Platform env model: [ARCH-027](../../architecture/turborepo/ARCH-027-env-model.md).

## Local vs prod

| Concern | Local | Prod |
|---------|-------|------|
| Neon branch | Production branch policy | `br-tiny-hill-ao82jp6f` |
| RBAC flag | often `false` | `true` |
| ERP sync | off unless deliberately enabled | off until 2D-3 ready |

Detail and rollback: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md).
