# Afenda-Lite

**Afenda-Lite** is the beta edition of **Afenda ERP** — a multi-module SaaS on shared Platform + Identity, running on Vercel, Neon Postgres, and Neon Auth.

Operators manage org roles and invitations under `/admin`; clients land on `/client` (`CLIENT_HOME`). Product **Declarations** and **Feed Farm Trade** modules have been removed (nuclear wipe) — do not document them as living product surfaces.

One deployable web app with organization-scoped data (`organization_id`), Neon-backed auth and Postgres, and living module surfaces that share platform RBAC — see Scratch [docs-V2/tenancy](docs-V2/tenancy/README.md).

For operators and org admins on platform + identity; for engineers extending `apps/web` and `packages/*`. Agent checkout doctrine lives in [AGENTS.md](./AGENTS.md).

> **Retired product name:** Client Declaration Portal — see [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

## What you get

- Operator sign-in and AdminCN shell for living modules (platform + identity / org-admin)
- Org invite + platform RBAC assign/revoke
- Client home shell at `/client`
- Health probes and Neon Auth session bridges

## Local development

**Engines:** Node.js `24.x` · pnpm `>=10.33.4` (see root `package.json`).

```bash
pnpm install
cp .env.example .env.local
# edit .env.local (required: DATABASE_URL, NEON_AUTH_*, APP_URL)
pnpm validate:neon-env
pnpm --filter @afenda/web dev
```

Open http://localhost:3000 → operator sign-in → `/admin`.

Env SSOT: `import { env } from '@afenda/env'` · local file `.env.local` (template: `.env.example`). Scratch packs: [docs-V2](docs-V2/README.md).

## Documentation

| Need | Start here |
|------|------------|
| Scratch packs | [docs-V2/README.md](docs-V2/README.md) |
| System layout | [docs-V2/system/README.md](docs-V2/system/README.md) |
| Tenancy | [docs-V2/tenancy/README.md](docs-V2/tenancy/README.md) |
| Modules | [docs-V2/modules/README.md](docs-V2/modules/README.md) |
| Official docs site | [`apps/docs`](apps/docs) (`@afenda/docs`) |
| Agent routing | [AGENTS.md](./AGENTS.md) · `/using-afenda-elite-skills` |

Product name SSOT and closed phases: [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

## Database migrations

Schema and migrations live in [`packages/db`](packages/db) (`drizzle/` + `src/schema/`). Canonical commands:

```bash
pnpm db:generate   # or: pnpm --filter @afenda/db db:generate
pnpm db:check      # journal assert + drizzle-kit check (also runs in CI)
pnpm db:migrate    # fail-closed; requires AFENDA_ALLOW_DB_MIGRATE=1; never auto-run on deploy
```

Product runtime requires pooled `DATABASE_URL` (`-pooler`). Migrate/ops may use the same key without `-pooler` (operator shell override only — no `DIRECT_*` product var).

The app does not run DDL on request — tables must exist before deploy. Do not apply a sole `0000_*.sql` baseline to live Neon when product tables already exist.

**Existing databases** (operator forward migrate only):

```bash
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate
```

**Empty public schema after intentional wipe** (Mode C sole baseline):

```bash
AFENDA_ALLOW_DB_MIGRATE=1 AFENDA_ALLOW_BASELINE_MIGRATE=1 pnpm db:migrate
```

## Auth and database

| Concern | Authority |
|---------|-----------|
| Postgres | Neon — `DATABASE_URL` (use `-pooler` host in production/serverless) |
| Auth | Neon Auth — `NEON_AUTH_*`, trusted domains |
| Schema | [`packages/db/drizzle/`](packages/db/drizzle/) |

## GitHub

Repository: https://github.com/pohlai88/afenda-lite

## Vercel

| | |
|---|---|
| **Project** | `afenda-lite` |
| **Production URL** | https://www.nexuscanon.com |
| **Legacy alias** | https://iam-check.vercel.app (same app — do not teach as current) |

Deploy: `.github/workflows/deploy.yml` (Environment `production`).

## CI and tests

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main` and on PRs:

- `pnpm install --frozen-lockfile`
- `pnpm exec turbo run lint typecheck test` (Biome · `tsc` · Vitest)
- Remote cache via `TURBO_TOKEN` (secret) + `TURBO_TEAM` (variable)

Local:

```bash
pnpm exec turbo run lint typecheck test
pnpm --filter @afenda/web dev
```

E2E (Playwright) when specs exist: `pnpm test:e2e` · `pnpm test:e2e:smoke` · `pnpm test:e2e:journey`. Factory SSOT: [`testing/`](testing/README.md).

Health endpoints:

- `GET /api/health/liveness` — process up (no dependency checks)
- `GET /api/health/readiness` — dependency readiness gate

## App routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | Public | Landing / session router |
| `/auth/*` | Public | Neon Auth island |
| `/join` | Public | Org invitation accept |
| `/admin` | Operator | Org-admin shell |
| `/client` | Client | Client home (`CLIENT_HOME`) |
| `/client/login` | Client | Gate |
| `/api/health/*` | Probes | Liveness / readiness |
| `/api/auth/*` | Neon | Auth proxy |
| `/api/session/*` | Session | Cookie / active-org bridges |

**Removed:** `/fft/**`, `/client/declarations/**`, Declarations share/survey product routes, declaration-draft RH.

## Stack

- [Next.js](https://nextjs.org/) on Vercel (`apps/web`)
- [Neon Postgres](https://neon.tech/) + [Neon Auth](https://neon.com/docs/auth/overview)
- Turborepo monorepo — `@afenda/*` packages under `packages/`
- `@afenda/ui-system` (shadcn/ui + Radix, flat barrel) + Tailwind v4
