# GUIDE-002 Coding Engineering Guide

| Field | Value |
|-------|-------|
| ID | GUIDE-002 |
| Category | Guide |
| Version | 1.0.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

## What this system does

Afenda-Lite is a multi-module SaaS ERP surface. Current living modules include Declarations and Feed Farm Trade (FFT). The architecture is a Next.js App Router modular monolith with hexagonal boundaries: thin routes and adapters call bounded module domains, and domain code owns business rules and database access.

Use the product name **Afenda-Lite**. Do not reintroduce **Client Declaration Portal** as the product name.

## When to use this guide

Use this guide before coding product behavior, editing module boundaries, adding routes, wiring Server Actions, changing env access, or preparing a review handoff.

Do not use this guide as a replacement for:

- Architecture decisions: use the relevant ADR under `docs/**/adr/`.
- Public API reference: use `docs/api/`.
- Operator procedures: use `docs/runbooks/` or module MOD-008 (e.g. [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)).
- End-user help: keep out of internal engineering docs unless explicitly requested.

## Drift status

The current checkout may not contain every target product root named by the architecture docs. Before editing code or running tests that depend on app source paths, read [drift-register.md](GUIDE-004-engineering-drift-register.md) and verify the relevant paths exist.

When paths are missing, this guide remains architecture guidance. Do not invent alternate roots or weaken the documented architecture to make a local checkout look consistent.

## Engineering invariants

| Area | Rule |
|------|------|
| Product name | Afenda-Lite only; Client Declaration Portal is retired |
| Architecture | Next.js App Router Modular Monolith + Hexagonal |
| Routes | `app/**` stays thin; business logic belongs in feature runners or module domains |
| Data reads | Server Components call module domains or page runners directly; do not fetch own `/api/*` for ordinary reads |
| Mutations | Client mutations go through Server Actions with Zod at the adapter edge |
| API handlers | Use Route Handlers for health, auth proxy, autosave, webhooks, third-party HTTP, or external REST consumers |
| SQL | Parameterized SQL belongs in the owning module domain |
| Validation | Zod schemas live in the owning module schema package |
| Tenancy | Every tenant-root query/write must hard-scope by `organization_id = $org` |
| Env | Runtime env access goes through the typed env layer and generated `.env` workflow |
| FFT | Product module name is Feed Farm Trade; code path is `fft`, never `trade` |

## Coding workflow

1. Identify the module and owner.
   Start from [../architecture/backend/ARCH-009-modules-ownership-map.md](../architecture/backend/ARCH-009-modules-ownership-map.md), [../architecture/frontend/ARCH-012-app-router-routes.md](../architecture/frontend/ARCH-012-app-router-routes.md), and [../architecture/turborepo/ARCH-023-multi-tenancy.md](../architecture/turborepo/ARCH-023-multi-tenancy.md).

2. Verify checkout drift.
   Read [drift-register.md](GUIDE-004-engineering-drift-register.md) and confirm the target paths for the task exist. If they are missing, restore the documented owner path or stop at documentation / planning.

3. Read the closest authority.
   For backend boundaries, read [../architecture/backend/ARCH-001-backend-architecture.md](../architecture/backend/ARCH-001-backend-architecture.md). For data access decisions, read [../architecture/frontend/ARCH-013-bff-and-data-flow.md](../architecture/frontend/ARCH-013-bff-and-data-flow.md). For FFT, read [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md).

4. Choose the smallest implementation surface.
   Prefer extending the owning module and existing route/action pattern. Avoid new cross-cutting helpers unless they remove real duplication or match an established local pattern.

5. Preserve tenant safety.
   New tenant data paths must resolve an organization through the platform session path and use hard org predicates. Do not use soft dual-mode SQL, first-org fallback, Neon project-per-tenant claims, or RLS claims on the BFF path.

6. Add focused tests or checks.
   Match the risk: unit tests for pure policy and schema behavior, interaction tests for UI state, smoke or journey tests for route/auth/tenant workflows.

7. Update docs only where the contract changed.
   Specs, ADRs, runbooks, and engineering guides are separate document modes. Use [documentation-workflow.md](GUIDE-003-engineering-documentation-workflow.md) before adding durable docs.

## Boundary checklist

Before opening a PR or handing off a change, verify:

- The product name and route names match the docs.
- The edit has a single clear module owner.
- `app/**` files remain thin.
- Server Actions and Route Handlers share schemas, output types, and error codes where they expose the same use case.
- No raw SQL was added to `app/actions`, `app/api`, or route pages.
- Tenant-root queries and writes are hard-scoped by organization.
- Env changes update the env manifest and sync validation path.
- Public REST behavior is reflected in `docs/api/`.
- Operational commands or rollback steps are reflected in a runbook when needed.

## Local commands

Run only the commands needed for the change. Start with:

```bash
npm run env:compose
npm run checks
```

If `testing/`, `e2e/`, `app/`, `features/`, or `modules/` are absent, treat test/build failures caused by missing source trees as checkout drift and record them in [drift-register.md](GUIDE-004-engineering-drift-register.md).

Common verification commands:

| Command | Use |
|---------|-----|
| `npm run test:unit` | Pure lib/module policy, routing, schema, or helper tests |
| `npm run test:interaction` | React interaction tests |
| `npm run test:e2e:smoke` | Auth ingress, health, redirects, public-link smoke |
| `npm run test:e2e:journey` | Full operator/client journeys before release |
| `npm run audit:tenancy-nulls` | Tenant-root null audit |
| `npm run check:tenancy-residue` | Tenancy anti-drift check |
| `npm run validate:env-sync` | Env sync policy validation |
| `npm run build` | Production build validation |

For the post-lock command pack, use [../runbooks/RB-005-post-lock-coding-cheat-sheet.md](../runbooks/RB-005-post-lock-coding-cheat-sheet.md).

## Common pitfalls

- Creating `doc/` instead of using `docs/`.
- Reintroducing the retired product name.
- Treating target architecture paths as present without checking the current checkout.
- Adding UI to a route page instead of the owning feature surface.
- Fetching the app's own API from Server Components.
- Creating duplicate DTOs instead of deriving types from Zod.
- Treating `FFT_RBAC_ENABLED` as tenancy mode.
- Claiming multi-DB isolation or Neon project-per-tenant architecture.
- Pulling Vercel env into local files.
- Adding ERP sync placeholders to satisfy checks before the FFT slice is open.

## Troubleshooting and escalation

| Symptom | First check |
|---------|-------------|
| Wrong tenant data appears | Stop deploy path; inspect hard org filters; run tenancy checks |
| Auth invite links are wrong | Check `APP_URL`, Neon Auth trusted origins, and invite origin code |
| Local env behaves unexpectedly | Run `npm run env:guard` and regenerate `.env` with `npm run env:compose` |
| FFT route or action behavior differs from docs | Check [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Public API behavior changed | Update `docs/api/` and verify shared schema/error contracts |

## Related docs

- [../README.md](../README.md)
- [../architecture/backend/ARCH-001-backend-architecture.md](../architecture/backend/ARCH-001-backend-architecture.md)
- [../architecture/frontend/ARCH-002-frontend-architecture.md](../architecture/frontend/ARCH-002-frontend-architecture.md)
- [../api/API-001-api-boundaries.md](../api/API-001-api-boundaries.md)
- [../architecture/turborepo/ARCH-023-multi-tenancy.md](../architecture/turborepo/ARCH-023-multi-tenancy.md)
- [../runbooks/RB-001-multi-org-ops.md](../runbooks/RB-001-multi-org-ops.md)
- [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-07-13 | Established coding guide with drift checks |
