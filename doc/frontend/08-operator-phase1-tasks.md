# Operator post-login — phase-1 task breakdown

**Status:** complete (reopened + implemented 2026-07-11)  
**SSOT:** [03-routes.md](03-routes.md) · [02-folder-map.md](02-folder-map.md) · [04-bff-and-data.md](04-bff-and-data.md) · [06-admincn-alignment.md](06-admincn-alignment.md)

## Goal

Restore `/dashboard`, `/dashboard/clients`, `/dashboard/[id]` with real domain data. Keep `loadOperator*` loaders. Migrate only the broken `@/components/*` leaves used by `portal-views` into `features/operator/`. Do not recreate root `components/`.

## Keep vs fix

| Keep (do not rewrite) | Fix / migrate |
|-----------------------|---------------|
| `lib/pages/operator-dashboard-page.ts` (+ tests) | Broken `@/components/*` imports in portal-views |
| `lib/pages/operator-clients-page.ts` (+ tests) | Leaf widgets → `features/operator/*` |
| `loadOperatorDeclarationDetail` + `.logic.ts` | `runOperatorDeclarationDetailPage` after view graph fixed |
| `components-V2/.../portal-views/operator-*.tsx` composition | Remap imports to `@/features/operator/*` |
| `AdminCnShell` layout | Thin `app/dashboard/**` pages |

## Slices (dependency order)

### Slice 1 — Layout

- Restore [`app/dashboard/layout.tsx`](../../app/dashboard/layout.tsx): `requireAdminSession` + `AdminCnShell`
- Restore [`app/dashboard/error.tsx`](../../app/dashboard/error.tsx): V2 `PortalErrorBoundary`
- Remove reliance on deleted `DashboardShell` / playground embed for this phase

**Verify:** layout typechecks; no `@/components/` in `app/dashboard/layout.tsx`

### Slice 2 — Declarations list

- Restore `app/dashboard/page.tsx` + `loading.tsx`
- Wire `loadOperatorDashboardPage` → `OperatorDeclarationsDashboard`
- Ensure `PortalDeclarationsTable` / create button have no broken imports (migrate `ConfirmDialog` if needed)

**Verify:** `operator-dashboard-page` unit tests; `tsc` on dashboard page

### Slice 3 — Clients

- Restore `app/dashboard/clients/page.tsx` + `loading.tsx`
- Migrate `issue-client-invite-form`, `confirm-dialog` (+ `alert-dialog` into V2 ui)
- Wire `loadOperatorClientsPage` → `OperatorClientsList`

**Verify:** `operator-clients-page` unit tests

### Slice 4 — Declaration detail

- Restore `app/dashboard/[id]/page.tsx` + `loading.tsx`
- Migrate detail leaf closure into `features/operator/` (manage / share / danger / workspace + transitive widgets)
- Retarget portal-views imports; keep `runOperatorDeclarationDetailPage` or thin page calling `load*` + view

**Verify:** detail logic/page tests; `rg "@/components/" components-V2/platform-views/portal-views features/operator app/dashboard` empty

## Migrated leaf set (named only)

`confirm-dialog`, `issue-client-invite-form`, `copy-access-message`, `submission-answers`, `declaration-danger-zone`, `declaration-share-panel`, `declaration-manage-form`, `portal/portal-declaration-workspace`, plus minimal transitive widgets and studio adapters they require. UI primitives remap to `@/components-V2/platform-components/ui/*`. Restore missing `alert-dialog` into V2 ui only.

## Hard bans

- No `git checkout` of entire `components/`
- No join / client workspace / account / playground / trade restore
- No new REST for dashboard reads
- No AdminCN demo prune / fake-db / atmosphere work in this phase

## Definition of Done

- Three operator routes render with real loaders
- Zero `@/components/` imports under portal-views + `features/operator` + `app/dashboard`
- No resurrected root `components/` directory
- Existing operator `lib/pages` tests green
- Decision tree respected; no new REST
- No join/client/trade/account/playground changes

## PR checklist (noise ban)

- [ ] Diff touches only `app/dashboard/**`, `features/operator/**`, portal-views import remaps, V2 ui gaps (`alert-dialog` / `DialogBody`), and `doc/frontend` phase-1 docs
- [ ] No restore of root `components/` or bulk `git checkout components/`
- [ ] No join / client workspace / account / playground / trade pages
- [ ] No Guardian / PA / owl / brand `public/` restore
- [ ] No new REST for dashboard reads
- [ ] `rg "@/components/" components-V2/platform-views/portal-views features/operator app/dashboard` is empty
- [ ] Operator `lib/pages` unit tests pass
