# Afenda-Lite design docs (`doc/`)

Target-state frontend, API, and backend blueprint for **Afenda-Lite** (beta of Afenda ERP).

**Product identity:** [adr/001-afenda-lite-product-identity.md](adr/001-afenda-lite-product-identity.md) — **Client Declaration Portal** is retired.

**Status:** Active design SSOT for rebuild (2026-07-11).  

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal (Ports & Adapters) — [backend/adr/001-modular-monolith-hexagonal.md](backend/adr/001-modular-monolith-hexagonal.md).  

**Sole contract version:** one port catalog + one REST catalog; Actions and Route Handlers share schemas, types, and error codes.

Frontend + API + backend describe **one system**, not three architectures.

**Agent skills:** `/portal-frontend-scaffold` · `/portal-api-contract` · `/portal-backend-modules`

## How to read

1. [backend/README.md](backend/README.md) — framework + contract version  
2. [frontend/04-bff-and-data.md](frontend/04-bff-and-data.md) — **Next.js data-pattern decision tree** (mandatory SSOT)  
3. [frontend/01-architecture.md](frontend/01-architecture.md) — UI layers  
4. [api/01-boundaries.md](api/01-boundaries.md) + [api/02-rest-resources.md](api/02-rest-resources.md) — HTTP/contracts  
5. [backend/07-conventions.md](backend/07-conventions.md) — backend conventions + pointers to `doc/api`  
6. [frontend/07-nextjs-conventions.md](frontend/07-nextjs-conventions.md) — App Router conventions  

## Index

### Product

| Doc | Purpose |
|-----|---------|
| [adr/001-afenda-lite-product-identity.md](adr/001-afenda-lite-product-identity.md) | Product name Afenda-Lite; deprecate Client Declaration Portal |

### Architecture

| Doc | Purpose |
|-----|---------|
| [architecture/multi-tenant-ecosystem.md](architecture/multi-tenant-ecosystem.md) | Hard cutover + multi-org ready (M1–M4) living SSOT |
| [backend/adr/002-platform-tenancy-rbac.md](backend/adr/002-platform-tenancy-rbac.md) | Accepted ADR — three-tier IAM + hard filters |
| [frontend/14-org-admin-rbac-tenancy-tasks.md](frontend/14-org-admin-rbac-tenancy-tasks.md) | Phase 14 evidence (hard cutover closed) |

### Backend

| Doc | Purpose |
|-----|---------|
| [backend/README.md](backend/README.md) | Sole framework + contract version |
| [backend/01-architecture.md](backend/01-architecture.md) | Layers + hexagon (links decision tree) |
| [backend/02-folder-map.md](backend/02-folder-map.md) | `modules/*` L2 + remaining `lib/` |
| [backend/03-bounded-contexts.md](backend/03-bounded-contexts.md) | Identity / Declarations / Trade / Platform |
| [backend/04-ports-and-adapters.md](backend/04-ports-and-adapters.md) | Contract-first ports ↔ files |
| [backend/05-nextjs-adapter-map.md](backend/05-nextjs-adapter-map.md) | App Router ↔ hexagon |
| [backend/06-modules-ownership.md](backend/06-modules-ownership.md) | Modules inventory + residue |
| [backend/07-conventions.md](backend/07-conventions.md) | Runtime, SQL, contract pointers |
| [backend/adr/001-…](backend/adr/001-modular-monolith-hexagonal.md) | Accepted ADR |
| [backend/adr/002-…](backend/adr/002-platform-tenancy-rbac.md) | Platform tenancy + RBAC |

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
| [adr/001-feed-farm-trade.md](frontend/adr/001-feed-farm-trade.md) | Frontend ADR-001 — Feed Farm Trade (locks) |
| [adr/001A-feed-farm-trade-architecture.md](frontend/adr/001A-feed-farm-trade-architecture.md) | Frontend ADR-001A — FFT architecture (boundaries, folders, flow) |
| [adr/001R-feed-farm-trade-roadmap.md](frontend/adr/001R-feed-farm-trade-roadmap.md) | Frontend ADR-001R — FFT MVP roadmap + critical gap register (P0+P1 incl. G1–G6) |
| [11-feed-farm-trade-phase0-shell.md](frontend/11-feed-farm-trade-phase0-shell.md) | FFT Phase 0 development spec + evaluation checklist (Shell) |
| [12-feed-farm-trade-phase1-core-mvp.md](frontend/12-feed-farm-trade-phase1-core-mvp.md) | FFT Phase 1 development spec + evaluation checklist (Core cycle MVP, G1–G9) |
| [13-feed-farm-trade-phase2-ui-polish.md](frontend/13-feed-farm-trade-phase2-ui-polish.md) | FFT Phase 2 development spec (UI polish — reopened 2026-07-11; AC-01..06 PASS) |
| [14-feed-farm-trade-phase3-ops-flags.md](frontend/14-feed-farm-trade-phase3-ops-flags.md) | FFT Phase 3 development spec (deposits/pickup/imports/notifications/ERP — flag-gated) |
| [14-org-admin-rbac-tenancy-tasks.md](frontend/14-org-admin-rbac-tenancy-tasks.md) | Org-admin platform RBAC + hard tenancy (closed) |

### API

| Doc | Purpose |
|-----|---------|
| [01-boundaries.md](api/01-boundaries.md) | Trust boundaries; Actions vs Route Handlers |
| [02-rest-resources.md](api/02-rest-resources.md) | REST catalog (`api-now` vs `contract-only`) |
| [03-error-contract.md](api/03-error-contract.md) | Single error shape + status map |
| [04-types.md](api/04-types.md) | Branded IDs, Input/Output, discriminators |
| [05-schema-map.md](api/05-schema-map.md) | Zod modules ↔ resources |

## Next.js decision tree (summary)

Authority: [frontend/04-bff-and-data.md](frontend/04-bff-and-data.md). Do not maintain a divergent paste.

```text
Need data?
├── Server Component read?     → modules/*/domain (or page runner) directly
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
- Feed Farm Trade 2D-3 vendor adapters
