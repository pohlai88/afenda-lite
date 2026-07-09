# Supabase (retired)

This document is a **tombstone** so old links do not imply Supabase is still in use.

## Current stack

| Concern | Authority |
|--------|-----------|
| Postgres | [Neon](https://neon.tech/) via `DATABASE_URL` |
| Schema | [`db/migrations/`](../../db/migrations/) — apply with `npm run db:migrate` |
| Auth | [Neon Auth](https://neon.com/docs/auth/overview) — org invites, sign-in, password reset |
| Client onboarding email | Neon Auth org invitation (`lib/email/send-client-onboarding-email.ts`) |

## Removed legacy artifacts

The following were deleted when auth and database moved off Supabase:

- `config.toml` — Supabase CLI / Auth redirect and invite settings
- `templates/invite.html` — Supabase Auth invite template (replaced by Neon Auth mail)

Do **not** re-add Supabase CLI config or `@supabase/*` client dependencies without an ADR and migration plan.

## Stale environment keys

These keys are **cleanup-only** on Vercel (see `lib/env/manifest.ts`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Remove them from production:

```bash
npm run cleanup:vercel
```

## Local development

See [AGENTS.md](../../AGENTS.md) and [docs/runbooks/local-dev-auth.md](../runbooks/local-dev-auth.md) — branch-first Neon dev, not `supabase start`.
