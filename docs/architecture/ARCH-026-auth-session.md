# ARCH-026 Authentication and Session Model

| Field | Value |
|-------|-------|
| ID | ARCH-026 |
| Category | Architecture |
| Version | 2.0.1 |
| Status | Living |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-17 |

> **Living.** Auth/session packaging SSOT after ARCH-028 Checkpoint G (2026-07-15). `@afenda/auth` helpers + `createSessionProxy` / `apps/web/proxy.ts` (I1.1) + public Neon Auth UI `/auth/*` (I1.2) + `/join?invitationId=…` + operator `inviteOrgMember` adapter on `/admin` (I1.3) + fail-closed role shells `requireRole` → `/403` (I1.4) on disk. GUIDE-018 **I3.1 DONE** (Tier-2 `hasPermission` · assign/revoke · invite `clients.invite`). Next program surface: **I3.2** (Declarations). IAM Decision lock stays in [ARCH-023](ARCH-023-multi-tenancy.md). Neon Auth transactional mail: **Zoho SMTP** via Neon Auth `email_provider` (not Neon shared `auth@mail.myneon.app`).

# 1. Purpose

Living auth/session packaging SSOT after ARCH-028 Checkpoint G: Neon Auth decision, `@afenda/auth` helpers, edge session gate, and invitation/join packaging.

# 2. Scope

## 2.1 In Scope

- Neon Auth decision and packaging constraints
- `@afenda/auth` session helpers and invitation adapters
- Edge / public auth UI / join wiring honesty
- Auth failure modes and trusted-domain ops

## 2.2 Out of Scope

- Platform IAM Decision lock and permission catalogue ([ARCH-023](ARCH-023-multi-tenancy.md))
- ActionResult / API error brands ([ARCH-029](ARCH-029-interface-api-architecture.md) · API-002)
- Product domain mutations (GUIDE-018 I2.3+)

# 3. Authentication Architecture

## Context

Afenda-Lite uses Neon Auth as its identity provider. Neon Auth handles user identity, org membership, password flows, and email invitations. The `@afenda/auth` package wraps Neon Auth into typed helpers used by app code: `getSession()`, `requireRole()`, and `inviteOrgMember()`. This document includes the **Neon Auth decision**.

**IAM authority:** Platform tenancy, permission-first RBAC, Decision lock, and Neon-role ≠ product-authz rules live only in [ARCH-023](ARCH-023-multi-tenancy.md). This document owns session helpers and Neon Auth packaging — not the Living IAM model.

## Neon Auth decision

**Decision:** Use **Neon Auth** (`@neondatabase/auth` + `@neondatabase/auth-ui`). Auth transactional email is delivered by Neon Auth using **Zoho SMTP** configured in the Neon Auth console (`email_provider.type: standard` · host `smtp.zoho.com` · sender `no-reply@nexuscanon.com`). Password reset and org invitations use Neon Auth UI / invite APIs — **not** an app-owned SMTP stack. All SDK usage wrapped in `@afenda/auth`.

| Positive | Accepted cost |
|----------|---------------|
| Identity + org co-located with Neon DB | Coupled to Neon Auth availability/roadmap |
| First-class org invitations | Neon membership roles are identity signals — product authz is ARCH-023 |
| No custom session table | Social OAuth needs separate Neon config if ever needed |
| Branded Zoho SMTP for invite / reset / verify mail | Neon Auth console SMTP secrets — never commit; rotate in Neon Console / MCP only |

| Alternative | Why rejected |
|-------------|--------------|
| Neon shared mail (`auth@mail.myneon.app`) | Insufficient brand / deliverability control for production Afenda mail |
| Auth.js / NextAuth | Custom session table; no built-in org model |
| Clerk | External paid vendor; does not co-locate with Neon |
| Custom JWT | Own session/key rotation with no product differentiation |
| Supabase Auth | Second infra dependency beside Neon |
| App-side SMTP in `apps/web` / `@afenda/emails` for Neon Auth flows | Dual mail path; secrets in app env; bypasses Neon Auth delivery |

**Constraints that must not be broken:**

- Neon Auth SDK usage stays inside `@afenda/auth` — no direct SDK calls from `apps/web` features/modules
- Auth transactional email uses **Zoho SMTP via Neon Auth** — do not revert to Neon shared provider without an explicit Docs reopen of this decision
- Do **not** add app-side SMTP (`NEON_AUTH_SMTP_*`, Resend, nodemailer, etc.) for Neon Auth invite / reset / verify
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

`@afenda/auth` does **not** own: Living permission catalogue, Decision lock, or FFT domain RBAC ([FFT-MOD-005](../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md)); user profile data beyond `userId`/`orgId`/`role`; invitation email templates in `@afenda/emails` (Neon Auth delivers its own invite / reset / verify mail via the Zoho SMTP `email_provider` configured on the Neon Auth project).

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

Sends a Neon Auth org invitation. The invitation email is delivered by Neon Auth through the project **Zoho SMTP** provider. App code does not call Neon Auth SDK directly and does not send SMTP itself.

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

Password reset: `/auth/forgot-password` → Neon Auth sends reset email via Zoho SMTP → `/auth/reset-password`. Handled entirely by Neon Auth UI forms (no app-side SMTP).

Client invitation: operator uses `/admin` → `inviteOrgMemberAction` → `inviteOrgMember()` → Neon Auth delivers the invitation email via Zoho SMTP → Platform `recordRbacAudit` stamps hard `organization_id` → client follows link to `/join?invitationId=…`.

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Neon Auth over Auth.js, Clerk, custom JWT | This doc § Neon Auth decision |
| Zoho SMTP via Neon Auth for auth transactional mail (not Neon shared; not app SMTP) | This doc § Neon Auth decision |
| `orgId` always resolved from session, never from URL param alone | [ARCH-023](ARCH-023-multi-tenancy.md) |
| Permission-first platform IAM | [ARCH-023](ARCH-023-multi-tenancy.md) |

## Failure modes

| Failure | Impact | Recovery |
|---------|--------|----------|
| Neon Auth unavailable | All logins fail; existing sessions may still resolve from cached JWT | Monitor Neon status |
| JWT expired | `getSession()` redirects to login | Normal — user re-authenticates |
| `orgId` missing from token | `getSession()` throws; do not silently default | Fix Neon Auth org membership; do not patch with fallback |
| Invitation email not delivered | Client cannot join | Check Neon Auth invite log + Zoho SMTP delivery; resend via Neon dashboard / operator invite |

## Operational considerations

- **Trusted domains:** add every production, preview, custom, and local origin used by `APP_URL` to Neon Auth trusted origins: `neon neon-auth domain add https://…`. Procedure and evidence live in [RB-001 §3.12](../runbooks/RB-001-multi-org-ops.md#312-production-auth-ops--deploy-health-n15).
- **Auth config audit:** `pnpm audit:neon-auth-production` confirms trusted domains; `pnpm validate:neon-env` includes the N15 trusted-domain row.
- **Plugin configuration:** `pnpm configure:neon-auth-production` is collapsed inventory only (`exit 1`), not a live operator control. Configure Neon Auth plugins through the Neon console / approved MCP flow until a future Approved slice replaces that inventory alias.
- **Deploy health:** `pnpm check:production:post-deploy` probes production liveness/readiness and recent Deploy evidence.
- **Local dev:** `http://localhost:3000` must be present in Neon Auth trusted domains for local sign-in.

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| ARCH-023 | Multi-Tenancy and Platform RBAC | IAM Decision lock · permission-first authz |
| ARCH-022 | System Overview | Edge / App Router placement |
| GUIDE-018 | Full-Stack E2E Integration Program | Phase I identity / BFF sequencing |

# 5. Change Log


| Version | Date | Summary |
|---------|------|---------|
| 2.0.1 | 2026-07-17 | N15 Path-to-100%: operational bullets point to live trusted-domain/deploy checks; collapsed `configure:neon-auth-production` no longer presented as a live control. |
| 2.0.0 | 2026-07-17 | **Breaking mail decision:** Neon Auth transactional email = **Zoho SMTP** (Neon Auth console `email_provider`); Neon shared provider rejected; app-side SMTP for Neon Auth flows remains forbidden. |
| 1.3.11 | 2026-07-17 | Bounded reopen (I3.1 audit repair): next-pointer honesty — I3.1 Tier-2 permissions landed; residual = I3.2. |
| 1.3.10 | 2026-07-15 | Bounded reopen (I2.4 audit repair): next-pointer honesty — Phase I2 done; residual = I3.1 (Tier-2 permissions). |
| 1.3.9 | 2026-07-15 | Bounded reopen (I2.3 audit repair): invite adapter records hard-org `platform_rbac_audit`; residual = I2.4. |
| 1.3.8 | 2026-07-15 | DOC-003 six-section retrofit (content preserved; Known limits → § 6 Notes). |
| 1.3.7 | 2026-07-15 | Bounded reopen (I2.2 audit repair): next-pointer honesty — I2.2 feature↛db landed; residual = I2.3. |
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

# 6. Notes

- MFA is not currently configured. If required, a new ADR is needed.
- Neon Auth custom role mapping remains an app concern; Living product authz stays in ARCH-023.
- Neon Auth SMTP secrets stay in Neon Console / MCP configure only — never in `.env.local`, Vercel app env, or git.
- Google OAuth may be present on the Neon Auth project; product login surface remains email/password until an explicit OAuth product slice.
