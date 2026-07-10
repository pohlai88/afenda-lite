# Modular Monolith + Hexagonal (method reference)

**Framework version:** Next.js App Router Modular Monolith + Hexagonal (Ports & Adapters)  
**ADR:** [adr/001-modular-monolith-hexagonal.md](adr/001-modular-monolith-hexagonal.md)

## What it means

| Term | Meaning here |
|------|----------------|
| Modular monolith | One deployable; code split by **bounded context**, not by network |
| Hexagonal | Domain/use-cases at the center; **driving** adapters (UI/HTTP) and **driven** adapters (DB/Auth) at the edges |
| Port | Contract (TypeScript interface / documented use-case set) that adapters call |
| Adapter | Next.js RSC, Server Action, or Route Handler (driving); SQL / Neon Auth (driven) |

## Layers (do / don't)

| Layer | May | Must not |
|-------|-----|----------|
| Driving adapter | Session guard, Zod parse, map errors, `revalidatePath` | Raw SQL, business rules duplication |
| Port / use-case (`lib/domain` exports) | Orchestrate domain rules, call DB helpers | Import `Request`, `next/headers`, UI |
| Zod (`lib/schemas`) | Shape inbound DTOs | Touch DB |
| Driven (SQL / Neon Auth) | Persist / identity provider | Know about React or HTTP status codes |

## Next.js data-pattern decision tree (mandatory)

**Byte-identical** to [../frontend/04-bff-and-data.md](../frontend/04-bff-and-data.md):

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

## Diagram

```mermaid
flowchart TB
  subgraph driving [Driving adapters]
    RSC[RSC page runners]
    SA[Server Actions]
    RH[Route Handlers]
  end
  subgraph core [Ports and domain]
    Zod[lib/schemas]
    UC[lib/domain use-cases]
  end
  subgraph contexts [Bounded contexts]
    Id[Identity]
    Dec[Declarations]
    Trade[Trade]
    Plat[Platform]
  end
  subgraph driven [Driven adapters]
    Neon[(Neon)]
    NA[Neon Auth]
  end
  RSC --> UC
  SA --> Zod --> UC
  RH --> Zod
  UC --> Id
  UC --> Dec
  UC --> Trade
  UC --> Plat
  Id --> Neon
  Id --> NA
  Dec --> Neon
  Trade --> Neon
  Plat --> Neon
```

## KISS defaults

- Do **not** add `lib/application/` unless a port cannot be expressed as domain exports.  
- Do **not** introduce repository classes until a second store appears.  
- Do **not** expose every use-case as HTTP — see `api-now` vs `contract-only` in [../api/02-rest-resources.md](../api/02-rest-resources.md).  

## Related

- [04-nextjs-adapter-map.md](04-nextjs-adapter-map.md)  
- [05-contract-rules.md](05-contract-rules.md)  
- [02-bounded-contexts.md](02-bounded-contexts.md)  
