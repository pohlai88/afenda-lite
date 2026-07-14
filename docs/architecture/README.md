# architecture

Living and Target architecture SSOTs for Afenda-Lite (beta). Afenda-Elite shares the same [DOC-001](../_control/DOC-001-documentation-control-standard.md) control model. Material decisions live in Living/Target `ARCH-*` here — ADRs only under [`adr/`](adr/) after ID approval (never top-level `docs/adr/` or any `decisions/` folder). Module spines: [`docs/modules/`](../modules/).

**Layout:** flat `ARCH-*.md` + [`adr/`](adr/) + [`archive/`](archive/) + `*.snapshot.json`. Do **not** recreate `backend/`, `frontend/`, `system/`, or `tech-stack/`. Boundaries = document ID + packs below.

## When to use this folder

| You need… | Start here |
|-----------|------------|
| Target monorepo / hexagon / one deployable | [ARCH-022](ARCH-022-system-overview.md) |
| Tenancy, IAM, org predicates, Decision lock | [ARCH-023](ARCH-023-multi-tenancy.md) **only** |
| Stack status (current / Target / rejected) | [ARCH-031](ARCH-031-technology-stack-catalogue.md) → then owning ARCH |
| Backend layers / ports / deploy matrix | Backend pack → [ARCH-010](ARCH-010-backend-conventions.md) for Vercel/Node matrix |
| Routes / BFF / data pattern | Frontend pack → [ARCH-013](ARCH-013-bff-and-data-flow.md) for the tree |
| Interface / API parent | [ARCH-029](ARCH-029-interface-api-architecture.md) · contracts in [`docs/api/`](../api/) |
| Ordered implement slices | [ARCH-028](ARCH-028-implementation-slices.md) (docs plan — no scaffold without implement letter) |

**When NOT:** invent a second tenancy/IAM doc; paste ARCH-013/010 tables into siblings; recover Collapse `app/`/`modules/`/`features/`/`components-V2/`; treat archive stubs as Living.

## How to read (first three)

1. [ARCH-022](ARCH-022-system-overview.md) — system overview  
2. [ARCH-023](ARCH-023-multi-tenancy.md) — sole tenancy + platform RBAC + Decision lock  
3. [ARCH-031](ARCH-031-technology-stack-catalogue.md) — then follow owning authorities  

## Packs (reading order)

Link the SSOT; do not paste a second copy.

### System

| # | Doc | Role |
|--:|-----|------|
| 1 | [ARCH-022](ARCH-022-system-overview.md) | Target system overview |
| 2 | [ARCH-023](ARCH-023-multi-tenancy.md) | Living tenancy + RBAC + Decision lock |
| 3 | [ARCH-024](ARCH-024-package-boundaries.md) | Package public contracts |
| 4 | [ARCH-025](ARCH-025-data-layer.md) | Drizzle / migrations / `withOrg` |
| 5 | [ARCH-026](ARCH-026-auth-session.md) | Session + invitations |
| 6 | [ARCH-027](ARCH-027-env-model.md) | Env — Target `@afenda/env` (docs-first STOP) |
| 7 | [ARCH-028](ARCH-028-implementation-slices.md) | Ordered build slices |
| 8 | [ARCH-029](ARCH-029-interface-api-architecture.md) | Interface/API architecture parent |

### Backend (hexagon)

| # | Doc | Role |
|--:|-----|------|
| 1 | [ARCH-001](ARCH-001-backend-architecture.md) | Backend entry (points at pack) |
| 2 | [ARCH-004](ARCH-004-backend-layers.md) | Layers |
| 3 | [ARCH-005](ARCH-005-backend-folder-map.md) | Folder map (logical) |
| 4 | [ARCH-006](ARCH-006-bounded-contexts.md) | Bounded contexts |
| 5 | [ARCH-007](ARCH-007-ports-and-adapters.md) | Ports ↔ files |
| 6 | [ARCH-008](ARCH-008-next-js-adapter-map.md) | Adapter roles — tree → [ARCH-013](ARCH-013-bff-and-data-flow.md); deploy → [ARCH-010](ARCH-010-backend-conventions.md) |
| 7 | [ARCH-009](ARCH-009-modules-ownership-map.md) | Modules ownership |
| 8 | [ARCH-010](ARCH-010-backend-conventions.md) | Conventions + **sole** Vercel deploy matrix |

### Frontend

| # | Doc | Role |
|--:|-----|------|
| 1 | [ARCH-002](ARCH-002-frontend-architecture.md) | Frontend entry |
| 2 | [ARCH-012](ARCH-012-app-router-routes.md) | App Router routes |
| 3 | [ARCH-013](ARCH-013-bff-and-data-flow.md) | **Sole** BFF / data-pattern tree |
| 4 | [ARCH-015](ARCH-015-admincn-alignment.md) | AdminCN alignment |
| 5 | [ARCH-016](ARCH-016-next-js-conventions.md) | Next.js conventions |
| 6 | [ARCH-017](ARCH-017-frontend-folder-map.md) | Folder map (logical) |

ARCH-014 archived (UI surfaces).

### Tech-stack

| # | Doc | Role |
|--:|-----|------|
| 1 | [ARCH-031](ARCH-031-technology-stack-catalogue.md) | Stack catalogue |
| 2 | [ARCH-018](ARCH-018-admincn-customization.md) | AdminCN customize playbook |
| 3 | [ARCH-019](ARCH-019-admincn-frontend-preflight.md) | AdminCN preflight |

### Archive · ADR

| Home | Contents |
|------|----------|
| [`archive/`](archive/) | Superseded ARCH-003, 014, 020, 021 |
| [`adr/`](adr/) | Approved ADRs (e.g. [ADR-008](adr/ADR-008-cache-components-mode-b.md)) |

## Related

| Need | Doc |
|------|-----|
| Docs index | [../README.md](../README.md) |
| Modules | [MOD-002](../modules/MOD-002-modules-index.md) |
| Runbooks | [../runbooks/README.md](../runbooks/README.md) |
| Guides | [../guides/README.md](../guides/README.md) |

## Rules

1. Prefer Living/Target over archive stubs.  
2. No top-level `docs/adr/` / `decisions/` — ADRs under [`adr/`](adr/) after ID approval.  
3. Do not reopen ARCH-023 Rejected (R*) / Deferred (D*) without explicit user approval.  
4. No separate platform-IAM ARCH — IAM is [ARCH-023](ARCH-023-multi-tenancy.md).  
5. FFT locks: [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md).  
6. **Checkout posture:** Living maps = *shape*. Do not recover wiped repo-root product trees. Forward code only via Target after explicit [ARCH-028](ARCH-028-implementation-slices.md) implement.  
7. Do not recreate architecture trunk folders — packs replace them.  
