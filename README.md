# Afenda-Lite

**What it is** — Afenda-Lite is the beta edition of **Afenda ERP**: a multi-module SaaS on shared Platform + Identity, built on Vercel, Neon Postgres, and Neon Auth.

**What it does** — Operators manage declarations, clients, and org roles; entitled users run Feed Farm Trade under `/fft`. Public and secure share links let declarants complete assignments without operator accounts.

**Need it meets** — One deployable web app with hard tenant boundaries, Neon-backed auth and data, and module surfaces that share platform RBAC instead of ad hoc per-app stacks.

**Who it is for** — Operators and org admins running declarations and FFT; engineers extending `apps/web` and `packages/*`; agents routing work through `docs/` and [AGENTS.md](./AGENTS.md).

> **Retired product name:** Client Declaration Portal — see [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Local disk path:** prefer `C:\JackProject\afenda-bolt\afenda-lite`. If this clone is still named `client-declaration-portal`, close Cursor and run `C:\JackProject\afenda-bolt\rename-afenda-lite.ps1`, then reopen the `afenda-lite` folder.

## What you get

- Operator sign-in and AdminCN shell for entitled modules
- Declarations: dynamic forms, share links, invites, dashboard
- Feed Farm Trade: events, orders, allocation (entitlement-gated under `/fft`)
- Client invite, onboarding, and assigned declarations (module surfaces)
- Public and secure share links (`/survey/[slug]`, `/f/[token]`)

## Local development

```bash
pnpm install
cp .env.example .env.local
# edit .env.local (required: DATABASE_URL, NEON_AUTH_*, APP_URL)
pnpm validate:neon-env
pnpm --filter @afenda/web dev
```

Open http://localhost:3000 → operator sign-in → `/dashboard`.

Env SSOT: `import { env } from '@afenda/env'` · local file `.env.local` (template: `.env.example`). See [ARCH-027](docs/architecture/ARCH-027-env-model.md) and [RB-005](docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md).

## Documentation

| Need | Start here |
|------|------------|
| Docs index | [docs/README.md](docs/README.md) |
| System layout | [ARCH-022](docs/architecture/ARCH-022-system-overview.md) |
| Tenancy + RBAC | [ARCH-023](docs/architecture/ARCH-023-multi-tenancy.md) |
| Packages + UI barrel | [ARCH-024](docs/architecture/ARCH-024-package-boundaries.md) · [ADR-010](docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) |
| Data + migrations | [ARCH-025](docs/architecture/ARCH-025-data-layer.md) |
| Auth + session | [ARCH-026](docs/architecture/ARCH-026-auth-session.md) |
| FFT ops | [FFT-MOD-008](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Platform runbooks | [docs/runbooks/README.md](docs/runbooks/README.md) |
| Agent routing | [AGENTS.md](./AGENTS.md) · `/using-afenda-elite-skills` |

Product name SSOT and closed phases: [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

## Database migrations

Schema and migrations live in [`packages/db`](packages/db) (`drizzle/` + `src/schema/`). Canonical commands:

```bash
pnpm db:generate   # or: pnpm --filter @afenda/db db:generate
pnpm db:check      # journal assert + drizzle-kit check (also runs in CI)
pnpm db:migrate    # fail-closed; requires AFENDA_ALLOW_DB_MIGRATE=1; never auto-run on deploy
```

Product runtime requires pooled `DATABASE_URL` (`-pooler`). Migrate/ops may use the same key without `-pooler` (operator shell override only — no `DIRECT_*` product var). See [ARCH-025](docs/architecture/ARCH-025-data-layer.md).

The app does not run DDL on request — tables must exist before deploy. Do not apply `0000_living-roots-baseline.sql` to live Neon.

**Existing databases** (operator forward migrate only):

```bash
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate
```

Root `pnpm db:backfill` remains unavailable (Collapse inventory).

## Auth and database

| Concern | Authority |
|---------|-----------|
| Postgres | Neon — `DATABASE_URL` (use `-pooler` host in production/serverless) |
| Auth | Neon Auth — `NEON_AUTH_*`, trusted domains — [ARCH-026](docs/architecture/ARCH-026-auth-session.md) |
| Schema | [`packages/db/drizzle/`](packages/db/drizzle/) |

## GitHub

Repository: https://github.com/pohlai88/afenda-lite

## Vercel

| | |
|---|---|
| **Project** | `afenda-lite` |
| **Production URL** | https://afenda-lite.vercel.app |
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

## Stack

- [Next.js](https://nextjs.org/) on Vercel (`apps/web`)
- [Neon Postgres](https://neon.tech/) + [Neon Auth](https://neon.com/docs/auth/overview)
- Turborepo monorepo — `@afenda/*` packages under `packages/`
- `@afenda/ui-system` (shadcn/ui + Radix, flat barrel) + Tailwind v4
