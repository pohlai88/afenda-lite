# AdminCN customization playbook

**Frontend alignment:** [doc/frontend/06-admincn-alignment.md](../../doc/frontend/06-admincn-alignment.md)  
**Preflight before new screens:** [admincn-frontend-preflight.md](admincn-frontend-preflight.md)  
**Product home:** `components-V2/`  
**Auth island:** `features/auth/` — preserve `app/auth-surface.css` + route-scoped `app/auth/neon-auth-ui.css`

## Critical constraint

Studio MCP does **not** install the AdminCN template as one unit. It exposes **blocks** under `dashboard-and-application`. The full template already lives in `components-V2/`.

Do **not** wire more demo views into product routes while freeze holds. Refine existing surfaces only.

## Shared shell (2026-07-11)

`AdminCnShell` hosts SaaS-style modules:

| Module | Routes | Gate |
|--------|--------|------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` |
| Feed Farm Trade | `/trade/*` | `requireTradeAccess` |

Product purpose: B2B feed & farm trade sales ([doc/frontend/adr/001-feed-farm-trade.md](../../doc/frontend/adr/001-feed-farm-trade.md)).
| Admin routes | playground (local), future org-admin links | `isAdminSession` |

Nav is filtered by `modules/platform/shell/access.ts` via `navConfig` `kind` + `moduleId`.

## Customization levers (in order)

| Lever | Edit | Do not |
|-------|------|--------|
| Theme / branding | `components-V2/platform-config/themeConfig.ts` + presets + Header ThemeCustomizer | Put portal navy into AdminCN `:root` |
| Dark mode | Root `features/portal-chrome/theme-provider` | Nest a second ThemeProvider inside AdminCN shell |
| Navigation | `components-V2/platform-config/navConfig.tsx` (module-tagged) | Hardcode nav in layout JSX; resurrect `TradeShell` |
| Screen content | `components-V2/platform-views/portal-views/*` (thin `app/**/page.tsx`) | Grow route files |
| Data | Domain + `app/actions/*` | Invent UI before data contract; use `platform-fake-db` |
| Auth island | Studio shell + Neon + auth CSS | Theme login via AdminCN customizer; import Neon CSS into `globals.css` |

**Cookie caveat:** `settingsCookieName` overrides `themeConfig`. Reset ThemeCustomizer or clear the cookie to see config changes.

**CSS split:** AdminCN tokens → `app/globals.css`. Login island → `app/auth-surface.css`. Neon Auth UI → `app/auth/neon-auth-ui.css` (auth layout only).

## Official Studio order

1. Review shell / routes  
2. Brand + `themeConfig` + nav  
3. Replace fake-db with APIs / domain  
4. Prune unused demos  

## Forbidden without explicit reopen

- Bulk-wiring more AdminCN demos into product routes  
- Restoring Feed Farm Trade **product UI** under a separate shell (`TradeShell`, locale switcher)  
- Replacing Neon credential paths with Studio account-settings blocks  
- Mixing portal auth tokens into AdminCN `:root`  
- Enabling Hot Sales prod flags without gate-register  

Allowed (shell already landed): shared AdminCN on `/trade/*` with Feed Farm Trade permission gate; thin stubs until UI restore is reopened.

## Refine checklist (per page)

Full gate: [admincn-frontend-preflight.md](admincn-frontend-preflight.md).

1. Brand (`themePreset` / tokens) — login island unchanged  
2. Nav — real destinations only; module entitlements correct  
3. Edit one `portal-views` composition (or trade stub owner)  
4. Swap fake-db for that page  
5. Sync governance if surface IDs change  
6. Verify: relevant unit tests + `npx tsc --noEmit` on touched paths  
