# Residue inventory (Pass 2)

**Status: Pass 2 complete (2026-07-12).** FE trust/copy/brand/theme helpers and shims relocated or deleted. Remaining `lib/` is intentional runners only.

**Authority:** [doc/backend/06-modules-ownership.md](../../../doc/backend/06-modules-ownership.md) §5

---

## Keep (runners / harness) — live under `lib/`

| Path | Why |
|------|-----|
| `lib/pages/playground/**` | Local harness thin runners |
| `lib/playground/**` | Playground registry / policies |
| `features/playground/**` | Playground UI |
| `lib/pages/organization-admin-*` | Reopened operator page runners |
| `lib/pages/public-link-page*` | `/f` public-link runner |
| `lib/entry/**` | Login / invite / secure-link entry — migrate to `features/*` only with **explicit approve** |

Do **not** grow these drawers. Do **not** delete them in a drive-by “no residue” pass without a migrate plan — product routes still import them.

---

## Relocated (Pass 2 done)

| Former path | New home |
|-------------|----------|
| `lib/utils.ts`, `lib/format.ts` | Deleted — `@/modules/platform/utils` / `format` (`components.json` utils alias) |
| `lib/auth/auth-page-trust*` | `features/auth/auth-page-trust*` |
| `lib/auth/auth-form-intro-visibility*` | `features/auth/auth-form-intro-visibility*` |
| `lib/copy/auth-shell-copy.ts` | `features/auth/auth-shell-copy.ts` |
| `lib/copy/portal-brand*` | `features/portal-chrome/portal-brand*` |
| `lib/copy/portal-theme.ts` | `features/portal-chrome/portal-theme.ts` |
| `lib/copy/portal-copy.ts`, `portal-name.ts` | Deleted duplicates — SSOT `@/modules/declarations/copy/*` |
| `lib/organization-admin-shell-members.ts` | `modules/identity/organization-admin-shell-members.ts` |

---

## Gone (do not recreate)

| Path |
|------|
| `lib/domain/` |
| `lib/schemas/` |
| `lib/env/` |
| `lib/routing/` |
| `lib/auth/` |
| `lib/copy/` |
| `lib/utils.ts`, `lib/format.ts` |
| `modules/trade/` |

---

## Pass 2 checklist

- [x] Grep imports of each prune candidate; flip or delete safely
- [x] Remove unused shims after zero importers
- [x] Update this file + `doc/backend/06-modules-ownership.md`
- [x] Do not touch FFT gate-register / prod flags in the same PR

## Next residue (not Pass 2 — needs approve)

| Work | Notes |
|------|-------|
| Migrate `lib/entry/*` → `features/*` | Pre-login / auth / invite / secure-link runners |
| Migrate `lib/pages/organization-admin-*` → features | Operator page runners |
| ClientProfile port | Remove Identity→Declarations `getClientProfile` narrow edge |
