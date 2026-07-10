# Portal design docs (`doc/`)

Target-state frontend, API, and backend blueprint for the Client Declaration Portal.

**Status:** Active design SSOT for rebuild (2026-07-11).  

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal (Ports & Adapters) — [backend/adr/001-modular-monolith-hexagonal.md](backend/adr/001-modular-monolith-hexagonal.md).  

**Sole contract version:** one port catalog + one REST catalog; Actions and Route Handlers share schemas, types, and error codes.

Frontend + API + backend describe **one system**, not three architectures.

## How to read

1. [backend/README.md](backend/README.md) — framework + contract version  
2. [frontend/04-bff-and-data.md](frontend/04-bff-and-data.md) — **Next.js data-pattern decision tree** (mandatory; identical in backend/01)  
3. [frontend/01-architecture.md](frontend/01-architecture.md) — UI layers  
4. [api/01-boundaries.md](api/01-boundaries.md) + [api/02-rest-resources.md](api/02-rest-resources.md) — HTTP/contracts  
5. [backend/05-contract-rules.md](backend/05-contract-rules.md) — one-version API rules  
6. [frontend/07-nextjs-conventions.md](frontend/07-nextjs-conventions.md) — App Router conventions  

## Index

### Backend

| Doc | Purpose |
|-----|---------|
| [backend/README.md](backend/README.md) | Sole framework + contract version |
| [backend/01-modular-hexagonal.md](backend/01-modular-hexagonal.md) | Method + decision tree |
| [backend/02-bounded-contexts.md](backend/02-bounded-contexts.md) | Identity / Declarations / Trade / Platform |
| [backend/03-ports-and-adapters.md](backend/03-ports-and-adapters.md) | Contract-first ports ↔ files |
| [backend/04-nextjs-adapter-map.md](backend/04-nextjs-adapter-map.md) | App Router ↔ hexagon |
| [backend/05-contract-rules.md](backend/05-contract-rules.md) | One-version, errors, Zod, REST naming |
| [backend/adr/001-…](backend/adr/001-modular-monolith-hexagonal.md) | Accepted ADR |

### Frontend

| Doc | Purpose |
|-----|---------|
| [01-architecture.md](frontend/01-architecture.md) | Layer diagram, RSC vs client, BFF rules |
| [02-folder-map.md](frontend/02-folder-map.md) | L1/L2 folders — keep / drop / rebuild home |
| [03-routes.md](frontend/03-routes.md) | Routes by journey phase + special files |
| [04-bff-and-data.md](frontend/04-bff-and-data.md) | Decision tree + vertical slice path |
| [05-ui-surfaces.md](frontend/05-ui-surfaces.md) | Product surfaces and owner modules |
| [06-admincn-alignment.md](frontend/06-admincn-alignment.md) | AdminCN template → portal mapping |
| [07-nextjs-conventions.md](frontend/07-nextjs-conventions.md) | Next.js App Router conventions |
| [08-operator-phase1-tasks.md](frontend/08-operator-phase1-tasks.md) | Operator post-login phase-1 breakdown (reopened) |
| [09-account-phase3-tasks.md](frontend/09-account-phase3-tasks.md) | Account phase-3 breakdown (reopened) |
| [10-join-phase2-tasks.md](frontend/10-join-phase2-tasks.md) | Join phase-2 breakdown (reopened) |

### API

| Doc | Purpose |
|-----|---------|
| [01-boundaries.md](api/01-boundaries.md) | Trust boundaries; Actions vs Route Handlers |
| [02-rest-resources.md](api/02-rest-resources.md) | REST catalog (`api-now` vs `contract-only`) |
| [03-error-contract.md](api/03-error-contract.md) | Single error shape + status map |
| [04-types.md](api/04-types.md) | Branded IDs, Input/Output, discriminators |
| [05-schema-map.md](api/05-schema-map.md) | Zod modules ↔ resources |

## Next.js decision tree (summary)

```text
Need data?
├── Server Component read?     → lib/domain (or page runner) directly
├── Client mutation?           → Server Action ('use server')
├── Client read that cannot be passed from parent?
│     → prefer lift fetch to Server parent; else Route Handler
├── Webhook / third-party HTTP / health / auth proxy / autosave XHR?
│     → Route Handler under app/api/**
└── External/mobile REST consumer?
      → Route Handler implementing doc/api REST contract
```

**Forbidden:** Server Components fetching the app’s own `/api/*` for ordinary reads.

## Skills / quality bar

Docs follow:

- Next.js App Router best practices (RSC reads, Server Actions mutations, Route Handlers only when HTTP is required)
- API and interface design (contract-first, one error shape, validate at boundaries, Input/Output split, one-version)
- Modular monolith + hexagonal ports/adapters
- TypeScript advanced types (branded IDs, discriminators, `z.infer` — no parallel DTO trees)
- DRY / KISS

## Explicit non-goals

- Restoring deleted `components/`, old `docs/`, or non-lynx `public/` assets in this doc pass
- Implementing UI/API code here
- Duplicating every domain read as a REST GET for the web app
- Parallel/intercepting routes in v1
- Microservices / GraphQL / tRPC / `/api/v2`
- Hot Sales 2D-3 vendor adapters
