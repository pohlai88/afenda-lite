# Join — phase-2 task breakdown

**Status:** complete (reopened + implemented 2026-07-11)  
**SSOT:** [03-routes.md](03-routes.md) · [05-ui-surfaces.md](05-ui-surfaces.md) · [features/auth/README.md](../../features/auth/README.md)

## Goal

Restore `/join?invitationId=` using **Studio + Neon** (`StudioInvitationJoinPage`). Do not restore Guardian / `PortalInvitationJoinPage`.

## Keep vs fix

| Keep | Restore |
|------|---------|
| `features/auth/studio-invitation-join-page.tsx` (+ panel/steps) | Thin `app/join/page.tsx` |
| `lib/entry/client-invitation-entry.ts` (+ tests) | `loading.tsx` / `error.tsx` |
| `StudioAuthShell` / auth island CSS | Docs + agent-workflow reopen |

## Hard bans

- No Guardian Auth shell on `/join`
- No `/client` workspace, playground, trade
- No root `components/` restore

## Definition of Done

- `/join` renders Studio invitation join (with or without `invitationId`)
- Authenticated users without `invitationId` redirect via entry runner
- Zero `@/components/` under join page + `features/auth` join files
- `client-invitation-entry` unit tests green
