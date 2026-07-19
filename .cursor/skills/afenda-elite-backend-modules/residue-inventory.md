# Residue inventory (Pass 2 + full runner absorb)

**Status:** Historical relocate program closed 2026-07-12 (pre-Collapse evidence). **`lib/` must not be recreated.** On this **docs-first** checkout, root `features/` / `modules/` / `app/` are also **absent by design** (ARCH-028) — rows below are relocate **targets**, not a claim those trees exist today.

**Authority (operative):** ARCH-009 ownership map (residue / relocate) — Living body dormant; this companion is SSOT.

---

## Keep (product + harness) — Target under `apps/web/features/` (logical `features/`)

| Path | Why |
|------|-----|
| `features/playground/**` | **Absent** 2026-07-15 — do not recreate; was local harness after lib absorb |
| `features/auth/entry/**` | Login / invite / secure-link entry |
| `features/auth/public-link-page*` | `/f` / open-link page helpers |
| `features/organization-admin/organization-admin-*` | Historical Living absorb target → Target physical `features/org-admin/` (ARCH-022 / S7.4) |

Do **not** recreate `lib/` or recover Collapse roots. New UI → Target `apps/web/features/*` per folder map after implement authorization.

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
| `lib/pages/playground/**` | Was → `features/playground/` — both now absent |
| `lib/playground/**` | Was → `features/playground/` — both now absent |
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
- [x] Update this file (ARCH-009 Living body dormant — companion is SSOT)
- [x] Do not touch FFT gate-register / prod flags in the same PR
- [x] Playground harness absorb (`lib/playground` + `lib/pages/playground` → `features/playground`) — then **removed** 2026-07-15 (Studio MCP only for any return)
- [x] Empty `lib/` removed

## Optional next (needs approve)

- [x] ~~Reliance mapping / graph / route-coverage snapshots~~ — **retired 2026-07-17** (Collapse residue). Root aliases removed. Live package/feature boundaries = ARCH-024 + Vitest (`feature-db-boundary` · ui/auth boundary tests). Greenfield control-plane graph only after Approved Docs ADR + implement slice (no Collapse recover).
- Product phases (`/client` workspace restore, FFT P3 flags, SaaS billing/2FA) stay out of this lane

## Closed this pass (2026-07-12)

- Overloaded `app/dashboard/[id]` → `[declarationId]`
- Adapter ERP tests under `app/actions/`
- Studio shells flattened under `features/organization-admin/`
- `surface-entry-points` remapped off deleted `lib/*` / `components/*`
