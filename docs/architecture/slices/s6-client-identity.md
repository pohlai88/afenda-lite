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

- **Inputs:** Operator invite form (`issueClientInviteAction`); Neon Auth sign-in; onboarding profile fields (`saveClientOnboardingAction`)
- **Outputs:** `client_invitations`, `client_profiles`, Neon Auth user

## Owned files

- `app/invite/[token]/page.tsx` — legacy redirect to client sign-in
- `lib/legacy-invite-entry.ts`
- `lib/client-sign-in-entry.ts` — reason codes + session dispatch
- `app/client/(workspace)/onboarding/page.tsx`
- `app/actions/client.ts` — `saveClientOnboardingAction`, `issueClientInviteAction`, session helpers
- `lib/clients.ts`, `lib/client-onboarding.ts`, `lib/client-onboarding.server.ts`
- `components/client-onboarding-wizard.tsx`, `components/client-onboarding-form.tsx`, `components/client-onboarding-context.tsx`, `components/client-onboarding-progress.tsx`
- `app/dashboard/clients/page.tsx`, `app/dashboard/clients/loading.tsx`
- `lib/operator-clients-page.ts`, `components/operator-clients-page-view.tsx`
- `e2e/client-onboarding.spec.ts`

## Auth model (Neon Auth)

Client sign-in and password setup are handled by **Neon Auth UI** at `/auth/sign-in` (not custom server actions). Operator provisions users via `issueClientInviteAction`; `bootstrapClientAfterAuth` links invitations and profile rows after first authenticated session.

Removed (superseded): `clientSignInAction`, `acceptClientInviteAction`, `components/accept-invite-form.tsx`.

## Critical control points

- Invite expiry enforced on token **and** email lookup (`expirePendingInvitationIfNeeded`)
- Email normalized before persist
- Onboarding required before assignments visible (`requireClientSession({ requireOnboarding: true })`)

## Failure modes

- Expired or already-accepted invitation
- Duplicate sign-up email at provision time

## Required tests

- Operator register → Neon Auth sign-in → four-step onboard → `/client` redirect (`e2e/client-onboarding.spec.ts`)
- Full assignment journey with pre-onboarded preview client (`e2e/client-journey.spec.ts`)

## Acceptance proof

- [x] Client reaches `/client` with complete profile after onboarding wizard
- [x] Expired pending invitations marked `expired` on lookup (token and email paths)
- [x] Legacy `/invite/[token]` redirects with check-email reason copy

## Drift risk

Skipping onboarding gate for new client routes.
