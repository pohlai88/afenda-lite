# BL-06 — Client invitation join journey

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P0  
**Journeys:** J2, J4  
**Depends on:** BL-02  
**Status:** Code complete — verify on production → [post-deploy-verification.md](../post-deploy-verification.md#phase-2--client-invitation-join-bl-06)

---

## Problem

Client onboarding depends on a multi-step auth journey: receive invite → open `/join` → register → (sign in if needed) → accept organization invitation → complete portal onboarding. Any break in org plugin, OTP verification, or invitation acceptance leaves clients stuck without a clear path.

---

## Issues to close

- Join flow must work with OTP at sign-up but without hard email-verification gate before sign-in (`require_email_verification: false`).
- Missing or malformed `invitationId` must show clear error — not a blank auth form.
- Accept-invitation must redirect into client onboarding, not operator dashboard.
- Legacy `/auth/accept-invitation?invitationId=` must redirect to `/join`.

---

## Expectation

Invited client completes registration and organization acceptance in one guided flow, then reaches client onboarding and assigned declarations.

---

## Do

- Use canonical URL `/join?invitationId=…` in operator comms and emails.
- Show step indicator and trust notice on join page.
- Offer alternate sign-in link with `returnTo` back to join URL when user already has credentials.
- Bootstrap client profile and mark invitation accepted after auth (email or metadata match).

## Don't

- Auto-provision Neon Auth users at operator invite time.
- Require email verification before first sign-in (breaks join sequence).
- Send clients to operator `/org/login` or `/dashboard`.
- Use magic link as primary path for first-time invited clients.

---

## Code implementation (verified in repo)

| Requirement | Implementation |
| --- | --- |
| Canonical `/join?invitationId=` | `app/join/page.tsx`, `lib/client-invitation-entry.ts` |
| Guardian shell (default) + rollback | `PortalInvitationJoinPage` → `GuardianInvitationJoinPage`; `GUARDIAN_AUTH_SHELL=false` → `PortalAuthLayout` |
| Auth step machine (sign-up → OTP → accept) | `lib/client-invitation-join-auth.ts`, `components/use-join-invitation-auth-view.ts` |
| Legacy accept-invitation redirect | `app/auth/[path]/page.tsx` → `redirectAuthAcceptInvitationToJoin` |
| Missing invitation error | `components/portal-invitation-join-panel.tsx` |
| OTP before accept | `resolveJoinInvitationAuthView` routes unverified users to `email-otp` |
| No pre-provision at invite | `ensureClientAuthUser` removed |

---

## Definition of done

Production verification only — checklist: [post-deploy-verification.md](../post-deploy-verification.md#phase-2--client-invitation-join-bl-06).

- [ ] End-to-end: invite email → `/join` → sign-up → OTP → accept → `/client/onboarding`.
- [ ] `audit_events.invite.accepted` recorded for new client.
- [ ] Pending org invitation moves to accepted in Neon Auth.
- [x] Missing `invitationId` shows `clientInvitationJoin.missingInvitationError`.
- [x] Client with existing account can sign in and accept from join page (panel + alternate sign-in link).
- [x] `/auth/accept-invitation?invitationId=` redirects to `/join`.

---

## Test & verification

| Layer | Command / action | Pass criteria |
| --- | --- | --- |
| E2E | `npm run test:e2e:journey` — client onboarding spec | Green |
| Manual | Full invite → join → onboarding on production | Declaration visible on client home |
| Audit | `invite.issued` + `invite.accepted` | Both events for same email |
| Smoke | Public `/join` without session | Page renders; no auth middleware block |

---

## UX surfaces in scope

- `/join` — `PortalInvitationJoinPage`
- `/auth/sign-up`, `/auth/sign-in`, `/auth/accept-invitation` (via AuthView)
- Trust notices: org invitation + OTP at sign-up

---

## Related spec

[s6-client-identity.md](../../architecture/slices/s6-client-identity.md)
