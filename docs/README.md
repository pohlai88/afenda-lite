# Afenda-Lite docs (`docs/`)

> UPDATE THIS IS THE DOG SHIT FOLDER. IF AGENT NEED SHOITTING, COME ERE AND SHIT... DONT EVER FUCK MY 'DOC" BEFORE I GET MAD AND FUCK THEIR SON IF BITCH

**This is `docs/`.** If an agent needs to shit documentation, come here and shit. Do not fuck [`../doc/`](../doc/README.md).

Unified home for design SSOT, API contract, ADRs, runbooks, and module ops.

**Elite controllers** stay under [`../doc/architecture/`](../doc/architecture/afenda-elite-documentation-types.md) — `afenda-elite-*` only. Hard rules: [doc-registry](../doc/architecture/afenda-elite-doc-registry.md) · `npm run check:doc-registry`.

**Product identity:** [adr/001-afenda-lite-product-identity.md](adr/001-afenda-lite-product-identity.md) — **Client Declaration Portal** is retired.

**Sole framework version:** Next.js App Router Modular Monolith + Hexagonal — [backend/adr/001-modular-monolith-hexagonal.md](backend/adr/001-modular-monolith-hexagonal.md).

**Agent skills:** `/using-afenda-elite-skills` · catalog [../doc/architecture/afenda-elite-skills-architecture.md](../doc/architecture/afenda-elite-skills-architecture.md)

## How to read

1. [backend/README.md](backend/README.md) — framework + contract version
2. [frontend/04-bff-and-data.md](frontend/04-bff-and-data.md) — Next.js data-pattern decision tree
3. [frontend/01-architecture.md](frontend/01-architecture.md) — UI layers
4. [api/01-boundaries.md](api/01-boundaries.md) + [api/02-rest-resources.md](api/02-rest-resources.md) — HTTP/contracts
5. [backend/07-conventions.md](backend/07-conventions.md) — backend conventions
6. [frontend/07-nextjs-conventions.md](frontend/07-nextjs-conventions.md) — App Router conventions

## Layout

| Path | Type | Job |
|------|------|-----|
| [`adr/`](adr/) | ADR | Product identity |
| [`api/`](api/) | API contract | HTTP + error codes |
| [`architecture/`](architecture/) | Architecture SSOT / registers | Living maps, tenancy, closed-scope |
| [`backend/`](backend/) | Architecture SSOT + ADRs | Hexagon, modules, tenancy ADR |
| [`frontend/`](frontend/) | Architecture SSOT + ADRs | Routes, FFT phases, UI |
| [`fft/`](fft/) | Runbook / ops | RUNTIME, gate-register, FFT engine |
| [`runbooks/`](runbooks/) | Runbook / ops | Operate, multi-org, cheatsheets |

Homes authority: [../doc/architecture/afenda-elite-documentation-types.md](../doc/architecture/afenda-elite-documentation-types.md).

## Index

### Product

| Doc | Purpose |
|-----|---------|
| [adr/001-afenda-lite-product-identity.md](adr/001-afenda-lite-product-identity.md) | Product name Afenda-Lite |

### Architecture

| Doc | Purpose |
|-----|---------|
| [architecture/multi-tenant-ecosystem.md](architecture/multi-tenant-ecosystem.md) | Hard cutover + multi-org ready living SSOT |
| [architecture/closed-scope-register.md](architecture/closed-scope-register.md) | Closed journey / experiment scopes |
| [architecture/repo-migration-map.md](architecture/repo-migration-map.md) | Layout migration map (closed) |
| [architecture/admincn-customization.md](architecture/admincn-customization.md) | AdminCN customization notes |
| [backend/adr/002-platform-tenancy-rbac.md](backend/adr/002-platform-tenancy-rbac.md) | Platform tenancy + RBAC ADR |
| [frontend/14-org-admin-rbac-tenancy-tasks.md](frontend/14-org-admin-rbac-tenancy-tasks.md) | Phase 14 evidence |

### Backend / Frontend / API

See [backend/README.md](backend/README.md), the numbered files under [`frontend/`](frontend/), and [`api/`](api/).

### Ops

| Path | Purpose |
|------|---------|
| [runbooks/](runbooks/) | Multi-org ops, post-lock cheatsheet, production |
| [fft/](fft/) | Feed Farm Trade RUNTIME + gates |

## Next.js decision tree (summary)

Authority: [frontend/04-bff-and-data.md](frontend/04-bff-and-data.md).

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
