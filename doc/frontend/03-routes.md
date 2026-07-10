# App Router routes (by journey phase)

Target route map. Columns: path, page file, layout group, special files, proxy gate, owner.

**Legend**

- **Proxy:** matched by [`proxy.ts`](../../proxy.ts) session gate  
- **loading / error:** required on authenticated product segments after rebuild  
- **Status:** `live` = page present on disk (2026-07-11); `rebuild` = folder may exist as `.gitkeep` / needs `page.tsx` restored

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
| `/join` | `app/join/page.tsx` | root | yes | yes | no | `features/auth` invitation join | live |

## Onboarding + client post-login

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/client/onboarding` | `app/client/(workspace)/onboarding/page.tsx` | workspace | yes | yes | yes | `features/client-workspace` (TBD) or portal-views | rebuild |
| `/client` | `app/client/(workspace)/page.tsx` | workspace | yes | yes | yes | client home | rebuild |
| `/client/profile` | `app/client/(workspace)/profile/page.tsx` | workspace | yes | yes | yes | profile | rebuild |
| `/client/declare/[id]` | `app/client/(workspace)/declare/[id]/page.tsx` | workspace | yes | yes | yes | declare form | rebuild |
| `/client/preview-unavailable` | `app/client/(gate)/preview-unavailable/page.tsx` | gate | yes | — | bypass | preview gate | rebuild |

## Operator post-login

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/dashboard` | `app/dashboard/page.tsx` | dashboard AdminCN | yes | yes | yes | `portal-views/operator-declarations-dashboard` | live |
| `/dashboard/clients` | `app/dashboard/clients/page.tsx` | dashboard | yes | yes | yes | `portal-views/operator-clients-list` | live |
| `/dashboard/[id]` | `app/dashboard/[id]/page.tsx` | dashboard | yes | yes | yes | `portal-views/operator-declaration-detail` | live |

## Account

| Path | Page | Layout | loading | error | Proxy | Owner | Status |
|------|------|--------|---------|-------|-------|-------|--------|
| `/account` | `app/account/page.tsx` | account AdminCN | yes | yes | yes | `features/account` | live |
| `/account/[path]` | `app/account/[path]/page.tsx` | account | yes | yes | yes | Neon AccountView wrapper | live |

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
| `/playground` | Harness index | yes | rebuild / local-only |
| `/playground/[screenId]` | Screen iframe host | yes | rebuild |
| `/playground/coverage` | Route coverage | yes | rebuild |
| `/playground/hitl-review` | HITL review | yes | rebuild |

Gated by `PLAYGROUND_ENABLED`. Not a client product surface.

## Hot Sales (gated appendix)

| Path pattern | Role | Proxy | Status |
|--------------|------|-------|--------|
| `/trade` | Locale redirect / entry | yes | rebuild |
| `/trade/[locale]/events` | Sales events list | yes | rebuild |
| `/trade/[locale]/events/[id]/order` | Order | yes | rebuild |
| `/trade/[locale]/my-orders` | My orders | yes | rebuild |
| `/trade/[locale]/admin/events` | Admin events | yes | rebuild |
| `/trade/[locale]/admin/events/new` | Create event | yes | rebuild |
| `/trade/[locale]/admin/events/[id]/setup` | Setup | yes | rebuild |
| `/trade/[locale]/admin/events/[id]/allocation` | Allocation | yes | rebuild |
| `/trade/[locale]/admin/events/[id]/deposits` | Deposits | yes | rebuild |
| `/trade/[locale]/admin/events/[id]/imports` | Imports | yes | rebuild |
| `/trade/[locale]/admin/events/[id]/pickup` | Pickup | yes | rebuild |
| `/trade/[locale]/admin/erp-sync` | ERP sync | yes | rebuild |
| `/trade/[locale]/admin/rbac` | RBAC | yes | rebuild |

Promotion and flags: follow Hot Sales gate register (ops) — not this doc.

## Proxy matcher (authoritative)

From `proxy.ts`:

- Matched: `/account/*`, `/dashboard/*`, `/client/*`, `/trade/*`, `/playground/*`
- Public (not matched): `/`, `/auth/*`, `/join`, `/org/login`, `/invite/*`, `/api/*`, `/survey/*`, `/f/*`
- Bypasses inside matcher: `?embed=1`, client login, preview-unavailable, `next-action` header
