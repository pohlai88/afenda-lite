---
name: admincn-customization
description: Customizes the landed AdminCN shell in components-V2 via themeConfig, navConfig, platform-views, and Shadcn Studio MCP blocks. Use when refining AdminCN dashboards, theme presets, sidebar nav, Studio blocks (application-shell, charts, account-settings), or when the user mentions AdminCN, ThemeCustomizer, or components-V2 customization.
---

# AdminCN customization

**SSOT playbook:** [docs/architecture/admincn-customization.md](../../../docs/architecture/admincn-customization.md)  
**Frontend preflight (before new screens):** [docs/architecture/admincn-frontend-preflight.md](../../../docs/architecture/admincn-frontend-preflight.md)  
**Components home:** [components/README.md](../../../components/README.md)  
**Auth island:** [features/auth/README.md](../../../features/auth/README.md) — preserve `app/auth-surface.css`

## Critical constraint

Studio MCP does **not** install the AdminCN template as one unit. It exposes **blocks** under `dashboard-and-application` (shells, charts, widgets, account-settings, form-layout, empty-state, …). The full template already lives in `components-V2/`.

Do **not** wire more demo views into product routes while freeze holds. Refine existing surfaces only.

## Customization levers (in order)

| Lever | Edit | Do not |
|-------|------|--------|
| Theme / branding | `components-V2/platform-config/themeConfig.ts` + presets + Header ThemeCustomizer | Put portal navy into AdminCN `:root` |
| Navigation | `components-V2/platform-config/navConfig.tsx` | Hardcode nav in layout JSX |
| Screen content | `components-V2/platform-views/*` (thin `app/**/page.tsx`) | Grow route files |
| Data | `app/server/actions.ts` → real portal queries | Invent UI before data contract |
| Auth island | Keep Studio shell (`features/auth`) + Neon + `app/auth-surface.css` | Theme login via AdminCN customizer |

**Cookie caveat:** `settingsCookieName` overrides `themeConfig`. Reset ThemeCustomizer or clear the cookie to see config changes.

**CSS split:** AdminCN tokens → `app/globals.css`. Login → scoped `app/auth-surface.css`.

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
- Hot Sales `app/trade/**`  
- Replacing Neon credential paths with Studio account-settings blocks  
- Mixing portal auth tokens into AdminCN `:root`

## Refine checklist (per page)

Full gate: [admincn-frontend-preflight.md](../../../docs/architecture/admincn-frontend-preflight.md).

1. Brand (`themePreset` / tokens) — verify login island unchanged  
2. Nav — real destinations only  
3. Edit one `platform-views` composition (product → `portal-views/`)  
4. Swap fake-db for that page  
5. Sync governance (`surface-entry-points`, `ui-decision-matrix`, reliance registry)  
6. Optional: one MCP block → adapt into `portal-views/`  
7. Verify: `npm run checks` + `npx tsc --noEmit`
