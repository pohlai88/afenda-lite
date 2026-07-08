# BL-02 — Operator client invitation email

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P0  
**Journeys:** J1  
**Depends on:** BL-01  
**Status:** Fix in repo — **deploy and verify on production**

**Validation matrix:** [neon-auth-validation-matrix.md](../neon-auth-validation-matrix.md) (Server-side org invite section)

---

## Problem

When an operator registers a client from the dashboard, the portal DB record is created but the org invitation email may not send. Production audit showed `emailSent: false` with **401 Unauthorized** on `organization/invite-member` — not an SMTP failure.

---

## Verified root cause (implementation)

The server-action path used `neonAuthServerFetch`, which diverged from the Neon Auth SDK contract:

| Requirement | Was (broken) | Now (fixed) |
| --- | --- | --- |
| Proxy header | `x-neon-auth-server-proxy` | `x-neon-auth-proxy` (SDK name) |
| Cookie header | Full browser `Cookie` string | Only `__Secure-neon-auth.*` cookies |
| Origin | `APP_URL` (correct — keep) | Unchanged |

**Files:** `lib/auth/neon-auth-request.ts`, audit metadata in `app/actions/client.ts`.

**Working reference:** `scripts/live-org-invite.mjs` (fresh admin sign-in + same API path).

---

## Branch prerequisites (live MCP)

- Organization plugin: **enabled**
- `sendInvitationEmail`: **true**
- Email provider: **shared** (`auth@mail.myneon.app`)
- Operator must be **org owner** (`admin@iam-check.com` today)

---

## Expectation

Operator issues invite → Neon Auth creates org invitation → email sent → audit `emailSent: true` → operator toast confirms email.

---

## Do

- Deploy fix before closing slice.
- Verify on `https://iam-check.vercel.app` (trusted origin; localhost disabled on branch).
- Use `/join?invitationId=…` in all client comms.
- On failure, check audit for `neonAuthStatus` (HTTP code).

## Don't

- Pre-create Neon Auth users at invite time.
- Use MailerSend for org invitation email.
- Switch to `auth.organization.inviteMember` SDK alone without preserving `APP_URL` Origin override (breaks invite links from local dev).
- Assume DB invitation row means email delivered.

---

## Definition of done

- [ ] Fix deployed to production.
- [ ] Operator UI invite: `audit_events.invite.issued` → `emailSent: true`.
- [ ] Recipient email received from `auth@mail.myneon.app`.
- [ ] `neon_auth.invitation` row `pending` for recipient.
- [ ] `ClientEmailDeliveryBanner` shows delivery enabled.

---

## Test & verification

| Layer | Command / action | Pass criteria |
| --- | --- | --- |
| L0 | `npm run test:unit -- lib/auth/neon-auth-request.test.ts` | Cookie filter tests pass |
| Script | `node --env-file=.env scripts/live-org-invite.mjs <email> "Name"` | Success JSON |
| Manual (prod) | Operator → Clients → issue invite | Issued + emailed toast |
| Audit | `invite.issued` event | `emailSent: true`, no `neonAuthStatus: 401` |
| E2E | `npm run test:e2e:journey` | Client onboarding green |

---

## Rollback / workaround

Until deploy verified: `scripts/live-org-invite.mjs` with operator credentials.
