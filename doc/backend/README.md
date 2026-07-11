# Backend design (`doc/backend/`)

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal Architecture (Ports & Adapters)

**Sole contract version:** one port catalog + one REST resource catalog; Server Actions and Route Handlers are adapters of the same ports.

Frontend + API + backend docs describe **one system**. See [ADR-001](adr/001-modular-monolith-hexagonal.md).

**Agent skill:** [`.cursor/skills/portal-backend-modules/`](../../.cursor/skills/portal-backend-modules/SKILL.md)

## How to read

1. [adr/001-modular-monolith-hexagonal.md](adr/001-modular-monolith-hexagonal.md) — decision  
2. [01-architecture.md](01-architecture.md) — layers + hexagon  
3. [02-folder-map.md](02-folder-map.md) — `modules/*` + remaining `lib/`  
4. [05-nextjs-adapter-map.md](05-nextjs-adapter-map.md) — App Router ↔ hexagon  
5. [03-bounded-contexts.md](03-bounded-contexts.md) + [04-ports-and-adapters.md](04-ports-and-adapters.md)  
6. [06-modules-ownership.md](06-modules-ownership.md) — inventory  
7. [07-conventions.md](07-conventions.md) — Node, SQL, Result shape pointers  

## Index

| Doc | Purpose |
|-----|---------|
| [01-architecture.md](01-architecture.md) | Framework rules, layers (links decision tree) |
| [02-folder-map.md](02-folder-map.md) | `modules/*` L2 + `lib/` keep/shim/prune |
| [03-bounded-contexts.md](03-bounded-contexts.md) | Identity / Declarations / Trade / Platform |
| [04-ports-and-adapters.md](04-ports-and-adapters.md) | Contract-first ports ↔ files |
| [05-nextjs-adapter-map.md](05-nextjs-adapter-map.md) | Next.js primitives as adapters |
| [06-modules-ownership.md](06-modules-ownership.md) | Full modules inventory + residue |
| [07-conventions.md](07-conventions.md) | Runtime, SQL-in-domain, contract pointers |
| [adr/001-…](adr/001-modular-monolith-hexagonal.md) | Accepted ADR |

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Data decision tree | [../frontend/04-bff-and-data.md](../frontend/04-bff-and-data.md) only |
| REST resources | [../api/02-rest-resources.md](../api/02-rest-resources.md) |
| Errors | [../api/03-error-contract.md](../api/03-error-contract.md) |
| Types | [../api/04-types.md](../api/04-types.md) |
| Schemas | [../api/05-schema-map.md](../api/05-schema-map.md) |
