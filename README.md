# Client Declaration Portal

Client portal for authenticated declarations and secure submission links. Built on **Vercel + Neon Postgres + Neon Auth**.

## What you get

- Operator sign-in for managing declarations
- Dynamic declaration forms (yes/no, text, file metadata)
- Public and secure share links (`/survey/[slug]`, `/f/[token]`)
- Client invite, onboarding, and assigned declarations
- Dashboard with submissions and pending client assignments

## Architecture

Internal full-stack doctrine and slice specs for agents and maintainers:

- [docs/TRACKING.md](docs/TRACKING.md) — **program status SSOT** (gates, backlog, open gaps)
- [docs/architecture/iam-check-doctrine.md](docs/architecture/iam-check-doctrine.md) — boundaries, CCP register, roadmap
- [docs/architecture/repo-layout.md](docs/architecture/repo-layout.md) — **Root / L1 / L2 folder rules** (where code lives)
- [docs/architecture/slices/](docs/architecture/slices/) — per-slice acceptance proofs (S0–S18)
- [docs/backlogs/post-deploy-verification.md](docs/backlogs/post-deploy-verification.md) — production sign-off checklist

## Database migrations

Schema is versioned in [`db/migrations/`](db/migrations/). Apply before first run:

```bash
npm run db:migrate
```

Apply against your Neon branch (`DATABASE_URL` in `env.secret`). See [docs/runbooks/local-dev-auth.md](docs/runbooks/local-dev-auth.md).

The app no longer runs DDL on request — tables must exist before deploy.

## Auth and database

| Concern | Authority |
|---------|-----------|
| Postgres | Neon — `DATABASE_URL` (use `-pooler` host in production/serverless) |
| Auth | Neon Auth — `NEON_AUTH_BASE_URL`, trusted domains per [AGENTS.md](./AGENTS.md) |
| Schema | [`db/migrations/`](db/migrations/) |

Legacy Supabase CLI config was removed; see [supabase/README.md](supabase/README.md).

## GitHub

Repository: https://github.com/pohlai88/iam-check

## Vercel

| | |
|---|---|
| **Project** | `iam-check` |
| **Production URL** | https://iam-check.vercel.app |

Env vars: `DATABASE_URL`, `NEON_AUTH_*`, `SHARED_ADMIN_*`, `APP_URL`. Source of truth: `env.config` + `env.secret` → `npm run env:compose`. Stale Supabase keys: `npm run cleanup:vercel`.

## Local development

```bash
npm install
cp env.config.example env.config
cp env.secret.example env.secret
# edit env.config / env.secret, then:
npm run env:compose
npm run db:migrate
npm run seed:admin
npm run dev
```

Open http://localhost:3000 → operator sign-in → `/dashboard`.

## CI and tests

GitHub Actions (`.github/workflows/ci.yml`) runs on PRs:

- `npm run check:copy` — portal terminology gate
- `npm run build`
- `npm run db:migrate` (requires `DATABASE_URL` secret)
- `npm test` — Playwright E2E (`e2e/smoke.spec.ts`, `e2e/secure-file.spec.ts`, `e2e/client-journey.spec.ts`)

Local:

```bash
npm run check:copy
npm test
npm run verify:production
```

Health endpoints:

- `GET /api/health/liveness` — Vercel uptime monitors (process up, no dependency checks)
- `GET /api/health/readiness` — deploy gate (`npm run verify:production`)

Production readiness (no secrets printed):

```bash
PRODUCTION_URL=https://iam-check.vercel.app npm run verify:production
```

See [docs/runbooks/production-go-live.md](docs/runbooks/production-go-live.md) for full go-live checklist.

**Existing databases** (migrated before tracking): run once, then `db:migrate`:

```bash
npm run db:backfill
npm run db:migrate
```

Optional E2E: `E2E_SURVEY_SLUG` only if you skip the operator-create → public chain test.

## App routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/`, `/client/login` | Client | Session router → Neon Auth or `/client` / onboarding |
| `/org/login` | Operator | Organization sign in |
| `/dashboard` | Operator | Manage declarations |
| `/dashboard/clients` | Operator | Invite clients |
| `/dashboard/[id]` | Operator | View submissions |
| `/survey/[slug]` | Public | Open declaration link |
| `/f/[token]` | Public | Secure declaration link |
| `/client` | Client | Assigned declarations |
| `/client/onboarding` | Client | Declarant profile setup |
| `/client/declare/[id]` | Client | Complete assignment |
| `/invite/[token]` | Public | Legacy invite URL → client sign-in |

**Local developer only:** `/playground` iframes routes for UI review (`PLAYGROUND_ENABLED` in `env.config`). Not part of the client or operator product — see [AGENTS.md](./AGENTS.md).

## Stack

- [Next.js](https://nextjs.org/) on Vercel
- [Neon Postgres](https://neon.tech/)
- [Neon Auth](https://neon.com/docs/auth/overview)
- shadcn/ui + Tailwind v4
