# ARCH-022 System Overview

| Field | Value |
|-------|-------|
| ID | ARCH-022 |
| Category | Architecture |
| Version | 1.2.0 |
| Status | Target |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing / Target.** Describes the intended Turborepo system. Authoritative for new work. Missing `apps/` or `packages/` on disk is expected until implementation ([ARCH-028](ARCH-028-implementation-slices.md)).

## Context

Afenda-Lite is a multi-tenant SaaS product hosted on Vercel. **Target:** it will be structured as a **Turborepo multi-package monorepo** with one deployable application (`apps/web`) and shared infrastructure packages (`packages/*`). This document is the entry point. Layer detail lives in sibling ARCH docs; decisions live in `docs/adr/turborepo/`.

## From current checkout → target

| Problem | Current (Living / checkout) | Day-1 correct (this Target) |
|---------|-----------------------------|-----------------------------|
| No Turborepo | Single root `package.json` monolith | `turbo.json` + pnpm workspaces |
| No ORM | Raw `pg` SQL in domain | Drizzle in `@afenda/db` — schema-first migrations |
| No package boundary | One `node_modules`, one build cache | Isolated `@afenda/*` packages + Turbo remote cache |
| Custom env compose | `env.config` + `env.secret` + `env:compose` → `.env` | `@t3-oss/env-nextjs` + `.env.local` ([ARCH-027](ARCH-027-env-model.md)) |
| Auth sprawl | Neon Auth + scattered `lib/auth/*` | All Neon Auth SDK use inside `@afenda/auth` |
| Flat domain at root | `modules/` / `features/` at repo root when present | Domain stays in `apps/web/modules/`; shared infra in `packages/` |
| No email package | Templates not isolated | `@afenda/emails` (React Email) |
| Dead shared `lib/` | `lib/env/`, `lib/auth/`, `lib/db/` co-located | Moved into packages or deleted at cutover |

Until S4.1 ([ARCH-028](ARCH-028-implementation-slices.md)) ships, **Living** ops in `AGENTS.md` (compose / `env:guard`) remain for the current monolith. Do not mix the two models in one change set.

## Day-1 technology stack (target)

| Layer | Choice |
|-------|--------|
| Workspace | Turborepo + pnpm workspaces |
| App | Next.js 16 App Router, React 19, one Vercel deployable |
| DB | Neon Postgres + Drizzle ORM + `@neondatabase/serverless` |
| Auth | Neon Auth via `@afenda/auth` |
| Env | `@t3-oss/env-nextjs` in `@afenda/env`; `.env.local` only |
| UI | `@afenda/ui` — shadcn + Tailwind v4 tokens |
| Email | `@afenda/emails` — React Email |
| Lint / TS | Biome + shared tsconfigs from `@afenda/config` |
| Test | Vitest + Playwright (wired through `turbo` tasks) |

## Responsibilities and boundaries

| Layer | Owner | What it does |
|-------|-------|-------------|
| `apps/web` | Product | Next.js App Router — routes, RSC, Server Actions, thin API handlers |
| `packages/db` | Platform | Drizzle schema, migrations, `withOrg` |
| `packages/auth` | Platform | `getSession`, `requireRole`, `inviteOrgMember` |
| `packages/env` | Platform | Validated typed config |
| `packages/ui` | Frontend | Design system components + `globals.css` |
| `packages/emails` | Platform | Transactional email templates |
| `packages/config` | Platform | Biome + tsconfig bases (not runtime) |

`apps/web` depends on all packages. Packages import each other only via public exports — never `src/` internals.

## Target tree

```
afenda-lite/
├── turbo.json
├── pnpm-workspace.yaml          # packages: ["apps/*", "packages/*"]
├── package.json                 # root: turbo, biome, tsx only (devDeps)
│
├── apps/
│   └── web/                     # sole Vercel deployable
│       ├── app/
│       │   ├── (public)/        # /, /join, /auth/*, /403
│       │   ├── (operator)/      # /admin/* — requireRole('operator')
│       │   └── (client)/        # /client/* — requireRole('client')
│       ├── features/            # auth, declarations, fft, org-admin
│       └── modules/             # identity, declarations, fft, platform
│
├── packages/
│   ├── db/       → @afenda/db
│   ├── auth/     → @afenda/auth
│   ├── env/      → @afenda/env
│   ├── ui/       → @afenda/ui
│   ├── emails/   → @afenda/emails
│   └── config/   → @afenda/config
│
├── docs/
│   ├── architecture/turborepo/  # this set
│   └── adr/turborepo/           # ADR-010…014
│
└── .github/workflows/
    ├── ci.yml                   # turbo lint typecheck test
    └── deploy.yml               # turbo build --filter=@afenda/web
```

## Target `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:check": { "cache": false },
    "email:dev": { "cache": false, "persistent": true }
  }
}
```

## Data / request flow

```
Browser
  │
  ▼
Next.js App Router (apps/web)
  ├── RSC read ──────────────► modules/*/domain → @afenda/db withOrg(orgId) → Neon
  ├── Server Action write ───► modules/*/domain → @afenda/db
  └── Route Handler ───────── health / auth proxy / external REST only
```

`getSession()` at entry → pass `orgId` explicitly into domain. No ambient org inference.

**Forbidden:** RSC fetching the app’s own `/api/*` for ordinary reads.

## Key decisions

| Decision | ADR |
|----------|-----|
| Turborepo monorepo | [ADR-010](../../adr/turborepo/ADR-010-turborepo-monorepo.md) |
| Drizzle ORM | [ADR-011](../../adr/turborepo/ADR-011-drizzle-orm.md) |
| Shared-schema tenancy | [ADR-012](../../adr/turborepo/ADR-012-shared-schema-tenancy.md) |
| Neon Auth | [ADR-013](../../adr/turborepo/ADR-013-neon-auth.md) |
| `@t3-oss/env-nextjs` | [ADR-014](../../adr/turborepo/ADR-014-t3-env.md) |

## Sibling architecture docs

| Doc | Job |
|-----|-----|
| [ARCH-023](ARCH-023-multi-tenancy.md) | Tenancy + RBAC flow |
| [ARCH-024](ARCH-024-package-boundaries.md) | Package public contracts |
| [ARCH-025](ARCH-025-data-layer.md) | Drizzle / migrations / `withOrg` |
| [ARCH-026](ARCH-026-auth-session.md) | Session + invitations |
| [ARCH-027](ARCH-027-env-model.md) | Env schema + `.env.local` |
| [ARCH-028](ARCH-028-implementation-slices.md) | Ordered build slices (docs plan for implementers) |

## Failure modes

| Failure | Recovery |
|---------|----------|
| Neon down | PITR / status page |
| Neon Auth down | No auth fallback |
| Bad Vercel deploy | Dashboard rollback |
| Missing env | Startup Zod failure — fix `.env.local` / Vercel env |

## Operational considerations

- Build: `turbo run build --filter=@afenda/web`
- Dev: `pnpm --filter @afenda/web dev`
- Remote cache: `TURBO_TOKEN` (Vercel)
- One deployable until a new ADR adds another app

## Known limits

- Private workspace packages only (no npm publish until a separate decision)
- Module extraction to a service requires a new ADR
- Product tree may be absent on disk (wipe / rebuild); treat Target docs as authority, not invent a third layout

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.2.0 | 2026-07-13 | Gap table (checkout → Target); Living compose vs Target env note |
| 1.1.0 | 2026-07-13 | Full target stack + turbo.json |
| 1.0.0 | 2026-07-13 | Initial Target overview |
|