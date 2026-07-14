# Afenda Docs Index

**This is `docs/`.** Authoritative SSOT for design, API, architecture, runbooks, and module ops. Do **not** recreate `doc/`.

Unified home for Living/Target ARCH, API contracts, guides, and module spines. Material decisions live in Living/Target ARCH and module spines. Approved ADRs go under [`architecture/adr/`](architecture/adr/) only (not top-level `docs/adr/`; not `decisions/`).

| Edition | Maturity | Docs control |
| ------- | -------- | ------------ |
| **Afenda-Lite** (this checkout) | Beta | [DOC-001](_control/DOC-001-documentation-control-standard.md) approved Living standard |
| **Afenda-Elite** | Battle-proven | Same control structure and similar infra aliasing — not a parallel catalogue |

**Product identity:** Afenda-Lite is the beta edition of the Afenda family. **Client Declaration Portal** is retired — see [deprecation register](../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Quality bar (sole):** Enterprise production. Reduced-viability proposals and planning are banned — [AGENTS.md](../AGENTS.md) · [`.cursor/rules/no-mvp-quality-bar.mdc`](../.cursor/rules/no-mvp-quality-bar.mdc). Cross-cutting capability/release evidence uses [GUIDE-017](guides/GUIDE-017-enterprise-quality-evidence-standard.md); module claims remain governed by Enterprise Readiness + owning `*-MOD-009` evidence ([MOD-002](modules/MOD-002-modules-index.md)).

**Forward-writing target:** Turborepo multi-package monorepo — [architecture/ARCH-022-system-overview.md](architecture/ARCH-022-system-overview.md).

**Anti-contamination:** Collapse product trees are absent by design. Do **not** recover them from git (including `git show` as a seed) unless the user explicitly names and approves that recovery in the current turn — [ARCH-028 Anti-contamination lock](architecture/ARCH-028-implementation-slices.md) · [AGENTS.md](../AGENTS.md).

**Agent skills:** `/using-afenda-elite-skills`

## How to read

1. [architecture/ARCH-022-system-overview.md](architecture/ARCH-022-system-overview.md) — Living system overview (Modular Monolith + Hexagonal + Turborepo)
2. [architecture/ARCH-023-multi-tenancy.md](architecture/ARCH-023-multi-tenancy.md) — Living multi-tenancy + platform RBAC + Decision lock
3. [api/README.md](api/README.md) — API / REST / OPEN (start with [API-001](api/API-001-api-boundaries.md) + [REST-001](api/REST-001-rest-resources.md))
4. [architecture/ARCH-013-bff-and-data-flow.md](architecture/ARCH-013-bff-and-data-flow.md) — Next.js data-pattern decision tree
5. [modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) — FFT agent ops entry

## Layout

| Path | Type | Job |
|------|------|-----|
| [`_control/`](_control/) | Control | Minimal register and documentation rules |
| [`api/`](api/) | API / REST / OPEN | Interface contracts — see [api/README.md](api/README.md) |
| [`architecture/`](architecture/) | Architecture | Flat Living/Target `ARCH-*` home · pack reading order in [README](architecture/README.md) (System · Backend · Frontend · Tech-stack) |
| [`architecture/adr/`](architecture/adr/) | ADR | Approved ADRs only (e.g. ADR-008) — not `decisions/` |
| [`guides/`](guides/) | Guide | Living GUIDE-017 enterprise evidence standard · GUIDE-001…006/016 **Retired** (register-only) · API how-tos in [api/guides](api/guides/README.md) |
| [`modules/`](modules/) | Module | 10-MOD spines + catalog ([MOD-002](modules/MOD-002-modules-index.md)); FFT at [feed-farm-trade/](modules/feed-farm-trade/) |
| [`runbooks/`](runbooks/) | Runbook / ops | Operate, multi-org, cheatsheets |
| [`scratch/`](scratch/) | Scratch | Non-authoritative drafts and temporary notes |

**Forbidden homes:** `docs/adr/`, top-level `docs/fft/`, `docs/frontend/`, `docs/backend/`, `docs/engineering/`, and `docs/architecture/{backend,frontend,system,tech-stack}/`.

## Index

### Control

| Doc | Purpose |
|-----|---------|
| [_control/DOC-001-documentation-control-standard.md](_control/DOC-001-documentation-control-standard.md) | Documentation control standard |
| [_control/DOC-002-documentation-register.md](_control/DOC-002-documentation-register.md) | Critical-document register with seven mandatory fields |
| [_control/DOC-003-controlled-document-template.md](_control/DOC-003-controlled-document-template.md) | Controlled document template |

### Architecture — Target system (forward-writing)

Index: [architecture/](architecture/)

Authority for **new** workspace layout, packages, env, and data access. Status: **Target** until `apps/web` + `packages/*` ship.

| Doc | Purpose |
|-----|---------|
| [ARCH-022](architecture/ARCH-022-system-overview.md) | System overview: gap table, workspace layout, stack, request flow |
| [ARCH-023](architecture/ARCH-023-multi-tenancy.md) | **Sole** Living SSOT — multi-tenancy + platform RBAC + Decision lock |
| [ARCH-024](architecture/ARCH-024-package-boundaries.md) | Package contracts and dependency graph |
| [ARCH-025](architecture/ARCH-025-data-layer.md) | Drizzle schema, migrations, query patterns |
| [ARCH-026](architecture/ARCH-026-auth-session.md) | Neon Auth, `getSession()`, RBAC guards |
| [ARCH-027](architecture/ARCH-027-env-model.md) | `@t3-oss/env-nextjs`, `.env.local`, compose cutover |
| [ARCH-028](architecture/ARCH-028-implementation-slices.md) | Ordered S1–S8 slices + checkpoints |
| [ARCH-029](architecture/ARCH-029-interface-api-architecture.md) | **Living** parent — interface and API architecture |

### Backend / Frontend / API

See [architecture/](architecture/), [architecture/](architecture/), [`api/`](api/), and [ARCH-031 Technology Stack Catalogue](architecture/ARCH-031-technology-stack-catalogue.md).

### Guides

| Doc | Purpose |
|-----|---------|
| [guides/README.md](guides/README.md) | Non-API guide navigator; Engineering GUIDE-001…006/016 remain Retired |
| [GUIDE-017](guides/GUIDE-017-enterprise-quality-evidence-standard.md) | Enterprise quality evidence, freshness/applicability, exceptions, and release/capability aggregation |
| [api/guides/README.md](api/guides/README.md) | API implementation guides (GUIDE-007…015) |
| [MOD-002](modules/MOD-002-modules-index.md) | Modules catalog + 10-MOD spine guideline |

### Ops

| Path | Purpose |
|------|---------|
| [runbooks/](runbooks/) | Platform: [RB-001](runbooks/RB-001-multi-org-ops.md) · [RB-005](runbooks/RB-005-post-lock-coding-cheat-sheet.md) — [README](runbooks/README.md) |
| [api/runbooks/](api/runbooks/) | API pack: [RB-006](api/runbooks/RB-006-openapi-drift-detection-recovery.md)…[008](api/runbooks/RB-008-api-contract-rollback.md) — [README](api/runbooks/README.md) |
| [modules/feed-farm-trade/](modules/feed-farm-trade/) | FFT spine + ops ([FFT-MOD-008](modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)) |

## Next.js decision tree (summary)

Authority: [architecture/ARCH-013-bff-and-data-flow.md](architecture/ARCH-013-bff-and-data-flow.md).

```text
Need data?
├── Server Component read?     → apps/web/modules/*/domain (or page runner) directly
├── Client mutation?           → Server Action ('use server')
├── Client read that cannot be passed from parent?
│     → prefer lift fetch to Server parent; else Route Handler
├── Webhook / third-party HTTP / health / auth proxy / autosave XHR?
│     → Route Handler under apps/web/app/api/**
└── External/mobile REST consumer?
      → Route Handler implementing docs/api REST contract
```

**Forbidden:** Server Components fetching the app’s own `/api/*` for ordinary reads.

Edge session gate (Target): `apps/web/proxy.ts` — not `middleware.ts`. See [ARCH-016](architecture/ARCH-016-next-js-conventions.md).

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.3.3 | 2026-07-14 | Registered GUIDE-017 Enterprise Quality and Evidence Standard and aligned guide navigation. |
| 1.3.2 | 2026-07-14 | Registered ARCH-031 status-aware Technology Stack Catalogue. |
| 1.3.1 | 2026-07-13 | Renamed `architecture/turborepo/` → `architecture/` |
| 1.3.0 | 2026-07-13 | No ADR sections; ARCH-023 sole tenancy+RBAC SSOT; Target `apps/web` paths |
| 1.2.2 | 2026-07-13 | Layout lists tech-stack |
| 1.2.1 | 2026-07-13 | GUIDE-001…004 under `docs/guides/` |
| 1.0.0 | 2026-07-13 | Docs index scaffold |
