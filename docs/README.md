# DOC-003 Afenda-Lite Docs Index

| Field | Value |
|-------|-------|
| ID | DOC-003 |
| Category | Control |
| Version | 1.2.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

> UPDATE THIS IS THE DOG SHIT FOLDER. IF AGENT NEED SHOITTING, COME ERE AND SHIT... DONT EVER FUCK MY 'DOC" BEFORE I GET MAD AND FUCK THEIR SON IF BITCH

**This is `docs/`.** If an agent needs to shit documentation, come here and shit. Do **not** recreate `doc/`.

Unified home for design SSOT, API contract, ADRs, runbooks, and module ops.

**Product identity:** Afenda-Lite (beta of Afenda ERP). **Client Declaration Portal** is retired — see [deprecation register](../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Forward-writing target:** Turborepo multi-package monorepo — [architecture/turborepo/ARCH-022-system-overview.md](architecture/turborepo/ARCH-022-system-overview.md) · decisions [adr/turborepo/](adr/turborepo/).

**Agent skills:** `/using-afenda-elite-skills`

## How to read

1. [architecture/turborepo/ARCH-022-system-overview.md](architecture/turborepo/ARCH-022-system-overview.md) — **Target** system overview (Turborepo)
2. [adr/turborepo/](adr/turborepo/) — Accepted target ADRs (ADR-010…014)
3. [api/README.md](api/README.md) — API / REST / OPEN contract entry (start with [API-001](api/API-001-api-boundaries.md) + [REST-001](api/REST-001-rest-resources.md))
4. [architecture/frontend/ARCH-013-bff-and-data-flow.md](architecture/frontend/ARCH-013-bff-and-data-flow.md) — Next.js data-pattern decision tree
5. [adr/backend/ADR-001-modular-monolith-hexagonal.md](adr/backend/ADR-001-modular-monolith-hexagonal.md) — hexagonal module style inside `apps/web`

## Layout

| Path | Type | Job |
|------|------|-----|
| [`_control/`](_control/) | Control | Minimal register and documentation rules |
| [`api/`](api/) | API / REST / OPEN | Interface contracts — see [api/README.md](api/README.md) |
| [`architecture/turborepo/`](architecture/turborepo/) | Architecture Target | Turborepo system ARCH-022…028 (forward-writing) |
| [`architecture/backend/`](architecture/backend/) | Architecture | Hexagon, modules, conventions (ARCH-001…010) |
| [`architecture/frontend/`](architecture/frontend/) | Architecture | Routes, UI, BFF (ARCH-002, 011…016) |
| [`adr/backend/`](adr/backend/) | ADR | Backend decisions ADR-001…002 |
| [`adr/frontend/`](adr/frontend/) | ADR | Frontend decisions ADR-003…005 |
| [`adr/turborepo/`](adr/turborepo/) | ADR | Turborepo decisions ADR-010…014 |
| [`architecture/`](architecture/) | Architecture | Other living maps / registers / archive |
| [`guides/`](guides/) | Guide | Phase task guides GUIDE-007…014 + index |
| [`engineering/`](engineering/) | Internal engineering guide | Coding workflow, docs workflow, scaffolds |
| [`modules/`](modules/) | Module | 10-MOD spines + catalog ([MOD-002](modules/MOD-002-modules-index.md)); FFT at [feed-farm-trade/](modules/feed-farm-trade/) |
| [`runbooks/`](runbooks/) | Runbook / ops | Operate, multi-org, cheatsheets |
| [`scratch/`](scratch/) | Scratch | Non-authoritative drafts and temporary notes |

## Index

### Control

| Doc | Purpose |
|-----|---------|
| [_control/DOC-001-documentation-control.md](_control/DOC-001-documentation-control.md) | Minimal documentation catalogue rules |
| [_control/REGISTER.md](_control/REGISTER.md) | Critical-document register with seven mandatory fields |

### Architecture — Turborepo system (forward-writing / Target)

Index: [architecture/turborepo/](architecture/turborepo/)

Authority for **new** workspace layout, packages, env, and data access. Status: **Target** until `apps/web` + `packages/*` ship.

| Doc | Purpose |
|-----|---------|
| [architecture/turborepo/ARCH-022-system-overview.md](architecture/turborepo/ARCH-022-system-overview.md) | System overview: gap table, workspace layout, stack, request flow |
| [architecture/turborepo/ARCH-023-multi-tenancy.md](architecture/turborepo/ARCH-023-multi-tenancy.md) | Multi-tenancy Living SSOT: decision lock, shared schema, `withOrg`, Neon posture (supersedes ARCH-003) |
| [architecture/turborepo/ARCH-024-package-boundaries.md](architecture/turborepo/ARCH-024-package-boundaries.md) | Package contracts and dependency graph |
| [architecture/turborepo/ARCH-025-data-layer.md](architecture/turborepo/ARCH-025-data-layer.md) | Drizzle schema, migrations, query patterns |
| [architecture/turborepo/ARCH-026-auth-session.md](architecture/turborepo/ARCH-026-auth-session.md) | Neon Auth, `getSession()`, RBAC guards |
| [architecture/turborepo/ARCH-027-env-model.md](architecture/turborepo/ARCH-027-env-model.md) | `@t3-oss/env-nextjs`, `.env.local`, compose cutover |
| [architecture/turborepo/ARCH-028-implementation-slices.md](architecture/turborepo/ARCH-028-implementation-slices.md) | Ordered S1–S8 slices + checkpoints + post-ship doc retirement |

### ADRs — Turborepo system (Accepted target decisions)

Index: [adr/turborepo/](adr/turborepo/) — IDs **ADR-010…014** (no collision with backend/frontend ADRs).

| Doc | Decision |
|-----|---------|
| [adr/turborepo/ADR-010-turborepo-monorepo.md](adr/turborepo/ADR-010-turborepo-monorepo.md) | Turborepo multi-package monorepo |
| [adr/turborepo/ADR-011-drizzle-orm.md](adr/turborepo/ADR-011-drizzle-orm.md) | Drizzle ORM |
| [adr/turborepo/ADR-012-shared-schema-tenancy.md](adr/turborepo/ADR-012-shared-schema-tenancy.md) | Shared-schema tenancy |
| [adr/turborepo/ADR-013-neon-auth.md](adr/turborepo/ADR-013-neon-auth.md) | Neon Auth |
| [adr/turborepo/ADR-014-t3-env.md](adr/turborepo/ADR-014-t3-env.md) | `@t3-oss/env-nextjs` |

### ADRs — Backend (Accepted)

Index: [adr/backend/](adr/backend/)

| Doc | Decision |
|-----|---------|
| [adr/backend/ADR-001-modular-monolith-hexagonal.md](adr/backend/ADR-001-modular-monolith-hexagonal.md) | Modular Monolith + Hexagonal |
| [adr/backend/ADR-002-platform-tenancy-rbac.md](adr/backend/ADR-002-platform-tenancy-rbac.md) | Platform tenancy + RBAC |

### ADRs — Frontend (Accepted)

Index: [adr/frontend/](adr/frontend/)

| Doc | Decision |
|-----|---------|
| [adr/frontend/ADR-003-feed-farm-trade-module.md](adr/frontend/ADR-003-feed-farm-trade-module.md) | Feed Farm Trade module |
| [adr/frontend/ADR-004-feed-farm-trade-architecture.md](adr/frontend/ADR-004-feed-farm-trade-architecture.md) | Feed Farm Trade architecture |
| [adr/frontend/ADR-005-feed-farm-trade-roadmap.md](adr/frontend/ADR-005-feed-farm-trade-roadmap.md) | Feed Farm Trade roadmap |

### Backend / Frontend / API

See [architecture/backend/](architecture/backend/), [architecture/frontend/](architecture/frontend/), and [`api/`](api/).

### Engineering

| Doc | Purpose |
|-----|---------|
| [engineering/GUIDE-001-engineering-docs-entry.md](engineering/GUIDE-001-engineering-docs-entry.md) | Engineering docs entry point |
| [engineering/GUIDE-002-coding-engineering-guide.md](engineering/GUIDE-002-coding-engineering-guide.md) | Official coding guide for Afenda-Lite engineering work |
| [engineering/GUIDE-003-engineering-documentation-workflow.md](engineering/GUIDE-003-engineering-documentation-workflow.md) | Specs, architecture docs, ADRs, runbooks, migrations, and internal guides |
| [engineering/GUIDE-004-engineering-drift-register.md](engineering/GUIDE-004-engineering-drift-register.md) | Known gaps between architecture docs and current checkout |
| [guides/GUIDE-006-guides-index.md](guides/GUIDE-006-guides-index.md) | Guides index (GUIDE-007…014 phase tasks) |
| [modules/MOD-002-modules-index.md](modules/MOD-002-modules-index.md) | Modules catalog + **10-MOD spine guideline** |

### Ops

| Path | Purpose |
|------|---------|
| [runbooks/](runbooks/) | Multi-org ops, post-lock cheatsheet, production |
| [modules/feed-farm-trade/](modules/feed-farm-trade/) | Feed Farm Trade 10-MOD spine + gates ([FFT-MOD-008](modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)) |

## Next.js decision tree (summary)

Authority: [architecture/frontend/ARCH-013-bff-and-data-flow.md](architecture/frontend/ARCH-013-bff-and-data-flow.md).

```text
Need data?
├── Server Component read?     → modules/*/domain (or page runner) directly
├── Client mutation?           → Server Action ('use server')
├── Client read that cannot be passed from parent?
│     → prefer lift fetch to Server parent; else Route Handler
├── Webhook / third-party HTTP / health / auth proxy / autosave XHR?
│     → Route Handler under app/api/**
└── External/mobile REST consumer?
      → Route Handler implementing docs/api REST contract
```

**Forbidden:** Server Components fetching the app’s own `/api/*` for ordinary reads.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.2.0 | 2026-07-13 | FFT → `modules/feed-farm-trade/` with FFT-MOD-001…010; 10-MOD guideline in MOD-002; top-level `docs/fft/` retired |
| 1.1.3 | 2026-07-13 | GUIDE-007…014 → `docs/guides/`; frontend ARCH folder is maps only |
| 1.1.2 | 2026-07-13 | Frontend ARCH/GUIDEs → `architecture/frontend/`; ADRs → `adr/frontend/`; top-level `docs/frontend/` retired |
| 1.1.1 | 2026-07-13 | Backend ADRs → `docs/adr/backend/`; ARCH maps stay under `architecture/backend/` |
| 1.1.0 | 2026-07-13 | Nested `docs/backend` under `architecture/backend/` |
| 1.0.1 | 2026-07-13 | Turborepo ARCH index notes; gap/cutover/slices completeness |
| 1.0.0 | 2026-07-13 | Added minimal catalogue scaffold and docs index header |
