# S1 — Auth and session boundary

| Field | Value |
|-------|-------|
| **Status** | shipped (hardening: client route middleware) |
| **Sequence** | 2 |
| **Depends on** | S0, Neon Auth trusted domains |
| **Feeds into** | S3–S8, all authenticated slices |

## Purpose

Neon Auth sessions with operator vs client separation.

## Inputs / outputs

- **Inputs:** `NEON_AUTH_*`, cookies, form credentials
- **Outputs:** Session user, redirects, sign-out on access denied

## Owned files

- `lib/auth/server.ts` — Neon Auth server instance (`createNeonAuth`)
- `lib/auth/client.ts` — browser auth client (`createAuthClient`)
- `lib/auth/env.ts` — `NEON_AUTH_*` probe/read helpers (shared with S9 readiness)
- `lib/auth/get-session.ts` — request-scoped cached session lookup
- `lib/auth/session.ts` — `requireAdminSession`, `requireClientSession`, operator sign-in rejection
- `lib/auth/bootstrap-client-invite.ts` — post-auth profile + invitation linking
- `lib/auth/types.ts` — shared session/bootstrap types
- `lib/admin.ts`, `lib/org-sign-in-entry.ts`
- `app/actions/admin.ts` — operator sign-in actions (re-exports `requireAdminSession`)
- `app/actions/client.ts` — client mutations (re-exports `requireClientSession`)
- `app/api/auth/[...path]/route.ts`
- `app/org/login/page.tsx`, `app/auth/admin/page.tsx` (legacy alias)
- `app/client/(gate)/login/page.tsx`, `app/page.tsx` (client session routers)
- `proxy.ts`

**Proxy matcher (2026-07):** `/`, `/account/:path*`, `/dashboard/:path*`, `/client/:path*`, `/playground/:path*`

**Proxy bypass (no Neon session required):** `?embed=1` on any matched route; `/client/preview-unavailable` (gate route for preview sandbox messaging)

**Public routes (outside proxy):** `/auth/*`, `/org/login`, `/invite/*`, `/api/auth/*`, `/api/health/*`, `/survey/*`, `/f/*` (page handlers redirect with `returnTo` + reason)

**Playground (`/playground`):** local developer UI review only (`PLAYGROUND_ENABLED` in `env.config`). Not a client or operator product route. See `AGENTS.md`.

## Critical control points

- `requireAdminSession()` before operator mutations
- `requireClientSession()` before client mutations
- `auth.signOut()` when non-operator hits operator login

## Failure modes

- `SHARED_ADMIN_EMAIL` misconfigured → no operator access
- Client routes rely on page self-guard (middleware partial)

## Required tests

- `lib/auth/env.test.ts` — Neon Auth env probe/read + JWKS URL builder
- `lib/auth/bootstrap-client-invite.test.ts` — invitation metadata/email resolution
- Operator sign-in success and failure
- Client session dispatch at `/` and `/client/login`
- Non-operator rejected at org login
- Client cannot invoke `/dashboard` actions

## Acceptance proof

- [ ] Operator: `/org/login` → `/auth/sign-in?from=org` → `/dashboard` (or `returnTo` when provided)
- [ ] Client: `/client/login` or `/` → `/client` or `/client/onboarding`
- [ ] Unauthorized operator: `/org/login?reason=access-denied`
- [ ] Client session scoped to client routes only

## Rollback

Revert auth env vars; disable trusted domain if misconfigured.

## Drift risk

Bypassing `requireAdminSession` in new actions.
