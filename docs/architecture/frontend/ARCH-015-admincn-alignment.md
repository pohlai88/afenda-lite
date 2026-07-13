# ARCH-015 AdminCN Alignment

| Field | Value |
|-------|-------|
| ID | ARCH-015 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Frontend |
| Updated | 2026-07-13 |

**Reference:** `_reference/shadcn-nextjs-admincn-admin-template-1.0.0/.../src`  
**Product home:** `components-V2/`  
**Playbook:** [ARCH-018-admincn-customization.md](../tech-stack/ARCH-018-admincn-customization.md)  
**Preflight:** [ARCH-019-admincn-frontend-preflight.md](../tech-stack/ARCH-019-admincn-frontend-preflight.md)  
**UI registry (compulsory):** [`.cursor/skills/feed-farm-trade/ui-registry.md`](../../../.cursor/skills/feed-farm-trade/ui-registry.md) · [`ui-registry.json`](../../../.cursor/skills/feed-farm-trade/ui-registry.json) · `npm run check:fft-ui-registry`

AdminCN is the **shared platform shell** for Declarations, Account, and Feed Farm Trade. It is **not** the auth product and not a license to ship demo apps.

Every primitive and block under `components-V2` used as DNA must carry an `ACN-UI-*` or `ACN-BLK-*` ID in the registry. Product FFT modules use `FFT-UI-*`. Layer B (`dna` / `surfaces` / `requiredBlockId`) enforces Studio pattern contracts (e.g. Events → TanStack datatable). See [ui-registry.md](../../../.cursor/skills/feed-farm-trade/ui-registry.md) · skill `/feed-farm-trade`.

## Template → portal map

| AdminCN `src/` | Portal | Use |
|----------------|--------|-----|
| `components/layout`, `Providers`, `ThemeProvider` | `components-V2/platform-components` (`AdminCnShell`) | Shell |
| `components/ui` | `platform-components/ui` | Primitives |
| `configs` (nav/theme) | `platform-config/navConfig.tsx`, `themeConfig.ts` | Nav + theme |
| `views/*` product-like | `platform-views/portal-views/*` | Declarations screens |
| `app/(pages)` | `app/dashboard/*`, `app/account/*`, `app/fft/*` | Shell routes |
| `app/(blank)/pages/auth/*` | **Do not copy** | Portal uses `features/auth` + Neon |
| `fake-db` | `platform-fake-db` | **Do not import for product** |
| `views/apps/*` (mail, chat, kanban, …) | `platform-views/apps/*` | **Prune candidates** |
| `views/forms`, `datatables`, demo `pages` | matching trees | **Prune** after patterns extracted |

## Keep (product)

- `platform-components/` (layout, ui, Providers, `AdminCnShell`)  
- `platform-config/` (`navConfig` with module tags, `themeConfig`)  
- `platform-views/portal-views/` (declarations dashboard, clients, detail, share/invite widgets)  
- Optional dashboard **atoms** under `platform-views/dashboards/{statistics,charts,widgets}` when composed by portal-views  
- Shell entitlement: `features/portal-chrome/resolve-shell-access.ts`

## Drop / never wire to product routes

- `platform-fake-db/`  
- `platform-views/apps/{mail,chat,kanban,calendar,contact}` (demo apps)  
- Blank auth login/register/forgot/reset/two-steps demos  
- Extra `*-dashboard.tsx` demos not used by portal-views  
- Gallery `forms/` and `datatables/` once patterns are copied into portal-views  
- Separate Feed Farm Trade chrome (`FftShell`, locale switcher) — **removed**; use AdminCN only  

**Adopt (product, not demo wire):** `platform-views/apps/{roles,permissions}` DNA → `features/organization-admin` Roles/Permissions (ADR-002). Keep zustand stores as DNA only — never import on product routes. `apps/users` remains DNA; live users are `portal-views/organization-admin-users-*`.

## SaaS modules in one shell

| Module | Routes | Layout gate | Nav `moduleId` |
|--------|--------|-------------|----------------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` | `declarations` |
| Feed Farm Trade | `/fft/*` | `requireFftAccess` | `fft` |

Purpose: B2B feed & farm trade sales for 3F businesses (industry customers — not portal organization admins) — [adr/001-feed-farm-trade.md](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [001A](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [001R](../../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md). Downstream customer portal is out of scope for this module.
| Admin routes | e.g. playground (local) | `isAdminSession` | `kind: "admin"` |

## Customization order (Studio / AdminCN skill)

1. Review shell + real routes  
2. Brand via `themeConfig` + nav via `navConfig` (module-tagged)  
3. Replace fake-db with domain / actions  
4. Prune unused demos  
5. Promote MCP Studio installs out of scratch paths into `features/` / `portal-views/` (never keep `shadcn-studio/blocks/` nesting)

**Org-admin Studio shells (live):** `features/organization-admin/form-layout-section.tsx`, `statistics-card.tsx`.

## Auth island (hard split)

| Concern | Location |
|---------|----------|
| Login / join / OTP | `features/auth`, `app/auth/*`, `app/auth-surface.css` |
| Neon Auth UI CSS | `app/auth/neon-auth-ui.css` via `app/auth/layout.tsx` only (not AdminCN globals) |
| Platform chrome theme | AdminCN `themeConfig` + `app/globals.css` |
| Dark mode (`html.dark`) | Root `features/portal-chrome/theme-provider` (next-themes + `client-declaration-theme`) — **one owner**; AdminCN shell does not nest a second ThemeProvider |

Do not drive Neon Auth pages through AdminCN ThemeCustomizer.
