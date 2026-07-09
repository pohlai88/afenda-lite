# Client invitation → declaration journey

**Audience:** operators, support, engineers  
**Environment:** production — `https://iam-check.vercel.app`  
**Last verified:** 2026-07-08 — Phases 1–3 and 5–8 (Playwright `@journey` + capture script; Phase 4 pending production OTP UI)

**Related:** [BL-06](../backlogs/slices/bl-06-client-join-journey.md) · [post-deploy-verification.md](../backlogs/post-deploy-verification.md) (production sign-off) · [neon-auth-validation-matrix.md](../backlogs/neon-auth-validation-matrix.md)

---

## Summary

| Phase | What happens | Verification |
| --- | --- | --- |
| 1 | Operator issues org invite → Neon email | `live-org-invite.mjs` / dashboard · `neon_auth.invitation` pending |
| 2 | Client opens `/join?invitationId=<neon_auth.id>` | Sign-up shell · Guardian default |
| 3 | Client signs up with invited email | Session created |
| 4 | Client verifies email (OTP) on `/join` | Required before accept · see [post-deploy Phase 2](../backlogs/post-deploy-verification.md#2a--join-ui-otp-step-on-join) |
| 5 | Client accepts org invitation | status → `accepted` · `/client/onboarding` |
| 6 | Client completes onboarding wizard | `onboardingComplete` |
| 7 | Client dashboard + acknowledgement | assignments visible |
| 8 | Client opens declaration workspace | `/client/declare/[id]` |

**OTP before accept:** Neon returns 403 (`EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION`) if accept runs before verify. The join panel routes unverified users to embedded `email-otp` (`lib/client-invitation-join-auth.ts`). Confirm on production after deploy via [post-deploy-verification.md](../backlogs/post-deploy-verification.md).

---

## Phase 1 — Invitation issued

**Operator:** Dashboard → Clients → Register client (or `scripts/live-org-invite.mjs`).

**Neon Auth:** `organization/invite-member` with `Origin: APP_URL` (`lib/auth/neon-auth-request.ts`).

**Email:** from `auth@mail.myneon.app` with join link containing **`neon_auth.invitation.id`** (not `client_invitations.id`).

**Verification:**

```bash
node --env-file=.env scripts/live-org-invite.mjs "client@example.com" "Client Name"
# Use joinUrl / neonAuthInvitationId from JSON output
```

---

## Phase 2 — Open join link

**URL:** `https://iam-check.vercel.app/join?invitationId=<neonAuthInvitationId>`

![Phase 2 — Join sign-up](./assets/phase-02-join-signup.png)

**Checks:** hero + step indicator + sign-up form · missing `invitationId` → error alert (no form).

---

## Phase 3 — Create account

Client submits Display name, **invited email**, password.

![Phase 3 — Sign-up filled](./assets/phase-03-signup-filled.png)

**Checks:** `POST /api/auth/sign-up/email` 200 · session cookie set.

---

## Phase 4 — Verify email (OTP)

Neon sends six-digit code to invited email. Client enters code on **`/join`** (embedded `email-otp`).

![Phase 4 — Verify email](./assets/phase-04-verify-email.png)

**Checks:** heading **Step 2 — Verify your email** · `session.user.emailVerified === true` before accept.

Regenerate PNG after production deploy: `node scripts/capture-client-journey-screenshots.mjs`

---

## Phase 5 — Accept invitation

![Phase 5 — Accept invitation](./assets/phase-05-accept-invitation.png)

**Checks:** `POST /api/auth/organization/accept-invitation` 200 · `neon_auth.invitation.status` → `accepted` · redirect `/client/onboarding` · audit `invite.accepted`.

---

## Phase 6 — Onboarding

Four-step declarant profile wizard at `/client/onboarding`.

![Phase 6 — Onboarding](./assets/phase-06-onboarding.png)

**Checks:** profile saved · `onboardingComplete: true` · redirect `/client`.

---

## Phase 7 — Client dashboard

Acknowledge portal responsibilities, then view assigned declarations.

![Phase 7 — Client dashboard](./assets/phase-07-client-dashboard.png)

**Checks:** assignment card visible · acknowledgement recorded.

---

## Phase 8 — Declaration workspace

Client opens **Complete declaration** → `/client/declare/[assignmentId]`.

![Phase 8 — Declaration workspace](./assets/phase-08-declaration-workspace.png)

**Checks:** declaration form renders · client can submit attestation.

---

## Automated verification

```bash
npm run env:compose

# Full journey E2E (production)
PLAYWRIGHT_BASE_URL=https://iam-check.vercel.app PLAYWRIGHT_REUSE_SERVER=1 \
  npx playwright test e2e/client-invitation-journey.spec.ts --project=journey

# Regenerate runbook PNGs
node scripts/capture-client-journey-screenshots.mjs

# Unit: join auth state machine
npm run test:unit -- lib/client-invitation-join-auth.test.ts

npm run audit:neon-auth-production
```

**E2E note:** tests may mark test-user email verified via `scripts/mark-neon-auth-email-verified.mjs` when OTP inbox is unavailable. Production sign-off requires real OTP completion — see [post-deploy-verification.md](../backlogs/post-deploy-verification.md).

---

## Key code

| Concern | Location |
| --- | --- |
| Join auth state (sign-up → OTP → accept) | `lib/client-invitation-join-auth.ts`, `components/use-join-invitation-auth-view.ts` |
| Join panel | `components/portal-invitation-join-panel.tsx` |
| Invite API + join URL | `scripts/live-org-invite.mjs` → `joinUrl`, `neonAuthInvitationId` |
| Bootstrap after auth | `lib/auth/bootstrap-client-invite.ts` |
| E2E flows | `testing/e2e/client-invitation-flows.ts` |
| E2E spec | `e2e/client-invitation-journey.spec.ts` |
