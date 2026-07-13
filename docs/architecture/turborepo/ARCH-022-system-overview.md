# ARCH-022 System Overview

| Field | Value |
|-------|-------|
| ID | ARCH-022 |
| Category | Architecture |
| Version | 1.4.0 |
| Status | Target |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing / Target.** Describes the intended Turborepo system. Authoritative for new work. Missing `apps/` or `packages/` on disk is expected until implementation ([ARCH-028](ARCH-028-implementation-slices.md)).

## Context

Afenda-Lite is a multi-tenant SaaS product hosted on Vercel. **Target:** it will be structured as a **Turborepo multi-package monorepo** with one deployable application (`apps/web`) and shared infrastructure packages (`packages/*`). This document is the entry point for **system architecture**, including the Modular Monolith + Hexagonal framework and the Turborepo workspace decision (former ADR-010). Layer detail lives in sibling ARCH docs and `docs/architecture/backend/`.

## Workspace decision — Turborepo + pnpm (from ADR-010)

**Decision:** Use **Turborepo** with **pnpm workspaces**. One app (`apps/web`) and six shared packages (`packages/*`). Turborepo orchestrates the task graph. pnpm enforces workspace isolation. The root `package.json` holds devDeps only.

| Positive | Accepted cost |
|----------|---------------|
| Build cache boundaries (`@afenda/ui` change ≠ rebuild `@afenda/db`) | pnpm required — npm/yarn not equivalent |
| `src/` internals unreachable across package lines | New package → update `pnpm-workspace.yaml` |
| One root command: `turbo run build|test|typecheck` | Stale `dependsOn` → incorrect cache hits |
| Vercel Turborepo remote cache | |

| Alternative | Why rejected |
|-------------|--------------|
| Flat monolith (single `package.json`) | No cache boundaries; infra bleeds into domain |
| Nx | Higher config overhead than needed |
| Microservices | No ops justification at this stage |
| Multi-repo | Coordinated versioning slows infra+product changes |

**Constraints that must not be broken:**

- `apps/web` is the only Vercel deploy target until a superseding architecture decision
- Packages under `packages/*` are private workspace packages — not published to npm without a separate decision
- Root `package.json` holds devDeps only — no runtime product deps at root
- Cross-package imports use `@afenda/*` names only — never relative `../../../packages/`

Package surface detail: [ARCH-024](ARCH-024-package-boundaries.md).

## System framework — Modular Monolith + Hexagonal

**Sole framework version:** Next.js App Router **Modular Monolith + Hexagonal Architecture (Ports & Adapters)** inside one deployable.

**Sole contract version:** one port catalog + one REST catalog (`docs/api`); Server Actions and Route Handlers are adapters of the same ports.

| Rule | Choice |
|------|--------|
| Deployable | Single Next.js app (`apps/web` Target; root app until cutover) |
| Workspace | Turborepo + pnpm — shared infra in `packages/*` (this doc § Workspace) |
| Persistence | Single Neon database |
| Domain | Bounded contexts in `modules/{platform,identity,declarations,fft}` (under `apps/web` Target) |
| Driving adapters | RSC / Server Actions / `app/api` Route Handlers |
| Validation | Zod in `modules/*/schemas` at adapter edge only |
| Public HTTP | One REST catalog — extend additively |
| Action results | Same error `code` vocabulary as HTTP ([API-002](../../api/API-002-error-contract.md)) |
| Runtime | Node default; Edge only as documented exception |

Absorbed from former ADR-001 (deleted). Backend layer maps remain under [../backend/](../backend/).

### Consequences

**Positive:** scales Identity / Declarations / Trade / Platform without network hops; matches intended code shape; one mental model for BFF + ports.

**Accepted costs:** modules share one DB — schema ownership required; extracting a service later needs an explicit ADR (not accidental).

### Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Microservices (Trade separate deployable) | Premature; doubles ops; shared Neon Auth/session complexity |
| GraphQL or tRPC beside REST | Second contract version |
| `/api/v1` + `/api/v2` | Violates one-version rule |
| Edge runtime as default | Neon/DB drivers and session model assume Node |
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; duplicates domain ([ARCH-013](../frontend/ARCH-013-bff-and-data-flow.md)) |
| Hand-written DTOs parallel to Zod | Drift; two sources of truth |
| Fat catch-all `lib/domain` as permanent home | Relocated to bounded `modules/*` |

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
│   └── architecture/turborepo/  # ARCH-022…028 (system + tenancy + packages)
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

| Decision | Authority |
|----------|-----------|
| Modular Monolith + Hexagonal (system framework) | **This doc** (absorbed ADR-001) |
| Turborepo monorepo | **This doc** § Workspace (absorbed ADR-010) · [ARCH-024](ARCH-024-package-boundaries.md) |
| Drizzle ORM | [ARCH-025](ARCH-025-data-layer.md) (absorbed ADR-011) |
| Shared-schema tenancy | [ARCH-023](ARCH-023-multi-tenancy.md) § Shared-schema (absorbed ADR-012) |
| Neon Auth | [ARCH-026](ARCH-026-auth-session.md) (absorbed ADR-013) |
| `@t3-oss/env-nextjs` | [ARCH-027](ARCH-027-env-model.md) (absorbed ADR-014) |
| Platform tenancy + RBAC | [ARCH-011](../ARCH-011-platform-tenancy-rbac.md) · [ARCH-023](ARCH-023-multi-tenancy.md) |

## Sibling architecture docs

| Doc | Job |
|-----|-----|
| [ARCH-023](ARCH-023-multi-tenancy.md) | Tenancy + RBAC flow |
| [ARCH-024](ARCH-024-package-boundaries.md) | Package public contracts |
| [ARCH-025](ARCH-025-data-layer.md) | Drizzle / migrations / `withOrg` |
| [ARCH-026](ARCH-026-auth-session.md) | Session + invitations |
| [ARCH-027](ARCH-027-env-model.md) | Env schema + `.env.local` |
| [ARCH-028](ARCH-028-implementation-slices.md) | Ordered build slices (docs plan for implementers) |
| [../backend/](../backend/) | Hexagon layers, ports, module ownership (detail) |
| [../frontend/ARCH-013-bff-and-data-flow.md](../frontend/ARCH-013-bff-and-data-flow.md) | Next.js data-pattern decision tree |

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
| 1.4.0 | 2026-07-13 | Absorbed ADR-010 Turborepo workspace; ADR folder deleted |
| 1.3.0 | 2026-07-13 | Absorbed Modular Monolith + Hexagonal system framework (former ADR-001) |
| 1.2.0 | 2026-07-13 | Gap table (checkout → Target); Living compose vs Target env note |
| 1.1.0 | 2026-07-13 | Full target stack + turbo.json |
| 1.0.0 | 2026-07-13 | Initial Target overview |
