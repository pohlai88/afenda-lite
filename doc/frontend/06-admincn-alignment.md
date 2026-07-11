# AdminCN alignment

**Reference:** `_reference/shadcn-nextjs-admincn-admin-template-1.0.0/.../src`  
**Product home:** `components-V2/`  
**Playbook:** [docs/architecture/admincn-customization.md](../../docs/architecture/admincn-customization.md)  
**Preflight:** [docs/architecture/admincn-frontend-preflight.md](../../docs/architecture/admincn-frontend-preflight.md)  
**UI registry (compulsory):** [`.cursor/skills/feed-farm-trade/ui-registry.md`](../../.cursor/skills/feed-farm-trade/ui-registry.md) · [`ui-registry.json`](../../.cursor/skills/feed-farm-trade/ui-registry.json)

AdminCN is the **shared platform shell** for Declarations, Account, and Feed Farm Trade. It is **not** the auth product and not a license to ship demo apps.

Every primitive and block under `components-V2` used as DNA must carry an `ACN-UI-*` or `ACN-BLK-*` ID in the registry. Product FFT modules use `FFT-UI-*`. See [fft-ui-registry.mdc](../../.cursor/rules/fft-ui-registry.mdc).

## Template → portal map

| AdminCN `src/` | Portal | Use |
|----------------|--------|-----|
| `components/layout`, `Providers`, `ThemeProvider` | `components-V2/platform-components` (`AdminCnShell`) | Shell |
| `components/ui` | `platform-components/ui` | Primitives |
| `configs` (nav/theme) | `platform-config/navConfig.tsx`, `themeConfig.ts` | Nav + theme |
| `views/*` product-like | `platform-views/portal-views/*` | Declarations screens |
| `app/(pages)` | `app/dashboard/*`, `app/account/*`, `app/trade/*` | Shell routes |
| `app/(blank)/pages/auth/*` | **Do not copy** | Portal uses `features/auth` + Neon |
| `fake-db` | `platform-fake-db` | **Do not import for product** |
| `views/apps/*` (mail, chat, kanban, …) | `platform-views/apps/*` | **Prune candidates** |
| `views/forms`, `datatables`, demo `pages` | matching trees | **Prune** after patterns extracted |

## Keep (product)

- `platform-components/` (layout, ui, Providers, `AdminCnShell`)  
- `platform-config/` (`navConfig` with module tags, `themeConfig`)  
- `platform-views/portal-views/` (declarations dashboard, clients, detail, share/invite widgets)  
- Optional dashboard **atoms** under `platform-views/dashboards/{statistics,charts,widgets}` when composed by portal-views  
- Shell entitlement: `modules/platform/shell/access.ts`

## Drop / never wire to product routes

- `platform-fake-db/`  
- `platform-views/apps/{mail,chat,kanban,calendar,contact,roles,permissions,users}`  
- Blank auth login/register/forgot/reset/two-steps demos  
- Extra `*-dashboard.tsx` demos not used by portal-views  
- Gallery `forms/` and `datatables/` once patterns are copied into portal-views  
- Separate Feed Farm Trade chrome (`TradeShell`, locale switcher) — **removed**; use AdminCN only  

## SaaS modules in one shell

| Module | Routes | Layout gate | Nav `moduleId` |
|--------|--------|-------------|----------------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` | `declarations` |
| Feed Farm Trade | `/trade/*` | `requireTradeAccess` | `feed-farm-trade` |

Purpose: B2B feed & farm trade sales for 3F operators — [adr/001-feed-farm-trade.md](adr/001-feed-farm-trade.md) · [001A](adr/001A-feed-farm-trade-architecture.md) · [001R](adr/001R-feed-farm-trade-roadmap.md). Downstream customer portal is out of scope for this module.
| Admin routes | e.g. playground (local) | `isAdminSession` | `kind: "admin"` |

## Customization order (Studio / AdminCN skill)

1. Review shell + real routes  
2. Brand via `themeConfig` + nav via `navConfig` (module-tagged)  
3. Replace fake-db with domain / actions  
4. Prune unused demos  

## Auth island (hard split)

| Concern | Location |
|---------|----------|
| Login / join / OTP | `features/auth`, `app/auth/*`, `app/auth-surface.css` |
| Neon Auth UI CSS | `app/auth/neon-auth-ui.css` via `app/auth/layout.tsx` only (not AdminCN globals) |
| Platform chrome theme | AdminCN `themeConfig` + `app/globals.css` |
| Dark mode (`html.dark`) | Root `features/portal-chrome/theme-provider` (next-themes + `client-declaration-theme`) — **one owner**; AdminCN shell does not nest a second ThemeProvider |

Do not drive Neon Auth pages through AdminCN ThemeCustomizer.
