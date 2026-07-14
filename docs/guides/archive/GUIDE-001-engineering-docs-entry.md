# GUIDE-001 Engineering Docs Entry

| Field | Value |
|-------|-------|
| ID | GUIDE-001 |
| Category | Guide |
| Version | 1.2.0 |
| Status | Retired |
| Owner | Platform |
| Updated | 2026-07-14 |
| Location | `docs/guides/archive/` |
| Superseded by | [docs/README.md](../../README.md) · [DOC-001](../../_control/DOC-001-documentation-control-standard.md) |

## Archive notice

**Status:** Retired · archived under `docs/guides/archive/` on 2026-07-14.  
**Why:** Living engineering guides duplicated DOC-001/002/003, `docs/README.md`, `AGENTS.md`, and agent skills; GUIDE-004 drift was absorbed into ARCH-028.  
**Successor:** [docs/README.md](../../README.md) · [DOC-001](../../_control/DOC-001-documentation-control-standard.md)  
**Forbidden:** Restoring these files to `docs/guides/` as Living SSOT; teaching them as current engineering workflow.

| Archived on | 2026-07-14 |

Afenda-Lite is the beta / lite edition of Afenda ERP. This section is the engineering entry point for coding work. It does not replace the architecture, API, backend, frontend, FFT, or runbook folders; it points engineers to the right authority before they edit code.

## Read first

1. [coding-engineering-guide.md](./GUIDE-002-coding-engineering-guide.md) ÔÇö coding workflow, boundaries, checks, and review expectations
2. [documentation-workflow.md](./GUIDE-003-engineering-documentation-workflow.md) ÔÇö how to add specs, ADRs, runbooks, and implementation guides
3. [drift-register.md](./GUIDE-004-engineering-drift-register.md) ÔÇö known gaps between architecture docs and the current checkout
4. [../_control/DOC-001-documentation-control.md](../../_control/DOC-001-documentation-control.md) ÔÇö minimal catalogue rules
5. [../_control/REGISTER.md](../../_control/REGISTER.md) ÔÇö critical-document register
6. [../README.md](../../README.md) ÔÇö docs SSOT and product-wide index
7. [../architecture/ARCH-001-backend-architecture.md](../../architecture/ARCH-001-backend-architecture.md) ÔÇö Modular Monolith + Hexagonal architecture
8. [../architecture/ARCH-013-bff-and-data-flow.md](../../architecture/ARCH-013-bff-and-data-flow.md) ÔÇö Next.js BFF and data decision tree
9. [../architecture/ARCH-023-multi-tenancy.md](../../architecture/ARCH-023-multi-tenancy.md) ÔÇö tenancy and Neon production posture

## Engineering source map

| Need | Authority |
|------|-----------|
| Product identity | [deprecation register](../../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) (Afenda-Lite) |
| Backend architecture | [../architecture/ARCH-001-backend-architecture.md](../../architecture/ARCH-001-backend-architecture.md) |
| Frontend architecture | [../architecture/ARCH-002-frontend-architecture.md](../../architecture/ARCH-002-frontend-architecture.md) |
| Route ownership | [../architecture/ARCH-012-app-router-routes.md](../../architecture/ARCH-012-app-router-routes.md) |
| BFF / data access | [../architecture/ARCH-013-bff-and-data-flow.md](../../architecture/ARCH-013-bff-and-data-flow.md) |
| API contract | [../api/API-001-api-boundaries.md](../../api/API-001-api-boundaries.md) |
| REST resources | [../api/REST-001-rest-resources.md](../../api/REST-001-rest-resources.md) |
| Error contract | [../api/API-002-error-contract.md](../../api/API-002-error-contract.md) |
| Schema map | [../api/API-004-schema-map.md](../../api/API-004-schema-map.md) |
| Tenancy / RBAC | [../architecture/ARCH-023-multi-tenancy.md](../../architecture/ARCH-023-multi-tenancy.md) |
| Multi-org ops | [../runbooks/RB-001-multi-org-ops.md](../runbooks/RB-001-multi-org-ops.md) |
| Feed Farm Trade runtime | [FFT-MOD-008](../../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Post-lock commands | [../runbooks/RB-005-post-lock-coding-cheat-sheet.md](../runbooks/RB-005-post-lock-coding-cheat-sheet.md) |
| Known checkout drift | [drift-register.md](./GUIDE-004-engineering-drift-register.md) |
| Documentation catalogue | [../_control/REGISTER.md](../../_control/REGISTER.md) |

## Scaffold rules

- Keep engineering docs in `docs/guides/` unless a narrower existing owner fits better.
- Keep decision records in `docs/**/adr/`, not inside a catch-all guide.
- Keep operating procedures in `docs/runbooks/` or module MOD-008 (e.g. [FFT-MOD-008](../../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md)).
- Keep public API contract details in `docs/api/`.
- Do not recreate `doc/`.
- Link to authoritative docs instead of copying volatile commands, env names, or contracts.

## Drift policy

Some existing docs describe the target product layout (`app/`, `features/`, `modules/`, `components-V2/`). Before coding, verify the current checkout has the paths required by the task. If the product tree and docs disagree, read [drift-register.md](./GUIDE-004-engineering-drift-register.md), treat path references as architecture authority rather than disk fact, and reconcile the source of truth before implementing behavior.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-07-13 | Established engineering docs entry point with catalogue links |
