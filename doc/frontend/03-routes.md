# App Router routes (by journey phase)

Target route map. Columns: path, page file, layout group, special files, proxy gate, owner.

**Legend**

- **Proxy:** matched by [`proxy.ts`](../../proxy.ts) session gate  
- **loading / error:** required on authenticated product segments after rebuild  
- **Status:** `live` = product composition is wired; `placeholder` = route file
  exists but only exposes wipe/holding UI; `rebuild` = route needs restoration.
  File presence alone is not evidence of product completeness.

## Pre-login (live)

| Path | Page | Layout | loading | error | Proxy | Owner |
|------|------|--------|---------|-------|-------|-------|
| `/` | `app/page.tsx` | root | optional | root | no | `features/landing` |
| `/auth/[path]` | `app/auth/[path]/page.tsx` | root | yes | yes | no | `features/auth` |
| `/auth/admin` | `app/auth/admin/page.tsx` | root | yes | — | no | `features/auth` / entry |
| `/org/login` | `app/org/login/page.tsx` | root | yes | — | no | `lib/entry` org sign-in |
| `/client/login` | `app/client/(gate)/login/page.tsx` | `(gate)` | yes | — | no* | `features/auth` / client entry |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | root | yes | — | no | `lib/entry` legacy invite |
| `/f/[token]` | `app/f/[token]/page.tsx` | root | yes | — | no | share access |
| `/survey/[slug]` | `app/survey/[slug]/page.tsx` | root | yes | — | no | open link |

\* `/client/*` is in the proxy matcher; `/client/login` is explicitly bypassed in `proxy.ts`.

## Join

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/join` | `app/join/page.tsx` | root | yes | yes | no | `features/auth` invitation join | placeholder |

## Onboarding + client post-login

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/client/onboarding` | `app/client/(workspace)/onboarding/page.tsx` | workspace | yes | yes | yes | `features/client-workspace` (TBD) or portal-views | placeholder · scope closed |
| `/client` | `app/client/(workspace)/page.tsx` | workspace | yes | yes | yes | client home | placeholder · scope closed |
| `/client/profile` | `app/client/(workspace)/profile/page.tsx` | workspace | yes | yes | yes | profile | placeholder · scope closed |
| `/client/declare/[id]` | `app/client/(workspace)/declare/[id]/page.tsx` | workspace | yes | yes | yes | declare form | placeholder · scope closed |
| `/client/preview-unavailable` | `app/client/(gate)/preview-unavailable/page.tsx` | gate | yes | — | bypass | preview gate | placeholder · scope closed |

## Operator post-login

Shared AdminCN shell (`AdminCnShell`). Layout gate: **authenticated member** (`requireMemberSession`) — Declarations module is open to every org member. Organization admin is a separate gate for admin-route nav and mutating actions (`requireAdminSession`), not the Declarations module entry.

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/dashboard` | `app/dashboard/page.tsx` | dashboard AdminCN | yes | yes | yes | `portal-views/operator-declarations-dashboard` | live |
| `/dashboard/clients` | `app/dashboard/clients/page.tsx` | dashboard | yes | yes | yes | `portal-views/operator-clients-list` | live |
| `/dashboard/[id]` | `app/dashboard/[id]/page.tsx` | dashboard | yes | yes | yes | `portal-views/operator-declaration-detail` | live |

## Account

Same AdminCN shell as dashboard. Layout gate: `requireMemberSession`.

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/account` | `app/account/page.tsx` | account AdminCN | yes | yes | yes | `features/account` | placeholder |
| `/account/[path]` | `app/account/[path]/page.tsx` | account | yes | yes | yes | Neon AccountView wrapper | placeholder |

## Public API (Route Handlers — not pages)

| Path | File | Role |
|------|------|------|
| `/api/health/liveness` | `app/api/health/liveness/route.ts` | Liveness |
| `/api/health/readiness` | `app/api/health/readiness/route.ts` | Readiness |
| `/api/auth/[...path]` | `app/api/auth/[...path]/route.ts` | Neon Auth proxy |
| `/api/client/declaration-draft` | `app/api/client/declaration-draft/route.ts` | Draft autosave XHR |

Never place `route.ts` beside a `page.tsx` in the same segment.

## Playground (dev only)

| Path | Role | Proxy | Status |
|------|------|-------|--------|
| `/playground` | Harness index | yes | live / local-only |
| `/playground/[screenId]` | Screen iframe host | yes | live |
| `/playground/coverage` | Route coverage | yes | live |
| `/playground/hitl-review` | Source-backed HITL route review | yes | live |

Gated by `PLAYGROUND_ENABLED`. Not a client product surface.
Curated route bindings live in `lib/playground/playground-registry.ts`;
`npm run check:playground` enforces route, review-definition, evidence, and E2E
fixture parity.

HITL route review keeps two facts separate: **Expected from source** is the
registered fixture contract backed by route/entry files; **Human verdict** is
the locally stored runtime observation. Notes and copied repair prompts never
mark a route verified.

## Hot Sales / Feed Farm Trade (gated appendix)

**Product purpose:** B2B **feed & farm trade sales** for 3F operators (feedmills, farmers, Feed · Farm · Food) — see [adr/001-feed-farm-trade.md](adr/001-feed-farm-trade.md). Downstream **customer portal** is a future series branch. Architecture: [adr/001A-feed-farm-trade-architecture.md](adr/001A-feed-farm-trade-architecture.md). Roadmap: [adr/001R-feed-farm-trade-roadmap.md](adr/001R-feed-farm-trade-roadmap.md).
**Shell id:** `feed-farm-trade`. Same AdminCN shell as Declarations. Layout gate: **Feed Farm Trade permission** (`requireTradeAccess` — allowlist / HS RBAC). Organization admin alone does **not** unlock `/trade`. Locale URL segment removed (i18n deferred to action arg); paths are flat under `/trade/*`.

Sidebar entitlement: `modules/platform/shell/access.ts` (`declarations` for all members; `feed-farm-trade` only with permission).

| Path pattern | Role | Proxy | Status |
|--------------|------|-------|--------|
| `/trade` | Redirect → `/trade/events` | yes | live (shell) |
| `/trade/events` | Sales events list | yes | P1 wired |
| `/trade/events/[eventId]/order` | Order | yes | P1 wired |
| `/trade/my-orders` | My orders (+ transfer / complete) | yes | P1 wired |
| `/trade/admin/events` | Admin events | yes | P1 wired |
| `/trade/admin/events/new` | Create event | yes | P1 wired |
| `/trade/admin/events/[eventId]/setup` | Setup (+ supply / fields / priority / audit / export) | yes | P1 wired |
| `/trade/admin/events/[eventId]/allocation` | Allocation | yes | P1 wired |
| `/trade/admin/rbac` | RBAC / sales-member | yes | P1 wired |
| `/trade/admin/events/[eventId]/deposits` | Deposits | yes | P3 placeholder · flag-gated |
| `/trade/admin/events/[eventId]/imports` | Imports | yes | P3 placeholder · flag-gated |
| `/trade/admin/events/[eventId]/pickup` | Pickup | yes | P3 placeholder · flag-gated |
| `/trade/admin/erp-sync` | ERP sync | yes | P3 placeholder · flag-gated |

Promotion and flags: follow Hot Sales [gate-register](../../docs/hot-sales/ops/gate-register.md) — not this doc. Do **not** restore a separate `TradeShell` / locale switcher; chrome is AdminCN only.

## Proxy matcher (authoritative)

From `proxy.ts`:

- Matched: `/account/*`, `/dashboard/*`, `/client/*`, `/trade/*`, `/playground/*`
- Public (not matched): `/`, `/auth/*`, `/join`, `/org/login`, `/invite/*`, `/api/*`, `/survey/*`, `/f/*`
- Bypasses inside matcher: `?embed=1`, client login, preview-unavailable, `next-action` header
