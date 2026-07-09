# BL-07 — Account & credential self-service

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P2  
**Journeys:** J3, J5, J7  
**Depends on:** BL-01  
**Status:** Code complete — verify on production → [post-deploy-verification.md](../post-deploy-verification.md#bl-07--account--credential-self-service-j3-j5-j7)

---

## Problem

Signed-in users and returning clients need self-service paths for password reset, optional magic-link sign-in, display name update, and password change — without exposing org-admin or email-change flows the product does not support.

---

## Issues to close

- Password reset must use **link** copy (not OTP copy) per branch policy.
- Magic link enabled for sign-in but not sign-up — copy must say existing users only.
- Account settings expose only settings + security tabs (not teams, orgs, API keys).
- Email change disabled by policy — users must not see a broken email-change UI.

---

## Expectation

Users can recover access and manage name/password through familiar auth and account pages with correct trust messaging and no dead-end routes.

---

## Do

- Keep forgot/reset password routes public and gated only by AuthView.
- Show link-style trust notices on forgot-password, reset-password, magic-link.
- Route operators to `/account/settings`; clients to profile where doctrine specifies.
- Keep `changeEmail: false` on auth provider.

## Don't

- Enable SDK `resetPasswordForEmail` bypass — use Neon Auth UI forms only.
- Expose `/account/teams`, `/account/organizations`, `/account/api-keys` without product decision.
- Enable social sign-in in UI without OAuth product approval.
- Use OTP copy on password reset surfaces.

---

## Code implementation (verified in repo)

| Requirement | Implementation |
| --- | --- |
| Forgot/reset public routes | `app/auth/[path]/page.tsx` + AuthView |
| Link trust copy (not OTP) on reset | `PortalAuthEmailTrustNotice` variant `link` |
| Magic link copy (existing users) | `portalCopy.magicLink.trustNotice` |
| Account tabs limited | `PORTAL_ACCOUNT_PATHS` = settings + security only; `notFound()` for others |
| `changeEmail: false` | `neonAuthUiProviderDefaults` + `PortalAuthProvider` |
| Auth metadata | `lib/auth-metadata.ts` — forgot, reset, magic-link, email-otp, accept-invitation |
| Manifest ↔ provider parity | `lib/auth/neon-auth.manifest.test.ts` |

---

## Definition of done

Production verification only — checklist: [post-deploy-verification.md](../post-deploy-verification.md#bl-07--account--credential-self-service-j3-j5-j7).

- [ ] Forgot → email → reset link → new password → sign-in works on production.
- [ ] Magic link sign-in works for existing user; new client directed to join flow (copy hint present).
- [ ] `/account/settings` updates display name; `/account/security` changes password.
- [x] No navigable route to hidden AccountView tabs (`generateStaticParams` + `isPortalAccountPath`).
- [x] Auth metadata titles correct for forgot/reset/magic-link/email-otp paths.

---

## Test & verification

| Layer | Command / action | Pass criteria |
| --- | --- | --- |
| L0 | `npm run test:unit -- lib/auth/neon-auth.manifest.test.ts` | Feature flags match provider defaults |
| Manual | Password reset flow | Link email received; reset succeeds |
| Manual | Magic link for existing client | Sign-in succeeds |
| Manual | Account settings name change | Persists on reload |
| Smoke | `e2e/smoke.spec.ts` auth ingress | Public auth routes reachable |

---

## Surfaces in scope

| Route | Purpose |
| --- | --- |
| `/auth/forgot-password` | Request reset link |
| `/auth/reset-password` | Set new password |
| `/auth/magic-link` | Email link sign-in |
| `/auth/email-otp` | OTP verification path |
| `/account/settings` | Display name |
| `/account/security` | Change password |

---

## Related docs

[portal-password-reset.md](../../../.agents/skills/neon-postgres/references/neon-auth/portal-password-reset.md)
