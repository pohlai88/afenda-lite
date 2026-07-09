# Post-deploy verification — Backlog-01 (Neon Auth closure)

**Audience:** release owner, operators, engineers  
**Production URL:** https://iam-check.vercel.app  
**Master backlog:** [backlog-01-neon-auth-closure.md](./backlog-01-neon-auth-closure.md)  
**Preflight & deploy mechanics:** [production-go-live.md](../runbooks/production-go-live.md)  
**Status snapshot:** [TRACKING.md](../TRACKING.md)

This is the **single checklist** for everything that must happen **after** code is merged and production is redeployed. Problem context: [bl-slices.md](./bl-slices.md) — do not duplicate deploy steps there.

**Last updated:** 2026-07-09

---

## When to use this doc

| Situation | Use |
| --- | --- |
| First production push for Backlog-01 fixes | Full checklist below (Phases 0–4) |
| Hotfix redeploy only | Phase 0 + affected slice section |
| Env / Neon Auth domain change | [production-go-live.md](../runbooks/production-go-live.md) preflight + Phase 0 audit |

---

## Phase 0 — Deploy gate (required)

Complete [production-go-live.md](../runbooks/production-go-live.md) preflight, then:

```bash
npm run verify:production
# Optional explicit URL:
PRODUCTION_URL=https://iam-check.vercel.app npm run verify:production
```

Deploy production (Vercel promote or):

```bash
vercel deploy --prod --yes
```

| Check | Pass criteria |
| --- | --- |
| `GET /api/health/liveness` | HTTP 200, `status === "alive"` |
| `GET /api/health/readiness` | HTTP 200, `status === "ready"` (or `degraded` only if env intentionally partial) |
| `npm run verify:production` | Exit 0 |
| CI on release commit | Green (migrate + smoke/journey as configured) |

- [ ] Phase 0 complete — record commit SHA: _______________

---

## Phase 1 — Operator flows (BL-02, BL-03)

### BL-02 — Operator client invitation email (J1)

**Context:** [BL-02](./bl-slices.md#bl-02)

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | Dashboard → Clients → Register client (invited email + declaration) | Success toast; no silent failure |
| 2 | Audit `invite.issued` | `emailSent: true`; no `neonAuthStatus: 401` |
| 3 | Recipient inbox | Email from `auth@mail.myneon.app`; link is `/join?invitationId=<neon_auth.id>` |
| 4 | Neon DB | `neon_auth.invitation` row `pending` for recipient |

**Script alternative (operator session required locally):**

```bash
node --env-file=.env scripts/live-org-invite.mjs "client@example.com" "Client Name"
# Use joinUrl / neonAuthInvitationId from JSON
```

- [ ] BL-02 closed on production

### BL-03 — Operator client portal preview (J6)

**Context:** [BL-03](./bl-slices.md#bl-03)

**Prerequisites:** `PREVIEW_CLIENT_*` on Vercel; `npm run seed:preview-client` on production DB if not already seeded.

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | Operator signed in → Preview client portal | Lands on `/client` (not `/client/preview-unavailable`) |
| 2 | Preview banner | Visible; sandbox identity |
| 3 | Return to organization | Operator session restored; dashboard loads |
| 4 | Audit | `admin.client_preview_started` present; no `session_mismatch` |

- [ ] BL-03 closed on production

---

## Phase 2 — Client invitation join (BL-06)

**Context:** [BL-06](./bl-slices.md#bl-06)  
**Journey runbook (screenshots):** [client-invitation-sign-in-journey.md](../runbooks/client-invitation-sign-in-journey.md)

Depends on **BL-02** (working invite email).

### 2a — Join UI (OTP step on `/join`)

Code routes unverified users to embedded **`email-otp`** before **`accept-invitation`** (`lib/client-invitation-join-auth.ts`, `components/use-join-invitation-auth-view.ts`).

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | Open `/join?invitationId=<id>` from invite email | Guardian join shell; step indicator; sign-up form |
| 2 | Sign up with invited email | Session created |
| 3 | After sign-up, same `/join` URL | **Step 2 — Verify your email** (compact + brand stepper); embedded OTP form |
| 4 | Missing `invitationId` | Error alert only — no auth form |

```bash
node scripts/check-production-join-ui.mjs
```

- [ ] Join OTP step visible on production

### 2b — Full client journey (J2 + J4)

| Step | Phase | Pass criteria |
| --- | --- | --- |
| 1 | Verify email (OTP) | `session.user.emailVerified === true` |
| 2 | Accept invitation | `POST …/accept-invitation` 200; redirect `/client/onboarding` |
| 3 | Onboarding | Profile saved; `onboardingComplete` |
| 4 | Client home | Assignment visible; acknowledgement recorded |
| 5 | Declare | `/client/declare/[id]` loads and submits |
| 6 | Audit | `invite.accepted` for same email as `invite.issued` |

**Automated (production target):**

```bash
npm run env:compose
PLAYWRIGHT_BASE_URL=https://iam-check.vercel.app PLAYWRIGHT_REUSE_SERVER=1 \
  npx playwright test e2e/client-invitation-journey.spec.ts --project=journey
```

**Screenshots (optional, refreshes runbook PNGs):**

```bash
node scripts/capture-client-journey-screenshots.mjs
# Expect phase-04-verify-email.png after OTP step ships on prod
```

**Note:** E2E may call `scripts/mark-neon-auth-email-verified.mjs` when inbox is unavailable. Production sign-off requires a **real** OTP completion at least once.

- [ ] BL-06 closed on production (real OTP + accept, not script-only)

---

## Phase 3 — Auth self-service & branding (BL-05, BL-07)

### BL-05 — Email branding (Console, not deploy)

**Context:** [BL-05](./bl-slices.md#bl-05)

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | Neon Console → Auth → Configuration → Application Name | **Client Declaration Portal** |
| 2 | Trigger invite + OTP + password reset samples | Display name acceptable; links hit `APP_URL` |
| 3 | Neon production audit item 3 | Manual item marked complete |

- [ ] BL-05 closed

### BL-07 — Account & credential self-service (J3, J5, J7)

**Context:** [BL-07](./bl-slices.md#bl-07)

| Flow | Pass criteria |
| --- | --- |
| Forgot → reset link → new password → sign-in | Works on production |
| Magic link (existing user) | Sign-in succeeds; copy hints new users use join |
| `/account/settings` | Display name persists |
| `/account/security` | Password change succeeds |
| Hidden account tabs | `/account/teams`, `/account/organizations`, `/account/api-keys` → 404 |

- [ ] BL-07 closed on production

---

## Phase 4 — Program closure (Backlog-01)

| Step | Action | Pass criteria |
| --- | --- | --- |
| 1 | `npm run sync:neon-auth-manifest` (if branch config changed) | Manifest matches live |
| 2 | `npm run audit:neon-auth-production` | No blocking failures |
| 3 | Journeys J1–J8 | Exercised in production or documented exception below |
| 4 | BL-04 sign-off (optional) | Release owner recorded |

**J8 reference:** [BL-04](./bl-slices.md#bl-04) — `allow_localhost: false`, trusted origins = `APP_URL`.

### Exceptions (if any)

| Journey | Exception | Owner | Date |
| --- | --- | --- | --- |
| | | | |

---

## Quick command reference

| Purpose | Command |
| --- | --- |
| Production readiness | `npm run verify:production` |
| Neon auth audit | `npm run audit:neon-auth-production` |
| Live org invite | `node --env-file=.env scripts/live-org-invite.mjs <email> "Name"` |
| Join UI smoke | `node scripts/check-production-join-ui.mjs` |
| Join unit tests | `npm run test:unit -- lib/client-invitation lib/client-invitation-join-auth.test.ts` |
| Full journey E2E | `npx playwright test e2e/client-invitation-journey.spec.ts --project=journey` |
| Journey PNGs | `node scripts/capture-client-journey-screenshots.mjs` |

---

## Sign-off

```
Date:
Release / commit SHA:
Deployed by:

Phase 0 (deploy gate):     [ ] Pass
BL-02 invite email:        [ ] Pass
BL-03 client preview:      [ ] Pass
BL-06 join journey:        [ ] Pass (real OTP verified: Y/N)
BL-05 email branding:      [ ] Pass / [ ] N/A
BL-07 account self-svc:    [ ] Pass
Backlog-01 program closed: [ ] Yes  [ ] No — blockers:

Notes:
```

When all required boxes pass, update [TRACKING.md](../TRACKING.md) and close [backlog-01-neon-auth-closure.md](./backlog-01-neon-auth-closure.md) program DoD.
