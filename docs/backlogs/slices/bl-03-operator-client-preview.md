# BL-03 — Operator client portal preview

**Backlog:** [backlog-01](../backlog-01-neon-auth-closure.md)  
**Priority:** P1  
**Journeys:** J6  
**Depends on:** BL-01  
**Status:** Code complete — verify on production → [post-deploy-verification.md](../post-deploy-verification.md#bl-03--operator-client-portal-preview-j6)

---

## Problem

Operators use “Preview client portal” to validate client UX. Production audit showed repeated `admin.client_preview_failed` with reason `session_mismatch` — preview redirected to unavailable page instead of `/client`.

---

## Issues to close

- Impersonation succeeded but immediate session re-read still showed operator identity.
- Preview sandbox user must exist and match configured preview email.
- Failure modes conflated “not configured” and “session handoff failed”.

---

## Expectation

Signed-in operator clicks preview → lands on client home as preview sandbox user → banner shows preview mode → “Return to organization” restores operator session.

---

## Do

- Verify preview client seeded (`npm run seed:preview-client`).
- Confirm `PREVIEW_CLIENT_EMAIL` / `PREVIEW_CLIENT_PASSWORD` on Vercel.
- Use preview only for UX validation — not for production client data entry.
- Record `admin.client_preview_started` / `ended` in audit review.

## Don't

- Treat playground iframe embed as production client flow.
- Use preview mode to submit real client declarations on production without policy sign-off.
- Share preview credentials with external clients.

---

## Definition of done

Production verification only — checklist: [post-deploy-verification.md](../post-deploy-verification.md#bl-03--operator-client-portal-preview-j6).

- [ ] Operator preview on production: lands on `/client` without `/client/preview-unavailable`.
- [ ] Audit shows `admin.client_preview_started` (not `session_mismatch`).
- [ ] Exit preview returns operator to dashboard with valid operator session.
- [ ] Preview unavailable page only shown when sandbox user missing or impersonation API errors.

---

## Test & verification

| Layer | Command / action | Pass criteria |
| --- | --- | --- |
| Seed | `npm run seed:preview-client` | Preview user exists in Neon Auth |
| Manual (prod) | Dashboard → Preview client portal | Client home loads; preview banner visible |
| Audit | `admin.client_preview_*` events | Started event present; no session_mismatch |
| Architecture | Review [s16-admin-client-preview.md](../../architecture/slices/s16-admin-client-preview.md) | Behaviour matches spec |

---

## Related spec

[s16-admin-client-preview.md](../../architecture/slices/s16-admin-client-preview.md)
