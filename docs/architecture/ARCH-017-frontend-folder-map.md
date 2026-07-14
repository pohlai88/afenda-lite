# ARCH-017 Frontend Folder Map

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-017     |
| **Category**      | Architecture |
| **Version**       | 2.0.1        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Define the Living **frontend folder homes** for Target product UI under Next.js App Router — **Shadcn Studio / AdminCN DNA** as the only shell source, thin `app/` routes, `features/` product UI, `modules/` domain, and explicit bans on legacy dumps.

**Authority split:** routes → [ARCH-012](ARCH-012-app-router-routes.md); Studio keep/drop → [ARCH-015](ARCH-015-admincn-alignment.md); levers → [ARCH-018](ARCH-018-admincn-customization.md); conventions → [ARCH-016](ARCH-016-next-js-conventions.md); Mode A/B → [ARCH-002](ARCH-002-frontend-architecture.md). Method: `afenda-elite-nextjs-best-practice` · `/admincn-customization`.

---

# 2. Scope

## 2.1 In Scope

- Target L1 folder homes under `apps/web/**` (logical map when the tree is absent)
- Studio → product placement (shell, `ui`, portal-views, `features`)
- Ban list (legacy / Collapse / demo / scratch)
- Thin App Router composition contract (pointers)

## 2.2 Out of Scope

- Route inventory rows (ARCH-012)
- Studio lever playbook / preflight (ARCH-018 / ARCH-019)
- Backend module ownership detail ([ARCH-005](ARCH-005-backend-folder-map.md) / [ARCH-009](ARCH-009-modules-ownership-map.md))
- Package boundaries beyond “place under `apps/web`” ([ARCH-022](ARCH-022-system-overview.md) / [ARCH-024](ARCH-024-package-boundaries.md))
- Recovering Collapse-era repo-root trees from git ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Frontend Folder Map

**Checkout honesty:** repo-root `app/` / `features/` / `modules/` / `components-V2/` are **not present** after Collapse. Paths below are the **logical Living / Target map**. Implement only under Target `apps/web/**` after an explicit implement request — never restore banned Collapse trees.

**Studio DNA (only shell source):** pull `@ss-blocks/*` via Shadcn Studio CLI/MCP into a **temporary scratch cwd**, register IDs (`ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*` per [ui-registry](../../.cursor/skills/feed-farm-trade/ui-registry.md)), then **promote** into product homes. Do **not** keep permanent AdminCN zip kits or `studio-admincn-lock/` under `_reference/`. Do **not** leave product imports under `shadcn-studio/` scratch nesting ([ARCH-015](ARCH-015-admincn-alignment.md)).

## L1 homes (Target `apps/web`)

| L1 | Purpose | Rule |
|----|---------|------|
| `app/` | App Router pages, layouts, `actions/`, `api/` | **Thin only** — compose; no domain SQL / fat JSX |
| `features/` | Product UI: auth island, landing, account, org-admin leaves, fft panels, portal-chrome | Primary home for feature screens and Studio-promoted leaves |
| `components-V2/` | AdminCN / Studio **shell DNA homes** | Product paths only — see L2; demos never wired |
| `modules/` | Domain, schemas, env, auth adapters (runtime SSOT) | Bounded contexts — frontend calls; ownership in backend ARCH |
| `apps/web/proxy.ts` | Next 16 request proxy | Session redirect only — **not** `middleware.ts` |
| `public/` | Static assets | Product art only (e.g. `lynx/`) — no owl/Guardian dumps |
| `messages/` | i18n catalogs when FFT locales need them | Keep with module policy |
| `e2e/`, `testing/` | Playwright / Vitest | Factory SSOT under `testing/` |
| `docs/` | Controlled SSOT | [docs/README.md](../../README.md) |

## Banned (do not recreate)

| Path / pattern | Why |
|----------------|-----|
| Root `components/` dump | Legacy portal UI recycling bin |
| Root `lib/` runners | Relocated to `features/` / `modules/` — no banished growth |
| `stories/`, `.storybook/` | Storybook removed |
| `components-V2/platform-fake-db/` | Demo data — never product |
| `components-V2/platform-views/apps/{mail,chat,kanban,calendar,contact}` | Studio demo apps — DNA only, then prune |
| Gallery `forms/` / `datatables/` / unused `*-dashboard` demos | Extract pattern → `portal-views` / `features`, then drop |
| AdminCN `(blank)` auth demos | Auth stays `features/auth` + Neon — [ARCH-015](ARCH-015-admincn-alignment.md) |
| Permanent `_reference/` AdminCN zip / studio lock trees | Scratch CLI/MCP only |
| Kept `shadcn-studio/blocks/**` in product tree | Promote out on install |
| Collapse git recover of wiped trees | ARCH-028 anti-contamination |

## Studio → product placement

| Studio / AdminCN concept | Product home |
|--------------------------|--------------|
| Layout, Providers, ThemeProvider, `ui/*` | `components-V2/platform-components/` (`AdminCnShell`, primitives) |
| Nav / theme configs | `components-V2/platform-config/` |
| Operator product screens | `components-V2/platform-views/portal-views/` |
| Optional dashboard atoms (stats/charts/widgets) | `platform-views/dashboards/{statistics,charts,widgets}` **only** when composed by portal-views |
| Org-admin Roles/Permissions DNA | Promote to `features/organization-admin/` — not demo `apps/*` routes |
| Auth / join / OTP | `features/auth/` + `app/auth/*` — **never** AdminCN blank auth |
| Landing | `features/landing/` |
| Account chrome | `features/account/` |
| FFT panels | `features/fft/` under AdminCN shell routes |
| Shell entitlement helper | `features/portal-chrome/` |
| MCP scratch install | Temporary cwd → promote into rows above |

**One theme owner:** root portal theme provider — AdminCN shell must not nest a second `ThemeProvider` ([ARCH-015](ARCH-015-admincn-alignment.md)).

## `app/` L2 (thin)

| Path | Role |
|------|------|
| `app/actions/` | Server Actions — authz + Zod **inside** each Action |
| `app/api/` | RH only: health, Neon Auth proxy, draft autosave, external |
| `app/auth/` | Neon Auth island |
| `app/client/(gate)/` | Client login gates |
| `app/client/(workspace)/` | Holding only until explicit reopen (ARCH-012) |
| `app/dashboard/`, `app/account/`, `app/fft/` | AdminCN shell families |
| `app/join/`, `app/invite/`, `app/f/`, `app/survey/` | Join + public/secure links |
| `app/org/login/` | Operator entry alias |
| `app/playground/` | Local developer harness — never prod contract |

Route catalogue SSOT: [ARCH-012](ARCH-012-app-router-routes.md).

## `features/` L2

| Path | Role |
|------|------|
| `features/auth/` | Studio login shell + Neon forms + entry runners |
| `features/landing/` | Pre-login landing |
| `features/account/` | Account section chrome |
| `features/organization-admin/` | Declarations leaf widgets + promoted Studio shells |
| `features/portal-chrome/` | Shared chrome / shell access / theme owner |
| `features/fft/` | Feed Farm Trade UI under AdminCN (no parallel FftShell) |
| `features/playground/` | Local-only review harness |

Colocated `_components/` under a route segment is allowed for route-local composition ([composition](../../.cursor/skills/afenda-elite-nextjs-best-practice/reference/composition.md)).

## `modules/` L2 (frontend call sites)

| Path | Role |
|------|------|
| `modules/platform/` | Env, db helpers, routing, shell entitlements |
| `modules/identity/` | Neon Auth, session, invites, account |
| `modules/declarations/` | Surveys, clients, drafts, evidence |
| `modules/fft/` | FFT domain, auth, schemas, i18n |

Detail ownership: backend folder / modules ARCH packs — not duplicated here.

## `components-V2/` L2 (Studio shell DNA)

| Path | Role |
|------|------|
| `platform-components/` | Layout, Providers, `ui/*`, `AdminCnShell` |
| `platform-config/` | `navConfig`, `themeConfig` |
| `platform-views/portal-views/` | **Product** operator screens |
| `platform-views/dashboards/{statistics,charts,widgets}` | Optional atoms for portal-views only |
| Demo / fake-db trees | **Banned for product routes** — see ban table |

## Composition contract (Elite Next.js)

```text
proxy.ts → layout → thin page.tsx (RSC)
  → features/*  and/or  components-V2/.../portal-views
  → modules/* (reads)  ·  app/actions/* (mutations)
  → app/api/* (webhooks / health / external only)
```

- No self-`fetch('/api')` for first-party RSC reads  
- No mega barrel imports of entire Studio kits — deep imports / `next/dynamic` for heavy widgets  
- Mode A request-time default; `'use cache'` only ADR-008 Phase 2 ([ARCH-002](ARCH-002-frontend-architecture.md))

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-002 | Frontend Architecture | Layer + Mode A/B |
| ARCH-012 | App Router Routes | Route inventory |
| ARCH-015 | AdminCN Alignment | Studio keep/drop |
| ARCH-016 | Next.js Conventions | File/runtime mechanics |
| ARCH-018 | AdminCN Customization | Studio levers |
| ARCH-019 | AdminCN Frontend Preflight | Per-screen gate |
| ARCH-022 | System Overview — Turborepo | Target `apps/web` |
| ARCH-028 | Turborepo Implementation Slices | Anti-contamination |

UI registry: `.cursor/skills/feed-farm-trade/ui-registry.md` · skill `/admincn-customization` · `/afenda-elite-nextjs-best-practice`.

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 2.0.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 2.0.0 | 2026-07-14 | Studio-first rewrite: Target homes; Shadcn Studio DNA → promote; ban legacy `lib/`/`components/`/fake-db/demos/reference kits; remove stale “on disk keep” narrative; Elite composition contract. |
| 1.1.4 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover. |
| 1.1.3 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log. |
| 1.1.2 | 2026-07-14 | Renumber from ARCH-029 to ARCH-017. |
| 1.1.1 | 2026-07-14 | Control State header. |
| 1.1.0 | 2026-07-13 | Renumber from ARCH-023. |
| 1.0.0 | 2026-07-13 | Initial. |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` are **absent** after design-SSOT Collapse (`4680c91`).
- **Forbidden:** recovering those trees from git (`f014807` / Collapse parents) — [ARCH-028](ARCH-028-implementation-slices.md).
- Implement under Target `apps/web/**` / `packages/*` only after an **explicit** implement request.

### Studio focus

- Shell DNA = Shadcn Studio blocks (`@ss-blocks/*`), not a retained AdminCN zip.
- Align keep/drop and promotion with ARCH-015 / ARCH-018 — this map only names **homes**.
