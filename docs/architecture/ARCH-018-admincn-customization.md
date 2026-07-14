# ARCH-018 AdminCN Customization

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-018     |
| **Category**      | Architecture |
| **Version**       | 1.1.4        |
| **Status**        | Living     |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Define Living AdminCN / Studio customization levers and promotion rules.

---

# 2. Scope

## 2.1 In Scope

- Shared shell constraints
- Customization levers
- Studio promotion and forbidden reopen items

## 2.2 Out of Scope

- Template keep/drop map (ARCH-015)
- Per-screen preflight checklist (ARCH-019)
- Route catalogue
- Recovering Collapse-era repo-root `app/`/`modules/`/`features/`/`components-V2/` from git (contamination ban — [ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. AdminCN Customization

**Frontend alignment:** [ARCH-015](ARCH-015-admincn-alignment.md)  
**Preflight before new screens:** [ARCH-019](ARCH-019-admincn-frontend-preflight.md)  
**UI registry (compulsory):** [`.cursor/skills/feed-farm-trade/ui-registry.md`](../../.cursor/skills/feed-farm-trade/ui-registry.md) · [`ui-registry.json`](../../.cursor/skills/feed-farm-trade/ui-registry.json) · skill `/feed-farm-trade`  
**Studio DNA:** temporary CLI/MCP scratch only — do not keep permanent AdminCN trees under `_reference/`  
**Product home (logical):** `components-V2/` shape / Target `apps/web/**` after explicit implement — not recovered Collapse trees  
**Auth island:** `features/auth/` — preserve `app/auth-surface.css` + route-scoped `app/auth/neon-auth-ui.css`

## Critical constraint (validated 2026-07-14)

Studio MCP/CLI does **not** install the AdminCN zip as one unit. It exposes **blocks** under `dashboard-and-application` (`@ss-blocks/*`). No AdminCN zip kit is retained under `_reference/` in this checkout.

**CLI name trap:** install `chart-component-*` / `widget-component-*` (singular) — not `charts-component` / `widgets-component`. Pro variants (e.g. `statistics-component-03`) require a working Studio Pro license; use license-accessible `statistics-component-01` until unlocked.

**Compulsory:** every AdminCN UI primitive (`ACN-UI-*`) and platform-views block (`ACN-BLK-*`) must be registered in `ui-registry.json` (HITL). Feed Farm Trade product modules use `FFT-UI-*`. Agents must not invent IDs or edit the registry to pass Vitest. Direct `platform-views` imports from `features/fft` are forbidden — wrap via HITL product ID.

Do **not** wire more demo views into product routes while freeze holds. Refine existing surfaces only. **Exception ([ARCH-023](ARCH-023-multi-tenancy.md)):** adopt Roles/Permissions DNA into `features/organization-admin` on `/dashboard/roles` and `/dashboard/permissions` — do not mount zustand `use-roles-store` as product IAM.

## Shared shell (2026-07-11)

`AdminCnShell` hosts SaaS-style modules:

| Module | Routes | Gate |
|--------|--------|------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` |
| Feed Farm Trade | `/fft/*` | `requireFftAccess` |

Product purpose: B2B feed & farm trade sales ([FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md)).
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

Allowed (shell already landed): shared AdminCN on `/fft/*` with Feed Farm Trade permission gate. FFT product UI restore requires an explicit reopen — hold route disposition per [ARCH-012](ARCH-012-app-router-routes.md); do not invent product surfaces to fill gaps.

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

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.1.4 | 2026-07-14 | Drop “thin stub until UI restore”; hold ARCH-012 disposition + explicit reopen only. |
| 1.1.3 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.2 | 2026-07-14 | Removed AdminCN 1.0.0 archive kit; DNA remains Studio CLI/MCP scratch-only. |
| 1.1.1 | 2026-07-14 | Dropped permanent Studio lock tree; DNA remains scratch-only under `_reference/archive/` for the zip. |
| 1.1.0 | 2026-07-14 | Validated Studio freeze + critical constraint; freeze-set CLI names; Pro deny note for statistics-03. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover; Target greenfield via ARCH-028 only. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log; Control State Closed after architecture sync campaign. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` (and wiped Collapse-era ops scripts) are **not present** in this checkout after design-SSOT Collapse (`4680c91`).
- **Forbidden:** recovering those trees from git history (`f014807` / Collapse parents) — contamination of the docs-first checkout. See [ARCH-028](ARCH-028-implementation-slices.md) Anti-contamination lock.
- Paths in this document are a **logical Living map** (shape). When product code is implemented, place it under **Target** roots per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-028](ARCH-028-implementation-slices.md) (`apps/web/**`, `packages/*`) after an **explicit** implement request — never as a restore of banned repo-root trees.
- Phrases such as “on disk”, “live adapters”, or “relocate complete” describe the intended shape when a Target product tree exists; they are **not** a claim that Collapse-era files may be recovered.
