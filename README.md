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

## Code generation

Scaffolding and package/feature governance run through Turborepo generators ([`turbo/generators`](turbo/generators/config.ts)) — built on `turbo gen`. Two families: `kernel` (`packages/foundation|runtime|data-plane|control-plane`) and `erp` (`packages/erp/*`). Contract SSOT and slice roadmap: [docs-V2/monorepo](docs-V2/monorepo/generator-architecture-prd.md) (`g1`…`g17`).

> **Local-only by contract.** Generator governance declares `ciRequired: false` and excludes `.github/workflows/*` — it is enforced on developer machines, never in CI. Run it locally; do not add it to CI workflows.

**Read-only (safe — inspect and plan):**

```bash
pnpm gen                  # interactive picker (all generators)
pnpm gen:doctor:kernel    # kernel discovery + contract diagnostics
pnpm gen:doctor:erp       # erp diagnostics + manifest/layout/projection authority
pnpm gen:plan:kernel      # read-only kernel upgrade plan
pnpm gen:plan:erp         # read-only erp upgrade plan
pnpm generator:check      # governance gate (also part of `pnpm checks`)
```

**Write (scaffold — prompts for ids; transactional, refuses to clobber):**

```bash
pnpm turbo gen erp-generator-create-package             # new ERP package (moduleId, category)
pnpm turbo gen erp-generator-add-feature                # feature into a package (moduleId, featureId)
pnpm turbo gen erp-generator-reconcile-projection-locks # apply missing projection-lock files
pnpm turbo gen kernel-generator-apply-adoption          # reconcile kernel adoption surfaces
```

`pnpm generator:check` is wired into `pnpm checks` / `pnpm build:check` (local gates in [`scripts/run-checks.mjs`](scripts/run-checks.mjs)); it is skipped automatically if the generator engine is absent. Engine logic is unit-tested via the `repo-tooling` Vitest project ([`turbo/generators/__tests__`](turbo/generators/__tests__)), which does run in CI.

## Documentation

| Need | Start here |
|------|------------|
| Scratch packs | [docs-V2/README.md](docs-V2/README.md) |
| Project map (quick index) | [docs-V2/project-map.md](docs-V2/project-map.md) |
| System layout | [docs-V2/system/README.md](docs-V2/system/README.md) |
| Tenancy | [docs-V2/tenancy/README.md](docs-V2/tenancy/README.md) |
| Modules | [docs-V2/modules/README.md](docs-V2/modules/README.md) |
| Official docs site | [`apps/docs`](apps/docs) (`@afenda/docs`) |
| Agent routing | [AGENTS.md](./AGENTS.md) · `/using-afenda-elite-skills` |

Product name SSOT and closed phases: [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

## Database migrations

Schema and migrations live in [`packages/data-plane/db`](packages/data-plane/db) (`drizzle/` + `src/schema/`). Canonical commands:

```bash
pnpm db:generate   # or: pnpm --filter @afenda/db db:generate
pnpm db:check      # journal assert + drizzle-kit check (also runs in CI)
pnpm db:migration-status  # read-only journal vs Neon ledger (ops)
pnpm db:migrate    # fail-closed; requires AFENDA_ALLOW_DB_MIGRATE=1; never auto-run on deploy
```

No `db:push`, no ad-hoc `apply-*.mjs`, no Neon MCP DDL for schema changes — only the guarded migrate path above.

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
| Schema | [`packages/data-plane/db/drizzle/`](packages/data-plane/db/drizzle/) |

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
