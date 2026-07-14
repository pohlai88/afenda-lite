# ARCH-015 Shadcn Studio / AdminCN Alignment

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-015     |
| **Category**      | Architecture |
| **Version**       | 2.0.1        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Define Living **Shadcn Studio** DNA rules for the operator shell: how `@ss-blocks/*` blocks become product homes, what never ships, and the hard auth-island split from Neon Auth.

**AdminCN** names the product shell pattern (layout, nav, portal-views). **Shadcn Studio** is the only DNA source — not a retained AdminCN zip under `_reference/`.

---

# 2. Scope

## 2.1 In Scope

- Studio DNA install → promote → registry gate
- Product keep homes vs demo ban list
- Shell modules (Declarations / FFT) in one AdminCN chrome
- Auth island hard split
- Customization order (promotion steps)

## 2.2 Out of Scope

- Folder homes SSOT ([ARCH-017](ARCH-017-frontend-folder-map.md))
- Studio lever playbook ([ARCH-018](ARCH-018-admincn-customization.md))
- Per-screen preflight ([ARCH-019](ARCH-019-admincn-frontend-preflight.md))
- Route catalogue ([ARCH-012](ARCH-012-app-router-routes.md))
- Recovering Collapse-era product trees ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Shadcn Studio / AdminCN Alignment

**Audience:** Frontend implementing Target `apps/web/**` shell UI.  
**Posture:** Logical Living map — Collapse trees absent; implement under Target after explicit ARCH-028 request.

### DNA law (binding)

| Rule | Detail |
|------|--------|
| Source | Shadcn Studio CLI/MCP `@ss-blocks/*` under `dashboard-and-application` (and related Studio categories as approved) |
| Install | **Temporary scratch cwd only** — promote immediately into product homes |
| Not retained | AdminCN full-zip kits, permanent `_reference/studio-admincn-lock/`, nested `shadcn-studio/blocks/**` in the product tree |
| Registry | Every DNA block/primitive used in product must carry `ACN-UI-*` / `ACN-BLK-*` (HITL). FFT product modules use `FFT-UI-*`. Layer B (`dna` / `surfaces` / `requiredBlockId`) — [ui-registry](../../.cursor/skills/feed-farm-trade/ui-registry.md) |
| Shell | One AdminCN-pattern shell for Declarations, Account, FFT — **not** FftShell / locale chrome |

**Critical constraint:** Studio MCP/CLI does **not** install a whole AdminCN zip as one unit — **blocks only**.

**Playbook / preflight / homes:** [ARCH-018](ARCH-018-admincn-customization.md) · [ARCH-019](ARCH-019-admincn-frontend-preflight.md) · [ARCH-017](ARCH-017-frontend-folder-map.md) · skill `/admincn-customization`.

## Studio concept → product home

| Studio / AdminCN concept | Product home (logical) | Use |
|--------------------------|------------------------|-----|
| Layout, Providers, `ui/*` | `components-V2/platform-components/` (`AdminCnShell`) | Shell + primitives |
| Nav / theme | `components-V2/platform-config/` | `navConfig`, `themeConfig` |
| Operator product screens | `platform-views/portal-views/` | Declarations / users / clients / detail |
| Stats / charts / widgets atoms | `platform-views/dashboards/{statistics,charts,widgets}` | Only when composed by portal-views |
| Roles / permissions DNA | Promote → `features/organization-admin/` | Never ship demo `apps/{roles,permissions}` routes |
| Shell routes `(pages)` | `app/dashboard/*`, `app/account/*`, `app/fft/*` | AdminCN shell families |
| Blank auth demos | **Do not copy** | `features/auth` + Neon Auth island |
| fake-db / mail / chat / kanban / calendar / contact | **Ban for product** | DNA study only, then drop |
| Gallery forms / datatables / unused dashboards | Extract pattern → portal-views / features, then **prune** |

## Keep (product)

- `platform-components/` — layout, `ui`, Providers, `AdminCnShell`  
- `platform-config/` — module-tagged `navConfig`, `themeConfig`  
- `platform-views/portal-views/` — operator product screens  
- Optional dashboard atoms under `dashboards/{statistics,charts,widgets}` when composed by portal-views  
- `features/portal-chrome/` — shell access + **one** theme owner  
- `features/organization-admin/` — promoted Studio leaves (roles/permissions shells, form-layout, statistics-card)  
- `features/fft/` — FFT panels under the shared shell  

## Drop / never wire

- `platform-fake-db/`  
- Demo apps under `platform-views/apps/{mail,chat,kanban,calendar,contact}`  
- Blank AdminCN auth (login/register/forgot/reset/two-steps)  
- Unused `*-dashboard.tsx` demos  
- Gallery `forms/` / `datatables/` after pattern extraction  
- Separate FFT chrome (`FftShell`, locale switcher)  
- Permanent Studio lock trees under `_reference/`  
- Product imports from scratch `shadcn-studio/` nesting  

**Zustand / demo stores:** DNA study only — never import on product routes. Live users screens = portal-views `organization-admin-users-*` (not demo `apps/users` wired live).

## SaaS modules in one shell

| Module | Routes | Layout gate | Nav `moduleId` |
|--------|--------|-------------|----------------|
| Declarations | `/dashboard/*`, `/account/*` | `requireMemberSession` | `declarations` |
| Feed Farm Trade | `/fft/*` | `requireFftAccess` (`fft.access`) | `fft` |
| Local harness | `/playground/*` | Local-only | `kind: "admin"` where applicable |

FFT purpose and locks: [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md). Org admin alone does **not** unlock `/fft`.

## Customization order

1. Review shell + real routes (ARCH-012)  
2. Brand via `themeConfig` + module-tagged `navConfig`  
3. Replace any fake-db with domain / Actions  
4. Prune demos (ban list)  
5. Promote MCP Studio installs from scratch → `features/` / `portal-views/`  

## Auth island (hard split)

| Concern | Location |
|---------|----------|
| Login / join / OTP | `features/auth`, `app/auth/*`, `app/auth-surface.css` |
| Neon Auth UI CSS | `app/auth/neon-auth-ui.css` via auth layout only |
| Platform chrome theme | AdminCN `themeConfig` + app globals |
| Dark mode (`html.dark`) | Root `features/portal-chrome` theme provider — **one owner**; shell must not nest a second `ThemeProvider` |

Do **not** drive Neon Auth pages through AdminCN ThemeCustomizer.

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-002 | Frontend Architecture | Layer + Mode A/B |
| ARCH-012 | App Router Routes | Shell route families |
| ARCH-017 | Frontend Folder Map | Homes + bans |
| ARCH-018 | AdminCN Customization | Studio levers |
| ARCH-019 | AdminCN Frontend Preflight | Per-screen gate |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Roles / org-admin |
| ARCH-028 | Turborepo Implementation Slices | Anti-contamination |
| FFT-MOD-001 | Feed Farm Trade module architecture | Module locks |

UI registry: `.cursor/skills/feed-farm-trade/ui-registry.md`. Method: `/admincn-customization` · `/afenda-elite-nextjs-best-practice`.

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 2.0.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 2.0.0 | 2026-07-14 | Studio-first rewrite: DNA law; block→home map; ban list; fix SaaS table; drop zip/_reference retention narrative; homes → ARCH-017. |
| 1.1.2 | 2026-07-14 | Removed archived AdminCN 1.0.0 kit from `_reference/`; Studio DNA CLI/MCP scratch-only. |
| 1.1.1 | 2026-07-14 | Removed permanent `_reference/studio-admincn-lock/`. |
| 1.1.0 | 2026-07-14 | Studio `@ss-blocks` freeze validation; blocks ≠ full template. |
| 1.0.3 | 2026-07-14 | Checkout posture / Collapse anti-contamination. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit. |
| 1.0.1 | 2026-07-14 | Prior controlled revision. |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root `app/` / `modules/` / `features/` / `components-V2/` are **absent** after Collapse (`4680c91`).
- **Forbidden:** git recover of those trees — [ARCH-028](ARCH-028-implementation-slices.md).
- Paths are logical; implement under Target `apps/web/**` after explicit request.

### Naming

- Document ID stays **ARCH-015**. Display title: Shadcn Studio / AdminCN Alignment. “AdminCN” = shell pattern; “Studio” = DNA pipeline.
