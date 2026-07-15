---
name: admincn-customization
description: Customizes the landed AdminCN shell in components-V2 via themeConfig, navConfig, platform-views, and Shadcn Studio MCP blocks. Use when refining AdminCN dashboards, theme presets, sidebar nav, Studio blocks (application-shell, charts, account-settings), or when the user mentions AdminCN, ThemeCustomizer, or components-V2 customization.
---

# AdminCN customization

**UI handoff gate (compulsory before human handoff):** [afenda-elite-ui-handoff](../afenda-elite-ui-handoff/SKILL.md) — no handroll · no UX drift · Chrome DevTools evidence required.

**SSOT playbook:** [docs/architecture/ARCH-018-admincn-customization.md](../../../docs/architecture/ARCH-018-admincn-customization.md)  
**Frontend preflight (before new screens):** [docs/architecture/ARCH-019-admincn-frontend-preflight.md](../../../docs/architecture/ARCH-019-admincn-frontend-preflight.md)  
**Alignment:** [docs/architecture/ARCH-015-admincn-alignment.md](../../../docs/architecture/ARCH-015-admincn-alignment.md)  
**UI registry (compulsory IDs):** [../feed-farm-trade/ui-registry.md](../feed-farm-trade/ui-registry.md) · [../feed-farm-trade/ui-registry.json](../feed-farm-trade/ui-registry.json) · skill `/feed-farm-trade` · `npm run check:fft-ui-registry`  
**Studio DNA:** temporary CLI/MCP scratch **or** user-approved gitignored `_reference/archive/<kit>` promote into Target packages — never product `import` from `_reference/**`; do not keep permanent AdminCN lock trees under `_reference/studio-admincn-lock/`  
**Product home (logical):** `components-V2/` shape / Target after implement — not Collapse recover  
**Auth island:** `features/auth/` — preserve `app/auth-surface.css` + route-scoped `app/auth/neon-auth-ui.css`

## Critical constraint

Studio MCP/CLI does **not** install the AdminCN zip as one unit. It exposes **blocks** under `dashboard-and-application` (shells, charts, widgets, account-settings, form-layout, empty-state, …). Permanent **studio-admincn-lock** kits are not retained. User-named local `_reference/archive/` may exist for promote-only DNA (e.g. S5.1 `@afenda/ui`) — never a runtime dependency.

**Every AdminCN primitive and block must appear in `ui-registry.json`** as `ACN-UI-*` or `ACN-BLK-*`. Agents must not invent IDs. Product FFT surfaces use `FFT-UI-*`. See registry HITL before creating or wiring UI.

Do **not** wire more demo views into product routes while freeze holds. Refine existing surfaces only. **Exception (ADR-002):** Roles/Permissions → `features/organization-admin` on `/dashboard/roles` + `/dashboard/permissions` (no zustand product IAM). Do **not** import `platform-views` from `features/fft` — adapt via HITL product `FFT-UI-*` that cites `studioSource`.

## Shared shell modules

| Module | Routes | Gate |
|--------|--------|------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` |
| Feed Farm Trade | `/fft/*` | `requireFftAccess` |
| Admin routes | playground (local), etc. | `isAdminSession` |

Entitlements: `features/portal-chrome/resolve-shell-access.ts`. Nav: module-tagged `navConfig`. No separate `FftShell`.

## Customization levers (in order)

| Lever | Edit | Do not |
|-------|------|--------|
| Theme / branding | `components-V2/platform-config/themeConfig.ts` + presets + Header ThemeCustomizer | Put portal navy into AdminCN `:root` |
| Dark mode | Root `features/portal-chrome/theme-provider` (next-themes + portal storage key) | Nest a second ThemeProvider inside AdminCN shell |
| Navigation | `components-V2/platform-config/navConfig.tsx` (module-tagged) | Hardcode nav in layout JSX; resurrect FftShell |
| Screen content | `components-V2/platform-views/*` or `features/organization-admin/*` (thin `app/**/page.tsx`) | Grow route files |
| Studio block adapt | Flatten into owning feature (e.g. `features/organization-admin/form-layout-section.tsx`) | Keep `shadcn-studio/blocks/...` marketplace path nesting in product |
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
| Stage MCP install (scratch only) | create-ui: collect → `get_add_command_for_items` → then **promote** out of install path |
| Theme generator | `install-theme` (**/rui only**) — prefer local presets first |

### Studio block promotion (compulsory)

MCP installs may land under a temporary kit path. **Product code must not keep** `components/shadcn-studio/` or `features/*/shadcn-studio/blocks/...`.

| After MCP | Do |
|-----------|-----|
| Declarations / org-admin leaf | Flatten to `features/organization-admin/<role>.tsx` (e.g. `form-layout-section.tsx`, `statistics-card.tsx`) |
| Shell / portal-views DNA | Adapt into `components-V2/platform-views/portal-views/` or `platform-components/` |
| FFT product surface | Adapt into `features/fft/fft-*.tsx` with HITL `FFT-UI-*` |
| Provenance | One-line file comment (`Adapted from Studio form-layout-02`) — not marketplace folder nesting |

**Live product shells (2026-07-12):**

- `features/organization-admin/form-layout-section.tsx` ← Studio form-layout-02  
- `features/organization-admin/statistics-card.tsx` ← Studio statistics-component-03  

### Studio block LOCK (freeze SSOT)

Harness files removed 2026-07-15 — keep the freeze **here** (and in `afenda-elite-design-system`); do not recreate `features/playground/block-selection-matrix*`.

**Next open Studio target:** `afenda-collection` — registry `/dashboard-and-application/application-shell/registry` · seed `application-shell-01` (LOCK; reuse promoted layout/shared; no reinstall). First primitive: Accordion → gateway when ordered. Details: [afenda-elite-design-system](../afenda-elite-design-system/SKILL.md) § Next open.

**LOCK (default `/cui` / `/studio base`):** `application-shell-01` · `dashboard-dropdown-02` · `dashboard-dropdown-12` · `dashboard-dialog-20`  
**DEFER:** form-layout / empty-state / chart-component-* / statistics / widget-component-* (named slice only)  
**REJECT:** marketing login/forgot/reset · account-settings as product auth (Neon island)

## Forbidden without explicit reopen

- Bulk-wiring more AdminCN demos into product routes  
- Restoring Feed Farm Trade **product UI** (stubs OK; no `FftShell` / locale switcher)  
- Replacing Neon credential paths with Studio account-settings blocks  
- Mixing portal auth tokens into AdminCN `:root`  
- Inventing UI IDs or agent-editing [`ui-registry.json`](../feed-farm-trade/ui-registry.json) to pass Vitest  
- Importing `@/components-V2/platform-views/**` from `features/fft` without a HITL `FFT-UI-*` wrap  
- Recreating `components/shadcn-studio/` or nesting `features/*/shadcn-studio/blocks/` as product homes  
- Handrolling `apps/web/features/playground` or `apps/web/app/playground` — DNA in via **Shadcn Studio MCP** only  

## Next harness + Cursor Canvas

| Surface | Role |
|---------|------|
| `@afenda/ui/playground` | Package gateway — sole runtime import door (unchanged) |
| `/playground` Next routes | **Removed** — any future harness must arrive via Studio MCP install + promote |
| Cursor Canvas `*.canvas.tsx` | Singleshot **brief only** — import **only** `cursor/canvas`; never `@afenda/ui` |

**Agent rule:** do not claim Canvas can render AdminCN. Do not invent lab-registry / compose boards. Studio block pick SSOT = LOCK/DEFER/REJECT above.

## Refine checklist (per page)

Full gate: [ARCH-019](../../../docs/architecture/ARCH-019-admincn-frontend-preflight.md).

1. Confirm target `ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*` IDs in [ui-registry.json](../feed-farm-trade/ui-registry.json) — **STOP** if missing (human HITL)  
2. Brand (`themePreset` / tokens) — verify login island unchanged  
3. Nav — real destinations only; module entitlements correct  
4. Edit one `platform-views` composition (product → `portal-views/` or FFT `features/fft` via product ID)  
5. Swap fake-db for that page  
6. Sync governance (LOCK/DEFER/REJECT above, reliance registry, **ui-registry**) — retired name: `ui-decision-matrix`  
7. Optional: one MCP block (LOCK-scored) → **promote** into `packages/design-system` layers / owning feature / FFT feature (new `FFT-UI-*` if FFT); delete install-path residue  
8. Verify: `npm run test:unit -- features/fft/ui-registry` + relevant unit tests + `npx tsc --noEmit` on touched paths  
