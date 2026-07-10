# components/ — Deprecated (advisory, 2026-07-10)

**Replacement:** `components-V2/` (AdminCN-structured)
**Removal target:** Phase 4 of the components-V2 migration (no hard date yet)

## Freeze (2026-07-10) — stabilize before more page wiring

Major refactor is **paused for stabilization**. Do **not** wire additional `platform-views` into product routes until those pages are refined.

| Surface | Status |
|---------|--------|
| Auth / login (`/`, `/auth/*`, `/client/login`, `/org/login`, `/join`) | **Keep** — Guardian + Neon; CSS island in `app/auth-surface.css` |
| `/dashboard` | AdminCN shell + **demo** sales dashboard (needs refinement) |
| `/dashboard/clients` | AdminCN shell + **demo** users list (needs refinement) |
| `/account`, `/account/[path]` | AdminCN shell + Neon AccountView (BL-07) |
| Client workspace, `/dashboard/[id]`, survey | **Stub** → `redirect("/")` — intentional |
| Hot Sales `app/trade/**` | **Frozen** — do not touch |

## Policy

- Do not add new files to this folder.
- Do not wire more AdminCN demo screens into portal product routes until refinement.
- `components/shadcn-studio/` blocks are preserved for later reuse.
- For new UI work after freeze lifts: `components-V2/platform-components/` and `components-V2/platform-views/`.

## Active auth consumers (must stay until Phase 3/4)

- `app/auth/[path]/page.tsx` → GuardianAuthLoginPage, PortalAuthLayout, PortalAuthNeonView, PortalAuthFormIntro
- `app/page.tsx` → via lib/entry
- `app/client/(gate)/login/page.tsx` → via lib/entry
- `app/org/login/page.tsx` → via lib/entry
- `app/join/page.tsx` → GuardianInvitationJoinPage
- `app/invite/[token]/page.tsx`, `app/f/[token]/page.tsx`

## CSS split

| File | Role |
|------|------|
| `app/globals.css` | AdminCN reference tokens (app chrome) |
| `app/auth-surface.css` | Portal login island (scoped under `.guardian-auth` / `.auth-surface` / …) |
| `app/globals.portal-backup.css` | Pre-migration backup — do not delete |
