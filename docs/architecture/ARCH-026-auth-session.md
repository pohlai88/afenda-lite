# ARCH-026 Authentication and Session Model

| Field | Value |
|-------|-------|
| ID | ARCH-026 |
| Category | Architecture |
| Version | 1.3.6 |
| Status | Living |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-15 |

> **Living.** Auth/session packaging SSOT after ARCH-028 Checkpoint G (2026-07-15). `@afenda/auth` helpers + `createSessionProxy` / `apps/web/proxy.ts` (I1.1) + public Neon Auth UI `/auth/*` (I1.2) + `/join?invitationId=…` + operator `inviteOrgMember` adapter on `/admin` (I1.3) + fail-closed role shells `requireRole` → `/403` (I1.4) on disk. GUIDE-018 **I2.1** closed: invite Action returns platform `ActionResult` / shared error codes. Next program surface: **I2.2** (feature → domain → `@afenda/db` boundary). IAM Decision lock stays in [ARCH-023](ARCH-023-multi-tenancy.md).

## Context

Afenda-Lite uses Neon Auth as its identity provider. Neon Auth handles user identity, org membership, password flows, and email invitations. The `@afenda/auth` package wraps Neon Auth into typed helpers used by app code: `getSession()`, `requireRole()`, and `inviteOrgMember()`. This document includes the **Neon Auth decision**.

**IAM authority:** Platform tenancy, permission-first RBAC, Decision lock, and Neon-role ≠ product-authz rules live only in [ARCH-023](ARCH-023-multi-tenancy.md). This document owns session helpers and Neon Auth packaging — not the Living IAM model.

## Neon Auth decision

**Decision:** Use **Neon Auth** (`@neondatabase/auth` + `@neondatabase/auth-ui`). Email via Neon shared provider (`auth@mail.myneon.app`) — no custom SMTP. Password reset via Neon Auth UI forms. All SDK usage wrapped in `@afenda/auth`.

| Positive | Accepted cost |
|----------|---------------|
| Identity + org co-located with Neon DB | Coupled to Neon Auth availability/roadmap |
| First-class org invitations | Neon membership roles are identity signals — product authz is ARCH-023 |
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
- Product authorization checks follow ARCH-023 (permission codes / `hasPermission`) — do not treat Neon role display names as the sole authz bar

Tenancy + platform IAM: [ARCH-023](ARCH-023-multi-tenancy.md).

## Responsibilities and boundaries

| Layer | Responsibility |
|-------|---------------|
| Neon Auth | Identity store, org model, JWT issuance, email delivery |
| `@afenda/auth` | Session resolution, coarse route guards, invitation wrapper |
| `apps/web` RSC / Server Action | Calls `getSession()` at every protected entry point; applies ARCH-023 permission checks where required |
| `apps/web` `app/(public)/auth/*` | Renders Neon Auth UI forms (`NeonAuthUIProvider`) |

`@afenda/auth` does **not** own: Living permission catalogue, Decision lock, or FFT domain RBAC ([FFT-MOD-005](../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md)); user profile data beyond `userId`/`orgId`/`role`; invitation email templates in `@afenda/emails` (Neon Auth delivers its own invite email via its shared provider).

## Components

### Session type

```typescript
// @afenda/auth/src/session.ts
export type Session = {
  userId: string
  orgId:  string          // organization_id — always present, never nullable
  role:   Role            // Neon / membership signal — not the ARCH-023 permission catalogue
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

Coarse route/action guard against the session role signal. Throws a redirect to `/auth/login` (unauthenticated) or `/403` (authenticated but wrong role). **Does not replace** ARCH-023 Tier-2 permission checks (`hasPermission` / permission codes) for product authorization.

```typescript
// Usage in a Server Action
import { requireRole } from '@afenda/auth'

export async function deleteOrganization(orgId: string) {
  await requireRole('admin')
  // ... proceed; still apply ARCH-023 permission checks where the action is gated by codes
}
```

### `inviteOrgMember()`

Sends a Neon Auth org invitation. The invitation email is delivered by Neon's shared email provider. App code does not call Neon Auth SDK directly.

```typescript
import { inviteOrgMember } from '@afenda/auth'

await inviteOrgMember({ email: 'client@example.com', orgId, role: 'client' })
```

### Session role signals (not Living IAM)

These labels are **identity / routing signals** for Target packaging. Authoritative platform IAM (permission codes, Editor/Viewer mappings, module entry via `fft.access`, Decision lock) is [ARCH-023](ARCH-023-multi-tenancy.md).

| Role signal | Typical use |
|-------------|-------------|
| `admin` | Coarse platform/admin shell guard |
| `operator` | Coarse operator shell guard (`/admin/*`) |
| `client` | Coarse client shell guard (`/client/*`) |

Module permissions (for example `fft.access`) are evaluated per ARCH-023 / FFT-MOD-005 — never by role display name alone.

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
  requireRole('operator')   ← optional coarse shell guard
  │
  hasPermission(...)        ← product authz per ARCH-023 when required
  │
  domain call(orgId, ...)
```

Password reset: `/auth/forgot-password` → Neon Auth sends reset email → `/auth/reset-password`. No custom SMTP. Handled entirely by Neon Auth UI forms.

Client invitation: operator uses `/admin` → `inviteOrgMemberAction` → `inviteOrgMember()` → Neon Auth delivers the invitation email → client follows link to `/join?invitationId=…`.

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Neon Auth over Auth.js, Clerk, custom JWT | This doc § Neon Auth decision |
| No custom SMTP for auth email | This doc § Neon Auth decision |
| `orgId` always resolved from session, never from URL param alone | [ARCH-023](ARCH-023-multi-tenancy.md) |
| Permission-first platform IAM | [ARCH-023](ARCH-023-multi-tenancy.md) |

## Failure modes

| Failure | Impact | Recovery |
|---------|--------|----------|
| Neon Auth unavailable | All logins fail; existing sessions may still resolve from cached JWT | Monitor Neon status |
| JWT expired | `getSession()` redirects to login | Normal — user re-authenticates |
| `orgId` missing from token | `getSession()` throws; do not silently default | Fix Neon Auth org membership; do not patch with fallback |
| Invitation email not delivered | Client cannot join | Check Neon Auth invite log; resend via Neon dashboard |

## Operational considerations

- **Trusted domains:** add any new Vercel preview URL to Neon Auth trusted origins: `neon neon-auth domain add https://…`.
- **Auth config audit:** `pnpm audit:neon-auth-production`.
- **Plugin configuration:** `pnpm configure:neon-auth-production` for magic link and org plugins.
- **Local dev:** `http://localhost:3000` is an allowed Neon Auth origin for sign-in without extra config.

## Known limits / future changes

- MFA is not currently configured. If required, a new ADR is needed.
- Neon Auth custom role mapping remains an app concern; Living product authz stays in ARCH-023.
- Social OAuth providers (Google, GitHub) are not configured. Adding one requires Neon Auth dashboard change + a new row in this document.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.3.6 | 2026-07-15 | Bounded reopen (I2.1 audit repair): next-pointer honesty — I2.1 ActionResult landed; residual = I2.2. |
| 1.3.5 | 2026-07-15 | I1.4 closed: `AUTH_FORBIDDEN_PATH` · `requireRole` wrong-role → `/403` · operator/client layout wiring; residual = GUIDE-018 I2. |
| 1.3.4 | 2026-07-15 | I1.3 gap close: operator `/admin` → `inviteOrgMemberAction` / `inviteOrgMember`; residual = I1.4 role shells. |
| 1.3.3 | 2026-07-15 | I1.3 honesty: `/join?invitationId=…` + Neon accept-invitation redirect; residual = I1.4 role shells. |
| 1.3.2 | 2026-07-15 | I1.2 honesty: public `/auth/login` · forgot · reset via Neon Auth UI; residual = `/join`. |
| 1.3.1 | 2026-07-15 | I1.1 honesty: `createSessionProxy` + `apps/web/proxy.ts` on disk; residual = `/auth/*` · `/join`. |
| 1.3.0 | 2026-07-15 | Checkpoint G: Status Target→Living; package helpers present; I1 edge/auth UI residual named. |
| 1.2.2 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` in place of `npm run` / `npx` (repo SSOT `packageManager` + lockfile). |
| 1.2.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.0 | 2026-07-14 | Integrity remediation: demote role table to session signals; pointer IAM to ARCH-023; Change Log restored. |
| 1.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.0.0 | 2026-07-13 | Initial Target auth/session model |
