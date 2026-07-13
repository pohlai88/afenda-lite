# GUIDE-004 Engineering Drift Register

| Field | Value |
|-------|-------|
| ID | GUIDE-004 |
| Category | Guide |
| Version | 1.1.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

## Purpose

This register records known documentation and checkout drift that affects coding guidance. It does not supersede architecture decisions; it tells engineers where to verify before treating a path, command, or module boundary as present on disk.

## Turborepo Target vs checkout

| Authority | Disk today | Coding impact |
|-----------|------------|---------------|
| [docs/architecture/turborepo/](../architecture/turborepo/) ARCH-022…028 (Target) | `apps/`, `packages/`, `turbo.json`, `pnpm-workspace.yaml` **absent** | Expected until an explicit implement request follows [ARCH-028](../architecture/turborepo/ARCH-028-implementation-slices.md) |
| [docs/architecture/turborepo/](../architecture/turborepo/) ARCH-022…027 | Decisions + maps | Binding for new work; former ADR-010…014 absorbed — do not reopen without superseding ARCH |
| Living `AGENTS.md` env compose | Compose / `env:guard` still describe the monolith | Remain authoritative **until** S4.1; Target is `.env.local` + `@afenda/env` |

Do not scaffold `apps/` or `packages/` from Target docs alone.

## Current checkout snapshot

Checked from repository root on 2026-07-13.

| Path | Current disk state | Docs expectation | Coding impact |
|------|--------------------|------------------|---------------|
| `app/` | Missing | Target App Router routes in frontend/backend docs | Do not edit or create route files until the product tree is restored or the owning task explicitly recreates it |
| `features/` | Missing | Feature runners and UI homes in frontend docs | Treat feature-runner guidance as architecture authority, not current disk fact |
| `modules/` | Missing | Domain, schemas, env, auth, routing SSOT in backend/API docs | Do not claim a module implementation exists locally without verifying the path |
| `components-V2/` | Missing | AdminCN shell and portal views in frontend docs | Treat AdminCN product-path references as target architecture only |
| `testing/` | Missing | Vitest config and test helpers in testing guidance | Test scripts that require `testing/` may fail until restored |
| `e2e/` | Missing | Playwright specs in testing guidance | E2E scripts may fail until restored |
| `db/` | Missing | Migration and tenancy docs reference `db/migrations` | Migration work is blocked until the DB tree is present or restored |
| `docs/adr/001-afenda-lite-product-identity.md` | Missing | Older docs may link to this ADR | Use the deprecation register as the product identity authority until an ADR is restored |
| `doc/` | Missing and should not be recreated | Older root README references may mention `doc/` | Keep living product docs under `docs/`; do not restore `doc/` for new engineering docs |

## Current Missing Source Links

Full Markdown link scan after the documentation Slice A scaffold reports these missing source-tree links:

| Document | Missing target |
|----------|----------------|
| `docs/architecture/ARCH-019-admincn-frontend-preflight.md` | `../../modules/platform/shell/access.ts` |
| `docs/architecture/frontend/ARCH-012-app-router-routes.md` | `../../proxy.ts` |
| `docs/architecture/frontend/ARCH-016-next-js-conventions.md` | `../../proxy.ts` |
| `docs/architecture/ARCH-011-platform-tenancy-rbac.md` | `../../app/dashboard/layout.tsx` |
| `docs/architecture/ARCH-011-platform-tenancy-rbac.md` | `../../app/dashboard/error.tsx` |
| `docs/architecture/turborepo/ARCH-026-auth-session.md` | `../../features/auth/README.md` |

These are treated as checkout/materialization drift while `app/`, `features/`, `modules/`, and `proxy.ts` are absent. Do not rewrite architecture docs to hide these targets unless the product layout decision changes.

## Verification commands

Use these before coding against paths named in architecture docs:

```powershell
Test-Path app
Test-Path features
Test-Path modules
Test-Path components-V2
Test-Path testing
Test-Path e2e
Test-Path db
Test-Path docs\adr\001-afenda-lite-product-identity.md
```

For broader drift checks, prefer the repo scripts when their inputs exist:

```bash
npm run checks
npm run check:repo-migration-map
npm run check:route-coverage-drift
```

If a script fails because its referenced source tree is missing, record that as checkout drift instead of weakening the architecture docs.

## Working rules while drift exists

- Treat `docs/architecture/backend/`, `docs/architecture/frontend/`, `docs/api/`, `docs/modules/feed-farm-trade/`, and `docs/architecture/` as architecture authorities.
- Treat absent product paths as a checkout/materialization problem, not permission to invent a new layout.
- Do not create replacement roots such as `src/`, `lib/`, `doc/`, or `modules/trade/` to work around missing target paths.
- If a coding task requires missing paths, first restore or recreate the owning target path exactly as the authority docs describe.
- If the task is docs-only, label target-path references as architecture guidance when disk state is not present.

## Close criteria

This drift register can be cleared or narrowed when:

- the expected product roots are present again, or
- the architecture docs are amended to match a deliberately reduced repository shape, and
- affected commands are verified or removed from engineering guidance.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Turborepo Target vs checkout; Living compose until S4.1 |
| 1.0.0 | 2026-07-13 | Recorded current checkout drift against architecture docs |
