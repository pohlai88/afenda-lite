# features/auth — Studio + Neon pre-login island

Production auth/join UI. AdminCN customization skill: **auth island stays isolated**.

## CSS preserve contract

| Asset | Rule |
|-------|------|
| [`app/auth-surface.css`](../../app/auth-surface.css) | **Do not gut.** Scoped tokens under `.auth-surface`, `.portal-neon-view` OTP rules. Do **not** redefine AdminCN `@theme --font-heading` globally — set island `--font-heading` on `.auth-surface` only |
| [`app/auth/neon-auth-ui.css`](../../app/auth/neon-auth-ui.css) | **Do not remove.** Must `@import "tailwindcss" source(none)` then `@import "@neondatabase/auth-ui/tailwind"` — Neon’s `/tailwind` is theme + `@source` only; without local `tailwindcss`, input utilities never emit. Auth layout only (not globals) |
| [`app/globals.css`](../../app/globals.css) | Must keep `@import "./auth-surface.css"` |
| AdminCN `:root` | Never put portal navy / login tokens into AdminCN root |

Shell must render with class **`auth-surface`** (via `LoginPage02Chrome` → `data-auth-island="studio"`).

## Theme ownership

Dark mode is owned by root [`features/portal-chrome/theme-provider.tsx`](../portal-chrome/theme-provider.tsx) (next-themes + `client-declaration-theme`). AdminCN shell must **not** nest a second ThemeProvider. ThemeCustomizer presets write `:root` inline styles and clear them on shell unmount.

## Kit SSOT

- Layout DNA: [`features/auth/studio/login-page-02-chrome.tsx`](studio/login-page-02-chrome.tsx) → `LoginPage02Chrome`
- Credentials: Neon `AuthView` only (`PortalAuthNeonView`) — never Studio `LoginForm` fields

## Prod entry

- `/auth/[path]` → `StudioAuthLoginPage`
- `/join` → `StudioInvitationJoinPage` (when restored, import `neon-auth-ui.css` on that segment too)

Guardian / `PortalAuthLayout` = Storybook only (see file headers on those components).
