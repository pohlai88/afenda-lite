# DOC-003 Afenda-Lite Docs Index

| Field | Value |
|-------|-------|
| ID | DOC-003 |
| Category | Control |
| Version | 1.2.1 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

> UPDATE THIS IS THE DOG SHIT FOLDER. IF AGENT NEED SHOITTING, COME ERE AND SHIT... DONT EVER FUCK MY 'DOC" BEFORE I GET MAD AND FUCK THEIR SON IF BITCH

**This is `docs/`.** If an agent needs to shit documentation, come here and shit. Do **not** recreate `doc/`.

Unified home for design SSOT, API contract, ADRs, runbooks, and module ops.

**Product identity:** Afenda-Lite (beta of Afenda ERP). **Client Declaration Portal** is retired — see [deprecation register](../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Forward-writing target:** Turborepo multi-package monorepo — [architecture/turborepo/ARCH-022-system-overview.md](architecture/turborepo/ARCH-022-system-overview.md) (decisions absorbed into ARCH-022…027).

**Agent skills:** `/using-afenda-elite-skills`

## How to read

1. [architecture/turborepo/ARCH-022-system-overview.md](architecture/turborepo/ARCH-022-system-overview.md) — Target system overview (Modular Monolith + Hexagonal + Turborepo)
2. [architecture/turborepo/ARCH-023-multi-tenancy.md](architecture/turborepo/ARCH-023-multi-tenancy.md) — Living tenancy + Decision lock · [ARCH-011](architecture/ARCH-011-platform-tenancy-rbac.md) IAM
3. [api/README.md](api/README.md) — API / REST / OPEN (start with [API-001](api/API-001-api-boundaries.md) + [REST-001](api/REST-001-rest-resources.md))
4. [architecture/frontend/ARCH-013-bff-and-data-flow.md](architecture/frontend/ARCH-013-bff-and-data-flow.md) — Next.js data-pattern decision tree
5. [modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) — FFT agent ops entry

## Layout

| Path | Type | Job |
|------|------|-----|
| [`_control/`](_control/) | Control | Minimal register and documentation rules |
| [`api/`](api/) | API / REST / OPEN | Interface contracts — see [api/README.md](api/README.md) |
| [`architecture/turborepo/`](architecture/turborepo/) | Architecture Target | Turborepo system ARCH-022…028 (includes former ADR-010…014) |
| [`architecture/backend/`](architecture/backend/) | Architecture | Hexagon, modules, conventions (ARCH-001…010) |
| [`architecture/frontend/`](architecture/frontend/) | Architecture | Routes, UI, BFF (ARCH-002, 012…016, 029) |
| [`architecture/`](architecture/) | Architecture | Living maps / registers / archive · [README](architecture/README.md) · [ARCH-011](architecture/ARCH-011-platform-tenancy-rbac.md) IAM |
| [`guides/`](guides/) | Guide | GUIDE-001…004 + GUIDE-006 index |
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
| [architecture/ARCH-011-platform-tenancy-rbac.md](architecture/ARCH-011-platform-tenancy-rbac.md) | Platform IAM + hard tenancy rules (promoted from ADR-002) |
| [architecture/turborepo/ARCH-024-package-boundaries.md](architecture/turborepo/ARCH-024-package-boundaries.md) | Package contracts and dependency graph |
| [architecture/turborepo/ARCH-025-data-layer.md](architecture/turborepo/ARCH-025-data-layer.md) | Drizzle schema, migrations, query patterns |
| [architecture/turborepo/ARCH-026-auth-session.md](architecture/turborepo/ARCH-026-auth-session.md) | Neon Auth, `getSession()`, RBAC guards |
| [architecture/turborepo/ARCH-027-env-model.md](architecture/turborepo/ARCH-027-env-model.md) | `@t3-oss/env-nextjs`, `.env.local`, compose cutover |
| [architecture/turborepo/ARCH-028-implementation-slices.md](architecture/turborepo/ARCH-028-implementation-slices.md) | Ordered S1–S8 slices + checkpoints + post-ship doc retirement |

### ADRs — Turborepo system

**Deleted** (merged into `architecture/turborepo/`). Living SSOTs:

| Former ADR | Living doc |
|------------|------------|
| ADR-010 Turborepo + pnpm | [ARCH-022](architecture/turborepo/ARCH-022-system-overview.md) § Workspace · [ARCH-024](architecture/turborepo/ARCH-024-package-boundaries.md) |
| ADR-011 Drizzle | [ARCH-025](architecture/turborepo/ARCH-025-data-layer.md) |
| ADR-012 Shared schema | [ARCH-023](architecture/turborepo/ARCH-023-multi-tenancy.md) § Shared-schema |
| ADR-013 Neon Auth | [ARCH-026](architecture/turborepo/ARCH-026-auth-session.md) |
| ADR-014 `@t3-oss/env-nextjs` | [ARCH-027](architecture/turborepo/ARCH-027-env-model.md) |

### ADRs — Backend

**Deleted** (merged into architecture). Living SSOTs:

| Former ADR | Living doc |
|------------|------------|
| ADR-001 Modular Monolith + Hexagonal | [ARCH-022](architecture/turborepo/ARCH-022-system-overview.md) § System framework |
| ADR-002 Platform tenancy + RBAC | [ARCH-011](architecture/ARCH-011-platform-tenancy-rbac.md) |

### ADRs — Frontend

**Deleted** (merged into FFT module spine). Living SSOTs:

| Former ADR | Living doc |
|------------|------------|
| ADR-003 module locks | [FFT-MOD-001](modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |
| ADR-004 architecture | [FFT-MOD-001](modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |
| ADR-005 roadmap | [FFT-MOD-010](modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |

### Backend / Frontend / API

See [architecture/backend/](architecture/backend/), [architecture/frontend/](architecture/frontend/), and [`api/`](api/).

### Guides

| Doc | Purpose |
|-----|---------|
| [guides/GUIDE-001-engineering-docs-entry.md](guides/GUIDE-001-engineering-docs-entry.md) | Engineering docs entry point |
| [guides/GUIDE-002-coding-engineering-guide.md](guides/GUIDE-002-coding-engineering-guide.md) | Official coding guide for Afenda-Lite engineering work |
| [guides/GUIDE-003-engineering-documentation-workflow.md](guides/GUIDE-003-engineering-documentation-workflow.md) | Specs, architecture docs, ADRs, runbooks, migrations, and internal guides |
| [guides/GUIDE-004-engineering-drift-register.md](guides/GUIDE-004-engineering-drift-register.md) | Known gaps between architecture docs and current checkout |
| [guides/GUIDE-006-guides-index.md](guides/GUIDE-006-guides-index.md) | Guides index (GUIDE-001…004 + 006) |
| [modules/MOD-002-modules-index.md](modules/MOD-002-modules-index.md) | Modules catalog + **10-MOD spine guideline** |

### Ops

| Path | Purpose |
|------|---------|
| [runbooks/](runbooks/) | Multi-org ops ([RB-001](runbooks/RB-001-multi-org-ops.md)), post-lock cheat sheet ([RB-005](runbooks/RB-005-post-lock-coding-cheat-sheet.md)) — [runbooks/README.md](runbooks/README.md) |
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
| 1.2.1 | 2026-07-13 | Removed `docs/engineering/`; GUIDE-001…004 live under `docs/guides/` |
| 1.2.0 | 2026-07-13 | FFT → `modules/feed-farm-trade/` with FFT-MOD-001…010; 10-MOD guideline in MOD-002; top-level `docs/fft/` retired |
| 1.1.3 | 2026-07-13 | GUIDE-007…014 → `docs/guides/`; frontend ARCH folder is maps only |
| 1.1.2 | 2026-07-13 | Frontend ARCH/GUIDEs → `architecture/frontend/`; ADRs → `adr/frontend/`; top-level `docs/frontend/` retired |
| 1.1.1 | 2026-07-13 | Backend ADRs → `docs/adr/backend/`; ARCH maps stay under `architecture/backend/` |
| 1.1.0 | 2026-07-13 | Nested `docs/backend` under `architecture/backend/` |
| 1.0.1 | 2026-07-13 | Turborepo ARCH index notes; gap/cutover/slices completeness |
| 1.0.0 | 2026-07-13 | Added minimal catalogue scaffold and docs index header |
