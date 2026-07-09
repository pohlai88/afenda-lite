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

### Core (`lib/auth/`)

| Module | Role |
|--------|------|
| `server.ts` | Neon Auth server instance (`createNeonAuth`) |
| `client.ts` | Browser auth client + `signOutToAuthEntry` |
| `env.ts` | `NEON_AUTH_*` probe/read (shared with S9 readiness) |
| `get-session.ts` | Request-scoped cached `auth.getSession()` |
| `session.ts` | `requireAdminSession`, `requireClientSession`, `guardClientSession`, `rejectNonOperatorSignIn` |
| `bootstrap-client-invite.ts` | Post-auth profile + invitation linking |
| `types.ts` | `AuthSession`, `BootstrapClientAuthInput` |
| `auth-entry-params.ts` | Ingress `reason` / `from` params + notice copy |
| `auth-page-trust.ts` | Guardian/portal trust notice flags |
| `auth-page-notices.tsx` | Trust notice UI above Neon AuthView |
| `auth-form-intro-visibility.ts` | Form intro visibility by auth path |
| `neon-auth-request.ts` | Server-side Neon fetch with `APP_URL` Origin (org invites) |
| `neon-auth.manifest.ts` | Manifest types + sync helpers |
| `neon-auth-ui.config.ts` | NeonAuthUIProvider defaults from manifest SSOT |
| `neon-auth-ui-base-url.ts` | Client origin for reset/OAuth callbacks |
| `neon-auth-oauth.ts` | Social providers from manifest |
| `admin.ts` | Neon Auth **Admin API** wrappers (not operator session guards) |
| `guardian-auth-shell.ts` | SPEC-B Guardian shell feature flag |
| `guardian-neon-state.ts` | Guardian cinematic state from Neon DOM signals |

### Adjunct (S1 consumers outside `lib/auth/`)

| Module | Role |
|--------|------|
| `lib/admin.ts` | `isAdminSession`, `SHARED_ADMIN_EMAIL` operator check |
| `lib/client-session.ts` | Client authenticated session types + onboarding href |
| `lib/portal-session-routing.ts` | Post-auth landing for `/`, `/client/login`, `/org/login` |
| `lib/account-session.ts` | `/account/*` session guard |
| `lib/org-sign-in-entry.ts`, `lib/client-sign-in-entry.ts` | Named ingress routers |
| `proxy.ts` | Edge session gate for protected routes |
| `app/api/auth/[...path]/route.ts` | Neon Auth API handlers |

### Routes

- `app/org/login/page.tsx`, `app/auth/admin/page.tsx` (legacy alias)
- `app/client/(gate)/login/page.tsx`, `app/page.tsx` (client session routers)
- `app/auth/[path]/page.tsx` (Neon Auth UI + Guardian shell, SPEC-B)
- `app/actions/admin.ts`, `app/actions/client.ts` — re-export session helpers

**Removed from scope:** Custom `clientSignInAction` / `acceptClientInviteAction` (Neon Auth UI only).

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
- `lib/auth/session.test.ts` — `guardClientSession`, `rejectNonOperatorSignIn`
- `lib/auth/admin.test.ts` — Neon Admin API session gate
- `lib/auth/auth-page-trust.test.ts` — ingress trust notice flags
- Operator sign-in success and failure (E2E smoke)
- Client session dispatch at `/` and `/client/login` (E2E)
- Non-operator rejected at org login (E2E smoke)
- Client cannot invoke `/dashboard` actions (proxy + page guards)

## Acceptance proof

- [ ] Operator: `/org/login` → `/auth/sign-in?from=org` → `/dashboard` (or `returnTo` when provided)
- [ ] Client: `/client/login` or `/` → `/client` or `/client/onboarding`
- [x] Unauthorized operator: `/org/login?reason=access-denied` — smoke E2E 2026-07-08
- [ ] Client session scoped to client routes only

## Rollback

Revert auth env vars; disable trusted domain if misconfigured.

## Drift risk

Bypassing `requireAdminSession` in new actions; confusing `lib/admin.ts` (operator session) with `lib/auth/admin.ts` (Neon Admin API); routing non-S5 paths through `guardClientSession`.
