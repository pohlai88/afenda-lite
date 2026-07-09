# Portal — Neon Auth email (shared provider)

This project uses **Neon Auth’s default shared email provider** (`auth@mail.myneon.app`). Do not configure custom SMTP for Neon Auth unless the product owner explicitly requests it.

## Policy

- Read live config with Neon MCP `get_neon_auth_config` before advising on auth email behavior.
- **Client onboarding** uses Neon Auth **organization invitations** (`lib/email/send-client-onboarding-email.ts` → `inviteClientOrganizationMember`). There is no separate app email provider.
- Do not add `NEON_AUTH_SMTP_*` env vars unless explicitly requested.

## Neon shared email + verification

With the shared provider, Neon Auth uses **verification codes** (OTP) when “Verify at sign-up” is enabled — not click-through links. Links require a custom SMTP provider.

Production branch (as of setup): `verify_email_on_sign_up: true`, `require_email_verification: false`, `email_verification_method: otp`, `email_provider.type: shared`.

Because verification is **not required** before sign-in, the `/join` flow is:

1. Sign up (`AuthView` sign-up)
2. Verify email (`AuthView` email-otp) — **required before org accept** (Neon returns 403 otherwise)
3. Accept invitation
4. Sign in only if returning with an existing account

No custom verification UI beyond Neon Auth `AuthView`; OTP email comes from `auth@mail.myneon.app`.

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
