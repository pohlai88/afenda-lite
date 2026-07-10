# AdminCN alignment

**Reference:** `_reference/shadcn-nextjs-admincn-admin-template-1.0.0/.../src`  
**Product home:** `components-V2/`

AdminCN is **sound for operator chrome**. It is **not** the auth product and not a license to ship demo apps.

## Template → portal map

| AdminCN `src/` | Portal | Use |
|----------------|--------|-----|
| `components/layout`, `Providers`, `ThemeProvider` | `components-V2/platform-components` | Shell |
| `components/ui` | `platform-components/ui` | Primitives |
| `configs` (nav/theme) | `platform-config/navConfig.tsx`, `themeConfig.ts` | Nav + theme |
| `views/*` product-like | `platform-views/portal-views/*` | Operator screens |
| `app/(pages)` | `app/dashboard/*`, `app/account/*` | Shell routes |
| `app/(blank)/pages/auth/*` | **Do not copy** | Portal uses `features/auth` + Neon |
| `fake-db` | `platform-fake-db` | **Do not import for product** |
| `views/apps/*` (mail, chat, kanban, …) | `platform-views/apps/*` | **Prune candidates** |
| `views/forms`, `datatables`, demo `pages` | matching trees | **Prune** after patterns extracted |

## Keep (product)

- `platform-components/` (layout, ui, Providers)  
- `platform-config/` (`navConfig`, `themeConfig`)  
- `platform-views/portal-views/` (declarations dashboard, clients, detail, share/invite widgets)  
- Optional dashboard **atoms** under `platform-views/dashboards/{statistics,charts,widgets}` when composed by portal-views  

## Drop / never wire to product routes

- `platform-fake-db/`  
- `platform-views/apps/{mail,chat,kanban,calendar,contact,roles,permissions,users}`  
- Blank auth login/register/forgot/reset/two-steps demos  
- Extra `*-dashboard.tsx` demos not used by portal-views  
- Gallery `forms/` and `datatables/` once patterns are copied into portal-views  

## Customization order (Studio / AdminCN skill)

1. Review shell + real routes  
2. Brand via `themeConfig` + nav via `navConfig`  
3. Replace fake-db with domain / actions  
4. Prune unused demos  

## Auth island (hard split)

| Concern | Location |
|---------|----------|
| Login / join / OTP | `features/auth`, `app/auth/*`, `app/auth-surface.css` |
| Operator chrome theme | AdminCN `themeConfig` + `app/globals.css` |

Do not drive Neon Auth pages through AdminCN ThemeCustomizer.
