# ARCH-026 Auth and Session Model

| Field | Value |
|-------|-------|
| ID | ARCH-026 |
| Category | Architecture |
| Version | 1.1.0 |
| Status | Target |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing / Target.** Describes the intended Turborepo system. Authoritative for new work. Missing `apps/` or `packages/` on disk is expected until implementation.

## Context

Afenda-Lite uses Neon Auth as its identity provider. Neon Auth handles user identity, org membership, password flows, and email invitations. The `@afenda/auth` package wraps Neon Auth into three typed helpers used by app code: `getSession()`, `requireRole()`, and `inviteOrgMember()`. This document includes the **Neon Auth decision** (former ADR-013).

## Neon Auth decision (from ADR-013)

**Decision:** Use **Neon Auth** (`@neondatabase/auth` + `@neondatabase/auth-ui`). Email via Neon shared provider (`auth@mail.myneon.app`) — no custom SMTP. Password reset via Neon Auth UI forms. All SDK usage wrapped in `@afenda/auth`.

| Positive | Accepted cost |
|----------|---------------|
| Identity + org co-located with Neon DB | Coupled to Neon Auth availability/roadmap |
| First-class org invitations | Custom roles not native — app maps `operator`/`client`/`admin` |
| No custom session table | Social OAuth needs separate Neon config if ever needed |
| No SMTP to operate | |

| Alternative | Why rejected |
|-------------|--------------|
| Auth.js / NextAuth | Custom session table; no built-in org model |
| Clerk | External paid vendor; does not co-locate with Neon |
| Custom JWT | Own session/key rotation with no product differentiation |
| Supabase Auth | Second infra dependency beside Neon |

**Constraints that must not be broken:**

- Neon Auth SDK usage stays inside `@afenda/auth` — no direct SDK calls from `apps/web` features/modules
- Auth transactional email uses Neon shared provider — no custom SMTP for Neon Auth
- Client invite entry remains `/join?invitationId=…`
- `getSession()` never silently defaults a missing `orgId`

Tenancy: [ARCH-023](ARCH-023-multi-tenancy.md) · Platform IAM: [ARCH-011](../ARCH-011-platform-tenancy-rbac.md).

## Responsibilities and boundaries

| Layer | Responsibility |
|-------|---------------|
| Neon Auth | Identity store, org model, JWT issuance, email delivery |
| `@afenda/auth` | Session resolution, RBAC guards, invitation wrapper |
| `apps/web` RSC / Server Action | Calls `getSession()` at every protected entry point |
| `apps/web` `app/(public)/auth/*` | Renders Neon Auth UI forms (`NeonAuthUIProvider`) |

`@afenda/auth` does **not** own: user profile data beyond `userId`/`orgId`/`role`, invitation email templates (those are in `@afenda/emails` for app-level emails; Neon Auth delivers its own invite email via its shared provider).

## Components

### Session type

```typescript
// @afenda/auth/src/session.ts
export type Session = {
  userId: string
  orgId:  string          // organization_id — always present, never nullable
  role:   Role
}

export type Role = 'admin' | 'operator' | 'client'
```

### `getSession()`

Reads the Neon Auth session token from the request context. Returns a typed `Session` or throws a redirect to `/auth/login`.

```typescript
// Usage in an RSC
import { getSession } from '@afenda/auth'

export default async function DashboardPage() {
  const session = await getSession()   // throws if unauthenticated
  const data = await listItems(session.orgId)
  return <Dashboard data={data} />
}
```

### `requireRole(role)`

Guards a route or action at a specific RBAC tier. Throws a redirect to `/auth/login` (unauthenticated) or `/403` (authenticated but wrong role).

```typescript
// Usage in a Server Action
import { requireRole } from '@afenda/auth'

export async function deleteOrganization(orgId: string) {
  await requireRole('admin')
  // ... proceed
}
```

### `inviteOrgMember()`

Sends a Neon Auth org invitation. The invitation email is delivered by Neon's shared email provider. App code does not call Neon Auth SDK directly.

```typescript
import { inviteOrgMember } from '@afenda/auth'

await inviteOrgMember({ email: 'client@example.com', orgId, role: 'client' })
```

### RBAC tiers

| Role | Access |
|------|--------|
| `admin` | Platform-level: can manage organisations, all operators and clients |
| `operator` | Org-level: manages clients and declarations within one org |
| `client` | Restricted: read/write own declarations only |

Module-level permissions (e.g., `fft.access`) extend this tier without replacing it. A user must hold the base role plus any module permission.

## Data / request flow

```
/auth/login (Neon Auth UI)
  │
  Neon Auth issues JWT
  │
  ▼
RSC / Server Action
  │
  getSession()
  │   reads JWT from request cookie
  │   validates with Neon Auth
  │   returns { userId, orgId, role }
  │
  requireRole('operator')   ← optional guard
  │
  domain call(orgId, ...)
```

Password reset: `/auth/forgot-password` → Neon Auth sends reset email → `/auth/reset-password`. No custom SMTP. Handled entirely by Neon Auth UI forms.

Client invitation: operator calls `inviteOrgMember()` → Neon Auth delivers the invitation email → client follows link to `/join?invitationId=…`.

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Neon Auth over Auth.js, Clerk, custom JWT | This doc § Neon Auth decision |
| No custom SMTP for auth email | This doc § Neon Auth decision |
| `orgId` always resolved from session, never from URL param alone | [ARCH-023](ARCH-023-multi-tenancy.md) |

## Failure modes

| Failure | Impact | Recovery |
|---------|--------|----------|
| Neon Auth unavailable | All logins fail; existing sessions may still resolve from cached JWT | Monitor Neon status |
| JWT expired | `getSession()` redirects to login | Normal — user re-authenticates |
| `orgId` missing from token | `getSession()` throws; do not silently default | Fix Neon Auth org membership; do not patch with fallback |
| Invitation email not delivered | Client cannot join | Check Neon Auth invite log; resend via Neon dashboard |

## Operational considerations

- **Trusted domains:** add any new Vercel preview URL to Neon Auth trusted origins: `neon neon-auth domain add https://…`.
- **Auth config audit:** `npm run audit:neon-auth-production`.
- **Plugin configuration:** `npm run configure:neon-auth-production` for magic link and org plugins.
- **Local dev:** `http://localhost:3000` is an allowed Neon Auth origin for sign-in without extra config.

## Known limits / future changes

- MFA is not currently configured. If required, a new ADR is needed.
- Neon Auth custom roles (`admin`/`operator`/`client` mapping) are maintained at the app level — Neon Auth does not natively enforce module permissions.
- Social OAuth providers (Google, GitHub) are not configured. Adding one requires Neon Auth dashboard change + a new row in this document.
