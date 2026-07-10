# Account — phase-3 task breakdown

**Status:** complete (reopened + implemented 2026-07-11)  
**SSOT:** [03-routes.md](03-routes.md) · [05-ui-surfaces.md](05-ui-surfaces.md) · [06-admincn-alignment.md](06-admincn-alignment.md)

**Note:** Strategy order was join → account. Phase 2 (`/join`) stays **closed** until explicitly reopened. This phase is **account only**.

## Goal

Restore `/account` and `/account/[path]` (settings + security) with AdminCN shell + Neon `AccountView`. Fix broken `@/components` import in `features/account`. Do not restore `/client/profile` (phase 4).

## Keep vs fix

| Keep | Fix / restore |
|------|----------------|
| `features/account/portal-account-neon-view.tsx` | `portal-form-section` → migrate form-layout-01 into `features/account/` |
| `features/account/portal-account-section-nav.tsx` | Thin `app/account/**` pages |
| `lib/account-session.ts`, `lib/routing/account-paths.ts` (+ tests) | Wire imports to `@/features/account/*` |
| `AdminCnShell` | `loading.tsx` skeletons |

## Slices

1. **Layout** — `requireAccountSession` + `AdminCnShell` + `error.tsx`
2. **Index** — `/account` → `resolvePortalAccountIndexHref` (operators → settings; clients → `/client/profile` still rebuild)
3. **Path** — `/account/settings` + `/account/security` Neon AccountView + section nav
4. **Form section leaf** — migrate Studio form-layout-01 section to `features/account/`

## Hard bans

- No `/join`, `/client/*` workspace, playground, trade
- No root `components/` restore
- No new REST

## Definition of Done

- `/account` redirects operators to `/account/settings`
- `/account/settings` and `/account/security` render under AdminCN + Neon
- Zero `@/components/` under `features/account` + `app/account`
- `account-paths` unit tests green
