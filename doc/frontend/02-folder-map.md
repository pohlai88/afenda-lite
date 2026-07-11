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
| `scripts/` | Ops / checks | **Keep** | |
| `stories/`, `.storybook/` | Storybook | **Removed** | Do not recreate |
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
| `app/dashboard/` | Declarations module (AdminCN shell, member gate) |
| `app/account/` | Account under same AdminCN shell (member gate) |
| `app/join/`, `app/invite/`, `app/f/`, `app/survey/` | Join + public/secure links |
| `app/org/login/` | Operator entry alias |
| `app/trade/` | Feed Farm Trade module (AdminCN shell, permission gate; locale-free P1 pages) |
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
| `lib/playground/`, `lib/pages/playground/` | Local harness policies and thin page runners |

## `features/` L2

| Path | Role |
|------|------|
| `features/auth/` | Studio login shell + Neon forms |
| `features/landing/` | Lynx landing |
| `features/account/` | Account section chrome |
| `features/operator/` | Operator leaf widgets migrated from deleted `components/` |
| `features/playground/` | Local-only route review, preview, and coverage UI |
| `features/portal-chrome/` | Shared chrome helpers |
| `features/trade/` | Feed Farm Trade UI (P1 forms/panels under AdminCN; no TradeShell) |

## `modules/` L2 (runtime SSOT)

| Path | Role |
|------|------|
| `modules/platform/shell/` | Shared AdminCN entitlements (`resolveShellAccess`) |
| `modules/trade/` | Feed Farm Trade domain, auth, i18n helpers |
| `modules/declarations/` | Declaration domain + copy |
| `modules/identity/` | Session guards (`requireMemberSession`, `requireAdminSession`) |

## `components-V2/` L2

| Path | Role |
|------|------|
| `platform-components/` | Layout, Providers, `ui/*` |
| `platform-config/` | `navConfig`, `themeConfig` |
| `platform-views/portal-views/` | **Product** operator screens |
| `platform-views/apps|forms|datatables|pages/` | Demo gallery — **prune candidates** |
| `platform-fake-db/` | Demo data — **do not use for product** |
