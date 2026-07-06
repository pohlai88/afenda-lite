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

- `lib/auth/server.ts`, `lib/auth/client.ts`
- `lib/admin.ts`
- `app/actions/admin.ts`
- `app/api/auth/[...path]/route.ts`
- `proxy.ts`

**Middleware matcher (2026-07):** `/account/:path*`, `/dashboard/:path*`, `/client/:path*`

## Critical control points

- `requireAdminSession()` before operator mutations
- `requireClientSession()` before client mutations
- `auth.signOut()` when non-operator hits operator login

## Failure modes

- `SHARED_ADMIN_EMAIL` misconfigured → no operator access
- Client routes rely on page self-guard (middleware partial)

## Required tests

- Operator sign-in success and failure
- Non-operator rejected at `/`
- Client cannot invoke `/dashboard` actions

## Acceptance proof

- [ ] Operator: `/` → `/dashboard`
- [ ] Unauthorized: `/org/login?reason=access-denied`
- [ ] Client session scoped to client routes only

## Rollback

Revert auth env vars; disable trusted domain if misconfigured.

## Drift risk

Bypassing `requireAdminSession` in new actions.
