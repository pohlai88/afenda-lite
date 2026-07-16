# Portal — Neon Auth password reset

Password reset uses **Neon Auth UI** (`ForgotPasswordForm` / `ResetPasswordForm` via `AuthView`). Reset mail is delivered by Neon Auth through the project **Zoho SMTP** `email_provider` (not Neon shared `auth@mail.myneon.app`).

## Neon branch config (MCP: `get_neon_auth_config`)

- `auth_methods.email_password.enabled: true` → password reset is **automatically available** (no extra Neon Console toggle).
- Reset emails are sent via Zoho SMTP (`smtp.zoho.com` · sender `no-reply@nexuscanon.com`).
- Reset links expire after **15 minutes** ([Neon password reset docs](https://neon.com/docs/auth/guides/password-reset.md)).

## App wiring

| Piece | Location |
| --- | --- |
| Routes | `/auth/forgot-password`, `/auth/reset-password` (`apps/web/app/(public)/auth/[path]`) |
| Provider | `NeonAuthUIProvider` with forgot-password enabled; `baseURL` from client origin |
| Sign-in link | AuthView sign-in shows “Forgot password?” when credentials enable it |

`baseURL` must be the app origin so reset emails redirect to `{origin}/auth/reset-password?token=…`.

## User flow

1. `/auth/login` → **Forgot password?**
2. `/auth/forgot-password` → enter email → Neon sends **reset link** via Zoho SMTP
3. Click link → `/auth/reset-password?token=…` → set new password
4. Sign in with new password (or auto sign-in if enabled)

## Not the same as sign-up verification

- **Sign-up verification** (optional OTP) ≠ **password reset** (email link).
- Invited clients with **no account** must **sign up / sign in on `/join`** first; password reset only applies to **existing** accounts.

## References

- [ARCH-026](../../../../../docs/architecture/ARCH-026-auth-session.md) — Zoho SMTP lock
- [Neon password reset](https://neon.com/docs/auth/guides/password-reset.md)
- [Portal email verification](portal-email-verification.md)
