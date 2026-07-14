# Afenda-Lite

**Afenda-Lite** is the beta / lite edition of official **Afenda ERP** — a multi-module SaaS on shared Platform + Identity (Declarations, Feed Farm Trade, and more). Built on **Vercel + Neon Postgres + Neon Auth**.

> **Retired product name:** Client Declaration Portal — compulsory deprecate. See [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Local disk path:** prefer `C:\JackProject\afenda-bolt\afenda-lite`. If this clone is still named `client-declaration-portal`, close Cursor and run `C:\JackProject\afenda-bolt\rename-afenda-lite.ps1`, then reopen the `afenda-lite` folder.

## What you get

- Operator sign-in and AdminCN shell for entitled modules
- Declarations: dynamic forms, share links, invites, dashboard
- Feed Farm Trade: events, orders, allocation (entitlement-gated under `/fft`)
- Client invite, onboarding, and assigned declarations (module surfaces)
- Public and secure share links (`/survey/[slug]`, `/f/[token]`)

## Architecture

Internal full-stack doctrine and slice specs for agents and maintainers:

- [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) — **product name SSOT** + **closed product phases** (Afenda-Lite; Client Declaration Portal retired)
- [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) — Feed Farm Trade ops / program gates
- [docs/architecture/ARCH-022-system-overview.md](docs/architecture/ARCH-022-system-overview.md) — Target workspace layout (ARCH-021 migration map archived)
- [docs/architecture/ARCH-017-frontend-folder-map.md](docs/architecture/ARCH-017-frontend-folder-map.md) — frontend folder map
- [docs/README.md](docs/README.md) — unified design + ops index (`api/`, `architecture/`, `adr/`, `fft/`, `runbooks/`)

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

Repository: https://github.com/pohlai88/afenda-lite

## Vercel

| | |
|---|---|
| **Project** | `afenda-lite` |
| **Production URL** | https://afenda-lite.vercel.app |
| **Legacy alias** | https://iam-check.vercel.app (same app — do not teach as current) |

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

- `npm run check:copy` — terminology gate
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
PRODUCTION_URL=https://afenda-lite.vercel.app npm run verify:production
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
| `/dashboard/[declarationId]` | Operator | View submissions |
| `/fft/*` | Operator (entitled) | Feed Farm Trade module |
| `/survey/[slug]` | Public | Open declaration link |
| `/f/[token]` | Public | Secure declaration link |
| `/client` | Client | Assigned declarations |
| `/client/onboarding` | Client | Declarant profile setup |
| `/client/declare/[assignmentId]` | Client | Complete assignment |
| `/invite/[token]` | Public | Legacy invite URL → client sign-in |

**Local developer only:** `/playground` iframes routes for UI review (`PLAYGROUND_ENABLED` in `env.config`). Not a product entry — see [AGENTS.md](./AGENTS.md).

## Stack

- [Next.js](https://nextjs.org/) on Vercel
- [Neon Postgres](https://neon.tech/)
- [Neon Auth](https://neon.com/docs/auth/overview)
- shadcn/ui + Tailwind v4
