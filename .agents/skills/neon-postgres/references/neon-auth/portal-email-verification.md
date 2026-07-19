# Portal — Neon Auth email (Zoho SMTP)

This project uses **Zoho SMTP** as Neon Auth’s `email_provider` (host `smtp.zoho.com`, sender `no-reply@nexuscanon.com`). Do **not** revert to Neon’s shared provider (`auth@mail.myneon.app`) without an explicit Docs reopen of [ARCH-026](../../../../../docs/architecture/ARCH-026-auth-session.md).

## Policy

- Read live config with Neon MCP `get_neon_auth_config` before advising on auth email behavior.
- Expect `email_provider.type: standard` with Zoho host/sender — secrets stay in Neon Console / MCP (`***redacted***`); never copy into app env or git.
- **Client onboarding** uses Neon Auth **organization invitations** via `@afenda/auth` `inviteOrgMember`. There is no separate app SMTP for Neon Auth flows.
- Do not add `NEON_AUTH_SMTP_*` (or other app-side SMTP) env vars for Neon Auth.

## Verification + delivery

With Zoho SMTP configured, Neon Auth can send verification and transactional mail under the project brand. Prefer live `get_neon_auth_config` over stale “shared provider” assumptions.

Production branch posture (verify live): `verify_email_on_sign_up`, `require_email_verification`, `email_verification_method`, and `email_provider` as returned by MCP.

Because verification may still be **not required** before sign-in, the `/join` flow is typically:

1. Sign up or sign in (`AuthView`)
2. Complete email verification when Neon requires it before org accept
3. Accept invitation
4. Continue to role home

No custom verification UI beyond Neon Auth `AuthView`; OTP / link mail comes from the Zoho sender configured on Neon Auth.

## Trusted domains

Register every app origin with Neon Auth. Production: `https://www.nexuscanon.com`. Local: `http://localhost:3000`.

```bash
neon neon-auth domain add https://www.nexuscanon.com
neon neon-auth domain list
```

Org invitation API calls must use server-side `Origin`/`Referer` from production `APP_URL` — see `@afenda/auth` `inviteOrgMember` / `requireAppOrigin`.

## References

- [ARCH-026 Authentication and Session Model](../../../../../docs/architecture/ARCH-026-auth-session.md)
- [Neon email verification](https://neon.com/docs/auth/guides/email-verification.md)
- [Neon Auth setup — Next.js](references/neon-auth/setup-nextjs.md)
