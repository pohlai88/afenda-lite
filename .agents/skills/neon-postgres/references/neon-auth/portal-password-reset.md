# Portal — Neon Auth password reset

Password reset uses **Neon Auth UI** (`ForgotPasswordForm` / `ResetPasswordForm` via `AuthView`) with the **default shared email provider**.

## Neon branch config (MCP: `get_neon_auth_config`)

- `auth_methods.email_password.enabled: true` → password reset is **automatically available** (no extra Neon Console toggle).
- Reset emails come from `auth@mail.myneon.app`.
- Reset links expire after **15 minutes** ([Neon password reset docs](https://neon.com/docs/auth/guides/password-reset.md)).

## App wiring

| Piece | Location |
| --- | --- |
| Routes | `/auth/forgot-password`, `/auth/reset-password` (`app/auth/[path]`) |
| Provider | `NeonAuthUIProvider` with `credentials.forgotPassword: true`, `baseURL` from client origin |
| Copy | `portalCopy.passwordReset` — **link** language, not OTP |
| Sign-in link | AuthView sign-in shows “Forgot password?” when credentials enable it |

`baseURL` must be the app origin so reset emails redirect to `{origin}/auth/reset-password?token=…`. See `lib/auth/neon-auth-ui-base-url.ts`.

## User flow

1. `/auth/sign-in` → **Forgot password?**
2. `/auth/forgot-password` → enter email → Neon sends **reset link**
3. Click link → `/auth/reset-password?token=…` → set new password
4. Sign in with new password (or auto sign-in if enabled)

## Not the same as sign-up verification

- **Sign-up verification** (optional OTP) ≠ **password reset** (email link).
- Invited clients with **no account** must **sign up on `/join`** first; password reset only applies to **existing** accounts.

## References

- [Neon password reset](https://neon.com/docs/auth/guides/password-reset.md)
- [Portal email verification](portal-email-verification.md)
