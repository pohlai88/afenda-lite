---
name: admincn-customization
description: Customizes the landed AdminCN shell in components-V2 via themeConfig, navConfig, platform-views, and Shadcn Studio MCP blocks. Use when refining AdminCN dashboards, theme presets, sidebar nav, Studio blocks (application-shell, charts, account-settings), or when the user mentions AdminCN, ThemeCustomizer, or components-V2 customization.
---

# AdminCN customization

**SSOT playbook:** [docs/architecture/admincn-customization.md](../../../docs/architecture/admincn-customization.md)  
**Frontend preflight (before new screens):** [docs/architecture/admincn-frontend-preflight.md](../../../docs/architecture/admincn-frontend-preflight.md)  
**Alignment:** [doc/frontend/06-admincn-alignment.md](../../../doc/frontend/06-admincn-alignment.md)  
**UI registry (compulsory IDs):** [../feed-farm-trade/ui-registry.md](../feed-farm-trade/ui-registry.md) · [../feed-farm-trade/ui-registry.json](../feed-farm-trade/ui-registry.json) · rule [`.cursor/rules/fft-ui-registry.mdc`](../../rules/fft-ui-registry.mdc)  
**Product home:** `components-V2/`  
**Auth island:** `features/auth/` — preserve `app/auth-surface.css` + route-scoped `app/auth/neon-auth-ui.css`

## Critical constraint

Studio MCP does **not** install the AdminCN template as one unit. It exposes **blocks** under `dashboard-and-application` (shells, charts, widgets, account-settings, form-layout, empty-state, …). The full template already lives in `components-V2/`.

**Every AdminCN primitive and block must appear in `ui-registry.json`** as `ACN-UI-*` or `ACN-BLK-*`. Agents must not invent IDs. Product FFT surfaces use `FFT-UI-*`. See registry HITL before creating or wiring UI.

Do **not** wire more demo views into product routes while freeze holds. Refine existing surfaces only. Do **not** import `platform-views` from `features/trade` — adapt via HITL product `FFT-UI-*` that cites `studioSource`.

## Shared shell modules

| Module | Routes | Gate |
|--------|--------|------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` |
| Feed Farm Trade | `/trade/*` | `requireTradeAccess` |
| Admin routes | playground (local), etc. | `isAdminSession` |

Entitlements: `modules/platform/shell/access.ts`. Nav: module-tagged `navConfig`. No separate `TradeShell`.

## Customization levers (in order)

| Lever | Edit | Do not |
|-------|------|--------|
| Theme / branding | `components-V2/platform-config/themeConfig.ts` + presets + Header ThemeCustomizer | Put portal navy into AdminCN `:root` |
| Dark mode | Root `features/portal-chrome/theme-provider` (next-themes + portal storage key) | Nest a second ThemeProvider inside AdminCN shell |
| Navigation | `components-V2/platform-config/navConfig.tsx` (module-tagged) | Hardcode nav in layout JSX; resurrect TradeShell |
| Screen content | `components-V2/platform-views/*` (thin `app/**/page.tsx`) | Grow route files |
| Data | Domain + `app/actions/*` | Invent UI before data contract; `platform-fake-db` |
| Auth island | Keep Studio shell (`features/auth`) + Neon + `app/auth-surface.css` + route-scoped `app/auth/neon-auth-ui.css` | Theme login via AdminCN customizer; import Neon CSS into `globals.css` |

**Cookie caveat:** `settingsCookieName` overrides `themeConfig`. Reset ThemeCustomizer or clear the cookie to see config changes. Preset inline styles clear when AdminCN shell unmounts.

**CSS split:** AdminCN tokens → `app/globals.css`. Login island → `app/auth-surface.css`. Neon Auth UI sheet → `app/auth/neon-auth-ui.css` (auth layout only, never globals).

## Official Studio order (verified)

1. Review shell / routes  
2. Brand + themeConfig + nav  
3. Replace fake-db with APIs  
4. Prune unused demos  

Product orientation: ThemeConfig + live Theme Customizer; presets for mode, font, radius, scale, layout, sidebar variant/collapsible.

## MCP when refining one surface

| Goal | Tool |
|------|------|
| Discover | `get-blocks-metadata` → category `dashboard-and-application` |
| Installable variants | `get-block-meta-content` with registry path (e.g. `/dashboard-and-application/account-settings/registry`) |
| Layout DNA only | `get-inspiration-block-content` + `iuiPath` (e.g. `application-shell-5`) |
| Install into `components/shadcn-studio/` | create-ui: collect → `get_add_command_for_items` |
| Theme generator | `install-theme` (**/rui only**) — prefer local presets first |

### High-value families (freeze set)

- Shell: application-shell / dashboard-shell  
- Dashboard: charts-component, statistics-component, widgets-component  
- Account chrome (layout inspiration only): account-settings-01…07 — **not** a replacement for Neon AuthView on `/account/[path]` (BL-07)  
- Forms / empty: form-layout, empty-state  

## Forbidden without explicit reopen

- Bulk-wiring more AdminCN demos into product routes  
- Restoring Feed Farm Trade **product UI** (stubs OK; no `TradeShell` / locale switcher)  
- Replacing Neon credential paths with Studio account-settings blocks  
- Mixing portal auth tokens into AdminCN `:root`  
- Inventing UI IDs or agent-editing [`ui-registry.json`](../feed-farm-trade/ui-registry.json) to pass Vitest  
- Importing `@/components-V2/platform-views/**` from `features/trade` without a HITL `FFT-UI-*` wrap  

## Refine checklist (per page)

Full gate: [admincn-frontend-preflight.md](../../../docs/architecture/admincn-frontend-preflight.md).

1. Confirm target `ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*` IDs in [ui-registry.json](../feed-farm-trade/ui-registry.json) — **STOP** if missing (human HITL)  
2. Brand (`themePreset` / tokens) — verify login island unchanged  
3. Nav — real destinations only; module entitlements correct  
4. Edit one `platform-views` composition (product → `portal-views/` or FFT `features/trade` via product ID)  
5. Swap fake-db for that page  
6. Sync governance (`surface-entry-points`, `ui-decision-matrix`, reliance registry, **ui-registry**)  
7. Optional: one MCP block → adapt into `portal-views/` or FFT feature (new `FFT-UI-*` if FFT)  
8. Verify: `npm run test:unit -- features/trade/ui-registry` + relevant unit tests + `npx tsc --noEmit` on touched paths  
