# ADR-013 Neon Auth as Identity Provider

| Field | Value |
|-------|-------|
| ID | ADR-013 |
| Category | ADR |
| Version | 1.1.0 |
| Status | Accepted |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing.** Accepted target decision for the Turborepo rebuild. Ignore legacy flat-monolith residue.


## Decision Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Deciders** | Platform |
| **Scope** | Identity, org membership, session, and email auth |

## Context

We need authentication, organisation-level membership, email invitations for client onboarding, and password reset flows. We are already on Neon Postgres. We want to avoid running a separate auth service or maintaining a custom session table. The auth solution must support the org model that drives our multi-tenancy.

## Decision

Use **Neon Auth** (`@neondatabase/auth` + `@neondatabase/auth-ui`).

Neon Auth provides identity, org membership, JWT issuance, magic link, and org invitations. Email is delivered via Neon's shared provider (`auth@mail.myneon.app`) — no custom SMTP is configured. Password reset uses the Neon Auth UI forms. The `@afenda/auth` package wraps all Neon Auth interactions.

## Consequences

### Positive

- Identity and org model are co-located with the database — no separate auth service to operate
- Org invitations are first-class: `inviteOrgMember()` maps directly to Neon Auth's organisation invitation API
- No custom session table — session is resolved from the Neon Auth JWT
- Email delivery is handled by Neon — no SMTP server to configure or maintain

### Negative / accepted costs

- We are coupled to Neon Auth's availability and roadmap
- Neon Auth does not support custom roles natively — the `operator`/`client`/`admin` mapping is maintained at the application level in `@afenda/auth`
- Social OAuth (Google, GitHub) requires separate Neon Auth configuration if ever needed

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Auth.js / NextAuth | Requires a custom session table; no built-in org model; invitation flow is manual; more configuration for the same outcome |
| Clerk | External paid service; vendor lock-in risk; cost grows with user count; does not co-locate with our Neon database |
| Custom JWT | We would own session management, key rotation, and token validation — significant ongoing maintenance with no product differentiation |
| Supabase Auth | Requires Supabase as a second infrastructure dependency alongside Neon |

## Constraints that must not be broken

- Neon Auth SDK usage stays inside `@afenda/auth` — no direct SDK calls from `apps/web` features/modules
- Auth transactional email uses Neon shared provider — no custom SMTP for Neon Auth
- Client invite entry remains `/join?invitationId=…`
- `getSession()` never silently defaults a missing `orgId`

## References

- [ARCH-026 Auth and Session Model](../../architecture/turborepo/ARCH-026-auth-session.md)
- [ARCH-023 Multi-Tenancy Model](../../architecture/turborepo/ARCH-023-multi-tenancy.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Constraints that must not be broken |
| 1.0.0 | 2026-07-13 | Accepted |
