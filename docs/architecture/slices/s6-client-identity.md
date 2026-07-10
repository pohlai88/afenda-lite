# S6 — Client identity lifecycle

| Field | Value |
|-------|-------|
| **Status** | shipped (join live; onboarding wizard tombstoned — unavailable stub 2026-07-10) |
| **Sequence** | 7 |
| **Depends on** | S0, S1 |
| **Feeds into** | S7 |

## Purpose

Provision client Neon Auth users via operator invitation and onboarding.

## Inputs / outputs

- **Inputs:** Operator invite form (`issueClientInviteAction`); Neon Auth sign-in; onboarding profile fields (`saveClientOnboardingAction`)
- **Outputs:** `client_invitations`, `client_profiles`, Neon Auth user

## Owned files

- `app/join/page.tsx` — canonical org invitation entry (`/join?invitationId=…`)
- `app/join/loading.tsx`, `app/join/error.tsx`
- `lib/entry/client-invitation-entry.ts`, `lib/client-invitation-join-auth.ts`
- `features/auth/studio-invitation-join-page.tsx`, `features/auth/invitation-join-panel.tsx`, `features/auth/invitation-join-steps.tsx`, `features/auth/use-join-invitation-auth-view.ts`
- Storybook-only join chrome: `components/portal/portal-invitation-join-brand-panel.tsx`, `components/portal/portal-invitation-join-steps.tsx` (compact delegates to features)
- `lib/auth/bootstrap-client-invite.ts` — post-auth invitation + profile linking
- `app/invite/[token]/page.tsx` — legacy redirect to client sign-in
- `lib/entry/legacy-invite-entry.ts`
- `lib/entry/client-sign-in-entry.ts` — reason codes + session dispatch
- `lib/pages/client-onboarding-page.tsx` — onboarding page handler
- `lib/pages/client-profile-page.tsx` — profile page handler
- `app/client/(workspace)/onboarding/page.tsx`, `app/client/(workspace)/profile/page.tsx`
- `app/actions/client.ts` — `saveClientOnboardingAction`, `issueClientInviteAction`, session helpers
- `lib/domain/clients.ts`, `lib/client-onboarding.ts`, `lib/client-onboarding.server.ts`
- Client workspace UI — tombstoned under `components/client/` until a dedicated rebuild slice; `/client/onboarding` renders unavailable stub via `lib/pages/client-onboarding-page.tsx` (no redirect loop)
- `app/dashboard/clients/page.tsx`, `app/dashboard/clients/loading.tsx`
- `lib/operator-clients-page.ts`, `components/operator-clients-page-view.tsx`
- `lib/email/client-email-delivery.ts`, `lib/email/send-client-onboarding-email.ts` — Neon Auth org invitation (not MailerSend)
- `e2e/client-onboarding.spec.ts`, `e2e/client-invitation-journey.spec.ts`

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

## Legacy `/invite/[token]` deprecation

S6 keeps `/invite/[token]` as a **compatibility redirect** to client sign-in with reason copy (`legacy-invite-entry.ts`). It is **not** the same as S5 `/f/[token]` declaration share links.

**Deprecation path (when traffic is negligible):**

1. Log or metric hits on `/invite/*` for one release cycle.
2. Redirect invalid/unknown tokens to `/auth/sign-in?reason=invite-invalid` (current behavior).
3. Redirect known valid tokens to `/join` or `/auth/sign-in?reason=check-email` without maintaining a separate route file.
4. Remove `app/invite/[token]/page.tsx` only after operator comms confirm no printed legacy URLs remain.

Until then: keep smoke coverage in `e2e/smoke.spec.ts` (`Client invite path @smoke`), separate from `e2e/public-links.spec.ts` (S5).
