# S6 — Client identity lifecycle

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 7 |
| **Depends on** | S0, S1 |
| **Feeds into** | S7 |

## Purpose

Provision client Neon Auth users via operator invitation and onboarding.

## Inputs / outputs

- **Inputs:** Operator invite form; accept-invite password; onboarding profile fields
- **Outputs:** `client_invitations`, `client_profiles`, Neon Auth user

## Owned files

- `app/invite/[token]/page.tsx`, `app/client/onboarding/page.tsx`
- `app/actions/client.ts`
- `lib/clients.ts`
- `components/accept-invite-form.tsx`, `client-onboarding-form.tsx`
- `app/dashboard/clients/page.tsx`

## Critical control points

- Invite token expiry enforced
- Email normalized before persist
- Onboarding required before assignments visible

## Failure modes

- Expired or already-accepted token
- Duplicate sign-up email

## Required tests

- Invite → accept → onboard → login redirect

## Acceptance proof

- [ ] Client reaches `/client` with complete profile
- [ ] Expired token shows appropriate error copy

## Drift risk

Skipping onboarding gate for new client routes.
