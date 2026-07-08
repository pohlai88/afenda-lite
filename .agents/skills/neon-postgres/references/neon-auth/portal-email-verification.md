# Portal — Neon Auth email (shared provider)

This project uses **Neon Auth’s default shared email provider** (`auth@mail.myneon.app`). Do not configure custom SMTP for Neon Auth unless the product owner explicitly requests it.

## Policy

- Read live config with Neon MCP `get_neon_auth_config` before advising on auth email behavior.
- **MailerSend** (`MAILERSEND_API_KEY`) is for **portal access emails** sent by the app (`lib/email/send-client-access-email.ts`), not for Neon Auth transactional mail.
- Do not add `NEON_AUTH_SMTP_*` env vars or scripts to push MailerSend into Neon Auth.

## Neon shared email + verification

With the shared provider, Neon Auth uses **verification codes** (OTP) when “Verify at sign-up” is enabled — not click-through links. Links require a custom SMTP provider.

Production branch (as of setup): `verify_email_on_sign_up: true`, `require_email_verification: false`, `email_verification_method: otp`, `email_provider.type: shared`.

Because verification is **not required** before sign-in, the `/join` flow is:

1. Sign up (`AuthView` sign-up)
2. Sign in (AuthView redirects here after sign-up)
3. Accept invitation

No custom verification UI in the portal — Neon Auth UI handles auth forms; optional verification emails come from Neon.

## Trusted domains

Register every app origin with Neon Auth. Production: `https://iam-check.vercel.app`. Local: `http://localhost:3000`.

```bash
neon neon-auth domain add https://iam-check.vercel.app
neon neon-auth domain list
```

Org invitation emails must use server-side `Origin`/`Referer` from `APP_URL` — see `lib/auth/neon-auth-request.ts`.

## References

- [Neon email verification](https://neon.com/docs/auth/guides/email-verification.md)
- [Neon Auth setup — Next.js](references/neon-auth/setup-nextjs.md)
