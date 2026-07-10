# features/auth — Studio + Neon pre-login island

Production auth/join UI. AdminCN customization skill: **auth island stays isolated**.

## CSS preserve contract

| Asset | Rule |
|-------|------|
| [`app/auth-surface.css`](../../app/auth-surface.css) | **Do not gut.** Neon `@import "@neondatabase/auth-ui/tailwind"`, scoped tokens under `.auth-surface`, `.portal-neon-view` rules |
| [`app/globals.css`](../../app/globals.css) | Must keep `@import "./auth-surface.css"` |
| AdminCN `:root` | Never put portal navy / login tokens into AdminCN root |

Shell must render with class **`auth-surface`** (via `LoginPage02Chrome` → `data-auth-island="studio"`).

## Kit SSOT

- Layout DNA: [`features/auth/studio/login-page-02-chrome.tsx`](studio/login-page-02-chrome.tsx) → `LoginPage02Chrome`
- Credentials: Neon `AuthView` only (`PortalAuthNeonView`) — never Studio `LoginForm` fields

## Prod entry

- `/auth/[path]` → `StudioAuthLoginPage`
- `/join` → `StudioInvitationJoinPage`

Guardian / `PortalAuthLayout` = Storybook only (see file headers on those components).
