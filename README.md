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

- [docs/architecture/iam-check-doctrine.md](docs/architecture/iam-check-doctrine.md) — boundaries, CCP register, roadmap
- [docs/architecture/slices/](docs/architecture/slices/) — per-slice acceptance proofs (S0–S15)
- [docs/runbooks/production-go-live.md](docs/runbooks/production-go-live.md) — Vercel/Neon production verification
- [docs/portal-writing.md](docs/portal-writing.md) — UI copy and terminology

## Database migrations

Schema is versioned in [`db/migrations/`](db/migrations/). Apply before first run:

```bash
npm run db:migrate
```

Or apply via Neon MCP / Console against project **afenda** (`snowy-dawn-60990429`, branch `production`).

Migrations:

| File | Purpose |
|------|---------|
| `001_portal_schema.sql` | All portal tables and indexes |
| `002_backfill_questions.sql` | Seed `survey_questions` from legacy intro text |
| `003_drop_rating_comment.sql` | Remove legacy rating/comment columns |
| `004_audit_events.sql` | Audit event log for mutations |

The app no longer runs DDL on request — tables must exist before deploy.

## Neon configuration

| Setting | Value |
|---------|-------|
| Project ID | `snowy-dawn-60990429` |
| Branch | `production` (`br-young-term-aobkvd38`) |
| Database | `neondb` |

**Trusted domains:** `http://localhost:3000` and `https://iam-check.vercel.app`.

## GitHub

Repository: https://github.com/pohlai88/iam-check

## Vercel

| | |
|---|---|
| **Project** | `iam-check` |
| **Production URL** | https://iam-check.vercel.app |

Env vars: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `SHARED_ADMIN_*`, `APP_URL`.

## Local development

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run seed:admin
npm run dev
```

Open http://localhost:3000 → operator sign-in → `/dashboard`.

## CI and tests

GitHub Actions (`.github/workflows/ci.yml`) runs on PRs:

- `npm run check:copy` — portal terminology gate
- `npm run build`
- `npm run db:migrate` (requires `DATABASE_URL` secret; idempotent via `schema_migrations`)
- `npm test` — Playwright E2E (`e2e/smoke.spec.ts`, `e2e/secure-file.spec.ts`, `e2e/client-journey.spec.ts`)

Local:

```bash
npm run check:copy
npm test
npm run verify:production
```

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
| `/` | Operator | Sign in |
| `/dashboard` | Operator | Manage declarations |
| `/dashboard/clients` | Operator | Invite clients |
| `/dashboard/[id]` | Operator | View submissions |
| `/survey/[slug]` | Public | Open declaration link |
| `/f/[token]` | Public | Secure declaration link |
| `/client/login` | Client | Client sign in |
| `/client` | Client | Assigned declarations |
| `/client/declare/[id]` | Client | Complete assignment |
| `/invite/[token]` | Public | Accept client invite |

## Stack

- [Next.js](https://nextjs.org/) on Vercel
- [Neon Postgres](https://neon.tech/)
- [Neon Auth](https://neon.com/docs/auth/overview)
- shadcn/ui + Tailwind v4
