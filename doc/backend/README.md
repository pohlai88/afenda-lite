# Backend design (`doc/backend/`)

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal Architecture (Ports & Adapters)  

**Sole contract version:** one port catalog + one REST resource catalog; Server Actions and Route Handlers are adapters of the same ports.

Frontend + API + backend docs describe **one system**. See [ADR-001](adr/001-modular-monolith-hexagonal.md).

## How to read

1. [adr/001-modular-monolith-hexagonal.md](adr/001-modular-monolith-hexagonal.md) — decision  
2. [01-modular-hexagonal.md](01-modular-hexagonal.md) — method + decision tree  
3. [04-nextjs-adapter-map.md](04-nextjs-adapter-map.md) — App Router ↔ hexagon  
4. [05-contract-rules.md](05-contract-rules.md) — one-version API rules  
5. [02-bounded-contexts.md](02-bounded-contexts.md) + [03-ports-and-adapters.md](03-ports-and-adapters.md)  

## Index

| Doc | Purpose |
|-----|---------|
| [01-modular-hexagonal.md](01-modular-hexagonal.md) | Framework rules, layers, decision tree |
| [02-bounded-contexts.md](02-bounded-contexts.md) | Identity / Declarations / Trade / Platform |
| [03-ports-and-adapters.md](03-ports-and-adapters.md) | Contract-first ports ↔ files |
| [04-nextjs-adapter-map.md](04-nextjs-adapter-map.md) | Next.js primitives as adapters |
| [05-contract-rules.md](05-contract-rules.md) | Errors, Zod edge, I/O, REST naming |
| [adr/001-…](adr/001-modular-monolith-hexagonal.md) | Accepted ADR |

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Data decision tree | Identical to [../frontend/04-bff-and-data.md](../frontend/04-bff-and-data.md) |
| REST resources | [../api/02-rest-resources.md](../api/02-rest-resources.md) |
| Errors | [../api/03-error-contract.md](../api/03-error-contract.md) |
| Types | [../api/04-types.md](../api/04-types.md) |
| Schemas | [../api/05-schema-map.md](../api/05-schema-map.md) |
