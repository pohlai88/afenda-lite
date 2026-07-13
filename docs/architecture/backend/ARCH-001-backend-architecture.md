# ARCH-001 Backend Architecture

| Field | Value |
|-------|-------|
| ID | ARCH-001 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal Architecture (Ports & Adapters)

**Sole contract version:** one port catalog + one REST resource catalog; Server Actions and Route Handlers are adapters of the same ports.

Frontend + API + backend docs describe **one system**. See [ADR-001](../../adr/backend/ADR-001-modular-monolith-hexagonal.md).

**Agent skill:** [`.cursor/skills/afenda-elite-backend-modules/`](../../../.cursor/skills/afenda-elite-backend-modules/SKILL.md)

## How to read

1. [adr/001-modular-monolith-hexagonal.md](../../adr/backend/ADR-001-modular-monolith-hexagonal.md) — decision  
2. [01-architecture.md](ARCH-004-backend-layers.md) — layers + hexagon  
3. [02-folder-map.md](ARCH-005-backend-folder-map.md) — `modules/*` + remaining `lib/`  
4. [05-nextjs-adapter-map.md](ARCH-008-next-js-adapter-map.md) — App Router ↔ hexagon  
5. [03-bounded-contexts.md](ARCH-006-bounded-contexts.md) + [04-ports-and-adapters.md](ARCH-007-ports-and-adapters.md)  
6. [06-modules-ownership.md](ARCH-009-modules-ownership-map.md) — inventory  
7. [07-conventions.md](ARCH-010-backend-conventions.md) — Node, SQL, Result shape pointers  

## Index

| Doc | Purpose |
|-----|---------|
| [01-architecture.md](ARCH-004-backend-layers.md) | Framework rules, layers (links decision tree) |
| [02-folder-map.md](ARCH-005-backend-folder-map.md) | `modules/*` L2 + `lib/` keep/shim/prune |
| [03-bounded-contexts.md](ARCH-006-bounded-contexts.md) | Identity / Declarations / Trade / Platform |
| [04-ports-and-adapters.md](ARCH-007-ports-and-adapters.md) | Contract-first ports ↔ files |
| [05-nextjs-adapter-map.md](ARCH-008-next-js-adapter-map.md) | Next.js primitives as adapters |
| [06-modules-ownership.md](ARCH-009-modules-ownership-map.md) | Full modules inventory + residue |
| [07-conventions.md](ARCH-010-backend-conventions.md) | Runtime, SQL-in-domain, contract pointers |
| [adr/001-…](../../adr/backend/ADR-001-modular-monolith-hexagonal.md) | Accepted ADR |

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Data decision tree | [../architecture/frontend/ARCH-013-bff-and-data-flow.md](../../architecture/frontend/ARCH-013-bff-and-data-flow.md) only |
| REST resources | [../api/REST-001-rest-resources.md](../../api/REST-001-rest-resources.md) |
| Errors | [../api/API-002-error-contract.md](../../api/API-002-error-contract.md) |
| Types | [../api/API-003-api-types.md](../../api/API-003-api-types.md) |
| Schemas | [../api/API-004-schema-map.md](../../api/API-004-schema-map.md) |
