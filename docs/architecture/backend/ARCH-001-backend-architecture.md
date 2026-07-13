# ARCH-001 Backend Architecture

| Field | Value |
|-------|-------|
| ID | ARCH-001 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal Architecture (Ports & Adapters) — system SSOT [ARCH-022](../turborepo/ARCH-022-system-overview.md).

**Sole contract version:** one port catalog + one REST resource catalog; Server Actions and Route Handlers are adapters of the same ports.

Frontend + API + backend docs describe **one system**. Framework decision absorbed into [ARCH-022](../turborepo/ARCH-022-system-overview.md) (former ADR-001, deleted).

**Agent skill:** [`.cursor/skills/afenda-elite-backend-modules/`](../../../.cursor/skills/afenda-elite-backend-modules/SKILL.md)

## How to read

1. [ARCH-022](../turborepo/ARCH-022-system-overview.md) — system framework (Modular Monolith + Hexagonal)  
2. [ARCH-004](ARCH-004-backend-layers.md) — layers + hexagon  
3. [ARCH-005](ARCH-005-backend-folder-map.md) — `modules/*` + remaining `lib/`  
4. [ARCH-008](ARCH-008-next-js-adapter-map.md) — App Router ↔ hexagon  
5. [ARCH-006](ARCH-006-bounded-contexts.md) + [ARCH-007](ARCH-007-ports-and-adapters.md)  
6. [ARCH-009](ARCH-009-modules-ownership-map.md) — inventory  
7. [ARCH-010](ARCH-010-backend-conventions.md) — Node, SQL, Result shape pointers  

## Index

| Doc | Purpose |
|-----|---------|
| [ARCH-022](../turborepo/ARCH-022-system-overview.md) | System Modular Monolith + Hexagonal (Target overview) |
| [ARCH-004](ARCH-004-backend-layers.md) | Framework rules, layers (links decision tree) |
| [ARCH-005](ARCH-005-backend-folder-map.md) | `modules/*` L2 + `lib/` keep/shim/prune |
| [ARCH-006](ARCH-006-bounded-contexts.md) | Identity / Declarations / Trade / Platform |
| [ARCH-007](ARCH-007-ports-and-adapters.md) | Contract-first ports ↔ files |
| [ARCH-008](ARCH-008-next-js-adapter-map.md) | Next.js primitives as adapters |
| [ARCH-009](ARCH-009-modules-ownership-map.md) | Full modules inventory + residue |
| [ARCH-010](ARCH-010-backend-conventions.md) | Runtime, SQL-in-domain, contract pointers |

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Data decision tree | [../architecture/frontend/ARCH-013-bff-and-data-flow.md](../../architecture/frontend/ARCH-013-bff-and-data-flow.md) only |
| REST resources | [../api/REST-001-rest-resources.md](../../api/REST-001-rest-resources.md) |
| Errors | [../api/API-002-error-contract.md](../../api/API-002-error-contract.md) |
| Types | [../api/API-003-api-types.md](../../api/API-003-api-types.md) |
| Schemas | [../api/API-004-schema-map.md](../../api/API-004-schema-map.md) |
