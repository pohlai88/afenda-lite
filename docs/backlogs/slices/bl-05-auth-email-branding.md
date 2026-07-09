# BL-05 — Auth email branding & sender trust

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P2  
**Journeys:** J1, J2, J3, J4  
**Depends on:** BL-04  
**Status:** Manual (Neon Console) — [post-deploy-verification.md](../post-deploy-verification.md#bl-05--email-branding-console-not-deploy)

---

## Problem

In-app copy and delivery banners use **Client Declaration Portal** as the product name, but Neon Auth transactional emails may show sender name **Neon Auth** and Neon Console project name **iam-check**. Clients may not recognize invitation, OTP, or reset emails.

---

## Issues to close

- Neon Console application name not set to product name.
- Operator delivery banner `fromName` differs from actual email sender display name.
- Trust notices in UI reference “secure auth service” — acceptable but should align with post-branding sender.
- `neonAuthUiApplicationName` exports `PORTAL_NAME` for copy only — **`NeonAuthUIProvider` has no `applicationName` prop**; email display name is Neon Console only.

---

## Expectation

Clients recognize invitation, verification, and password-reset emails as coming from the portal they were told to expect — consistent naming in inbox and in UI trust notices.

---

## Do

- Set Neon Console → Auth → Configuration → Application Name to **Client Declaration Portal**.
- Review shared sender `auth@mail.myneon.app` with stakeholders (cannot change address on shared provider).
- Keep trust notices on OTP, link, magic-link, and org-invite surfaces.
- Update manifest `productionChecklist.applicationName` if product name changes.

## Don't

- Configure custom SMTP solely for display name without volume/policy approval.
- Promise clients a custom from-address while on shared provider.
- Change trust copy to reference a sender domain you do not control.

---

## Definition of done

Console verification — checklist: [post-deploy-verification.md](../post-deploy-verification.md#bl-05--email-branding-console-not-deploy).

- [ ] Neon Console application name matches `PORTAL_NAME` / manifest checklist.
- [ ] Sample invitation, OTP, and reset emails reviewed for display name and link targets.
- [ ] Production invite email links resolve to `APP_URL` `/join` flow.
- [ ] Operator banner copy still accurate after any sender name change.

---

## Test & verification

| Layer | Action | Pass criteria |
| --- | --- | --- |
| Manual | Trigger invite + sign-up OTP + password reset | Emails received; links work |
| Manual | Compare inbox sender to UI trust notice | No contradictory product naming |
| Checklist | Neon production auth audit item 3 | Manual item marked complete |

---

## Out of scope

- MailerSend branding (app-sent mail only, not Neon Auth).
