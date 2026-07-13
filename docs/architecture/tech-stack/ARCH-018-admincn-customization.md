# ARCH-018 AdminCN Customization

| Field | Value |
|-------|-------|
| ID | ARCH-018 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Frontend |
| Updated | 2026-07-13 |

**Frontend alignment:** [ARCH-015](../frontend/ARCH-015-admincn-alignment.md)  
**Preflight before new screens:** [ARCH-019](ARCH-019-admincn-frontend-preflight.md)  
**UI registry (compulsory):** [`.cursor/skills/feed-farm-trade/ui-registry.md`](../../../.cursor/skills/feed-farm-trade/ui-registry.md) · [`ui-registry.json`](../../../.cursor/skills/feed-farm-trade/ui-registry.json) · skill `/feed-farm-trade`  
**Product home:** `components-V2/`  
**Auth island:** `features/auth/` — preserve `app/auth-surface.css` + route-scoped `app/auth/neon-auth-ui.css`

## Critical constraint

Studio MCP does **not** install the AdminCN template as one unit. It exposes **blocks** under `dashboard-and-application`. The full template already lives in `components-V2/`.

**Compulsory:** every AdminCN UI primitive (`ACN-UI-*`) and platform-views block (`ACN-BLK-*`) must be registered in `ui-registry.json`. Feed Farm Trade product modules use `FFT-UI-*`. Agents must not invent IDs or edit the registry to pass Vitest. Direct `platform-views` imports from `features/fft` are forbidden — wrap via HITL product ID.

Do **not** wire more demo views into product routes while freeze holds. Refine existing surfaces only. **Exception (ADR-002):** adopt Roles/Permissions DNA into `features/organization-admin` on `/dashboard/roles` and `/dashboard/permissions` — do not mount zustand `use-roles-store` as product IAM.

## Shared shell (2026-07-11)

`AdminCnShell` hosts SaaS-style modules:

| Module | Routes | Gate |
|--------|--------|------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` |
| Feed Farm Trade | `/fft/*` | `requireFftAccess` |

Product purpose: B2B feed & farm trade sales ([FFT-MOD-001](../../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md)).
| Admin routes | playground (local), future org-admin links | `isAdminSession` |

Nav is filtered by `features/portal-chrome/resolve-shell-access.ts` via `navConfig` `kind` + `moduleId`.

## Customization levers (in order)

| Lever | Edit | Do not |
|-------|------|--------|
| Theme / branding | `components-V2/platform-config/themeConfig.ts` + presets + Header ThemeCustomizer | Put portal navy into AdminCN `:root` |
| Dark mode | Root `features/portal-chrome/theme-provider` | Nest a second ThemeProvider inside AdminCN shell |
| Navigation | `components-V2/platform-config/navConfig.tsx` (module-tagged) | Hardcode nav in layout JSX; resurrect `FftShell` |
| Screen content | `components-V2/platform-views/portal-views/*` or `features/organization-admin/*` (thin `app/**/page.tsx`) | Grow route files |
| Studio block adapt | Flatten into owning feature (role-named file) | Keep `shadcn-studio/blocks/...` nesting in product |
| Data | Domain + `app/actions/*` | Invent UI before data contract; use `platform-fake-db` |
| Auth island | Studio shell + Neon + auth CSS | Theme login via AdminCN customizer; import Neon CSS into `globals.css` |

**Cookie caveat:** `settingsCookieName` overrides `themeConfig`. Reset ThemeCustomizer or clear the cookie to see config changes.

**CSS split:** AdminCN tokens → `app/globals.css`. Login island → `app/auth-surface.css`. Neon Auth UI → `app/auth/neon-auth-ui.css` (auth layout only).

## Studio block promotion

MCP install paths (`components/shadcn-studio/`, `features/*/shadcn-studio/blocks/`) are **scratch only**. Promote into:

| Owner | Target |
|-------|--------|
| Org-admin Declarations leaf | `features/organization-admin/<role>.tsx` |
| Platform portal-views | `components-V2/platform-views/portal-views/` |
| FFT product | `features/fft/fft-*.tsx` + HITL `FFT-UI-*` |

**Live (2026-07-12):** `form-layout-section.tsx`, `statistics-card.tsx` under `features/organization-admin/`.

## Official Studio order

1. Review shell / routes  
2. Brand + `themeConfig` + nav  
3. Replace fake-db with APIs / domain  
4. Prune unused demos  
5. Promote any MCP scratch install out of `shadcn-studio/` nesting  

## Forbidden without explicit reopen

- Bulk-wiring more AdminCN demos into product routes  
- Restoring Feed Farm Trade **product UI** under a separate shell (`FftShell`, locale switcher)  
- Replacing Neon credential paths with Studio account-settings blocks  
- Mixing portal auth tokens into AdminCN `:root`  
- Enabling Feed Farm Trade prod flags without gate-register  
- Inventing `ACN-*` / `FFT-UI-*` IDs or agent-editing `ui-registry.json` to pass tests  
- Importing `@/components-V2/platform-views/**` from `features/fft` without HITL product wrap  
- Recreating `components/shadcn-studio/` or `features/*/shadcn-studio/blocks/` as product homes  

Allowed (shell already landed): shared AdminCN on `/fft/*` with Feed Farm Trade permission gate; thin stubs until UI restore is reopened.

## Refine checklist (per page)

Full gate: [admincn-frontend-preflight.md](ARCH-019-admincn-frontend-preflight.md).

1. Confirm registry IDs (`ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*`) — HITL if missing  
2. Brand (`themePreset` / tokens) — login island unchanged  
3. Nav — real destinations only; module entitlements correct  
4. Edit one `portal-views` composition (or trade feature with approved `FFT-UI-*`)  
5. Swap fake-db for that page  
6. Sync governance if surface IDs change (include **ui-registry**)  
7. Promote MCP scratch → feature / portal-views; delete install-path residue  
8. Verify: `npm run test:unit -- features/fft/ui-registry` + relevant unit tests + `npx tsc --noEmit` on touched paths  
