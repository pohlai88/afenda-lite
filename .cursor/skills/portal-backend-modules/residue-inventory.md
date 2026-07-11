# Residue inventory (Pass 2 + full runner absorb)

**Status:** Pass 2 complete (2026-07-12). **All former `lib/` runners absorbed** into `features/` (2026-07-12). **`lib/` directory is gone** — do not recreate.

**Authority:** [doc/backend/06-modules-ownership.md](../../../doc/backend/06-modules-ownership.md) §5

---

## Keep (product + harness) — under `features/`

| Path | Why |
|------|-----|
| `features/playground/**` | Local harness UI + registry + page runners |
| `features/auth/entry/**` | Login / invite / secure-link entry |
| `features/auth/public-link-page*` | `/f` / open-link page helpers |
| `features/organization-admin/organization-admin-*` | Operator page runners |

Do **not** recreate `lib/` for architecture. New UI → `features/*` or `components-V2/` per folder map.

---

## Relocated

| Former path | New home |
|-------------|----------|
| `lib/utils.ts`, `lib/format.ts` | Deleted — `@/modules/platform/utils` / `format` |
| `lib/auth/auth-page-trust*` | `features/auth/auth-page-trust*` |
| `lib/auth/auth-form-intro-visibility*` | `features/auth/auth-form-intro-visibility*` |
| `lib/copy/auth-shell-copy.ts` | `features/auth/auth-shell-copy.ts` |
| `lib/copy/portal-brand*` | `features/portal-chrome/portal-brand*` |
| `lib/copy/portal-theme.ts` | `features/portal-chrome/portal-theme.ts` |
| `lib/copy/portal-copy.ts`, `portal-name.ts` | Deleted — SSOT `@/modules/platform/copy/*` |
| `lib/organization-admin-shell-members.ts` | `modules/identity/organization-admin-shell-members.ts` |
| `lib/entry/**` | `features/auth/entry/**` |
| `lib/pages/organization-admin-*` | `features/organization-admin/` |
| `lib/pages/public-link-page*` | `features/auth/public-link-page*` |
| `lib/pages/playground/**` | `features/playground/` |
| `lib/playground/**` | `features/playground/` |
| `modules/declarations/copy/*` (SSOT) | `modules/platform/copy/*` — Platform copy port |

---

## Gone (do not recreate)

| Path |
|------|
| `lib/` (entire tree) |
| `lib/domain/` |
| `lib/schemas/` |
| `lib/env/` |
| `lib/routing/` |
| `lib/auth/` |
| `lib/copy/` |
| `lib/entry/` |
| `lib/pages/` |
| `lib/playground/` |
| `lib/utils.ts`, `lib/format.ts` |
| `modules/trade/` |

---

## Pass 2 + absorb checklist

- [x] Grep imports of each prune candidate; flip or delete safely
- [x] Remove unused shims after zero importers
- [x] Update this file + `doc/backend/06-modules-ownership.md`
- [x] Do not touch FFT gate-register / prod flags in the same PR
- [x] Playground harness absorbed (`lib/playground` + `lib/pages/playground` → `features/playground`)
- [x] Empty `lib/` removed

## Optional next (needs approve)

None for residue. Product phases (`/client`, FFT P3 flags, SaaS billing/2FA) stay out of this lane.
