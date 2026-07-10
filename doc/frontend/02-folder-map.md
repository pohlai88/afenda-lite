# Folder map (L1 / L2)

Target layout after rebuild. Status reflects disk after 2026-07-11 cleanup.

| L1 | Purpose | Keep / rebuild | Notes |
|----|---------|----------------|-------|
| `app/` | App Router: pages, layouts, actions, API | **Keep** | Thin routes only |
| `features/` | Product feature modules (auth, landing, account, trade, portal-chrome) | **Keep / extend** | Primary home for non-AdminCN UI |
| `components-V2/` | AdminCN shell, ui, portal-views | **Keep product paths** | Prune demos — see [06-admincn-alignment.md](06-admincn-alignment.md) |
| `lib/` | Domain, schemas, entry/pages, auth, env, routing | **Keep** | Domain-only SQL |
| `db/` | Migrations | **Keep** | |
| `public/` | Static assets | **Keep `lynx/` only** | Other brand/owl assets removed |
| `proxy.ts` | Next.js 16 request proxy | **Keep** | Not `middleware.ts` |
| `messages/` | i18n message catalogs | **Keep** | Trade locales |
| `e2e/`, `testing/` | Playwright / Vitest | **Keep** | |
| `stories/`, `.storybook/` | Storybook | **Keep** | Dev-only UI review |
| `scripts/` | Ops / checks | **Keep** | |
| `doc/` | This design suite | **Keep** | Replaces deleted `docs/` for rebuild SSOT |
| `components/` | Legacy portal UI dump | **Removed** | Do **not** recreate wholesale |
| `docs/` | Former architecture docs | **Removed** | Content superseded here for FE/API rebuild |
| `assets/` | Former SVG assets | **Removed** | |
| `_reference/` | AdminCN + other kits | **Reference only** | Never import into product runtime |

## `app/` L2

| Path | Role |
|------|------|
| `app/actions/` | Server Actions (`account`, `admin`, `client`, `declarations`, `surveys`, `trade`) |
| `app/api/` | Route Handlers only (`auth`, `health`, `client/declaration-draft`) |
| `app/auth/` | Neon Auth UI routes |
| `app/client/(gate)/` | Client login (and gates) |
| `app/client/(workspace)/` | Client post-login (rebuild target) |
| `app/dashboard/` | Operator AdminCN routes (rebuild target) |
| `app/account/` | Neon AccountView under AdminCN (rebuild target) |
| `app/join/`, `app/invite/`, `app/f/`, `app/survey/` | Join + public/secure links |
| `app/org/login/` | Operator entry alias |
| `app/trade/` | Hot Sales (gated appendix) |
| `app/playground/` | Local UI harness (dev only) |

## `lib/` L2 (product-critical)

| Path | Role |
|------|------|
| `lib/domain/` | Parameterized DB access |
| `lib/schemas/` | Zod boundary schemas |
| `lib/entry/`, `lib/pages/` | Page runners / entry orchestration |
| `lib/auth/` | Neon Auth server helpers |
| `lib/routing/` | Hrefs, nav contracts, path helpers |
| `lib/env/` | Typed env accessors |
| `lib/copy/` | Portal copy |

## `features/` L2

| Path | Role |
|------|------|
| `features/auth/` | Studio login shell + Neon forms |
| `features/landing/` | Lynx landing |
| `features/account/` | Account section chrome |
| `features/operator/` | Operator leaf widgets migrated from deleted `components/` |
| `features/portal-chrome/` | Shared chrome helpers |
| `features/trade/` | Trade UI feature module |

## `components-V2/` L2

| Path | Role |
|------|------|
| `platform-components/` | Layout, Providers, `ui/*` |
| `platform-config/` | `navConfig`, `themeConfig` |
| `platform-views/portal-views/` | **Product** operator screens |
| `platform-views/apps|forms|datatables|pages/` | Demo gallery — **prune candidates** |
| `platform-fake-db/` | Demo data — **do not use for product** |
