# ADR-001 — Next.js Modular Monolith + Hexagonal (sole version)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-11 |
| **Deciders** | Portal rebuild program |

## Context

The portal is one Next.js App Router deployable on Vercel with one Neon Postgres + Neon Auth. Frontend and API design docs already prescribe RSC reads, Server Actions mutations, and Route Handlers only when HTTP is required. We need a **named backend framework** so agents and engineers do not invent a second style (microservices, GraphQL, dual API versions).

## Decision

Adopt **one framework version** and **one contract version**:

**Next.js App Router Modular Monolith + Hexagonal Architecture (Ports & Adapters)**

| Rule | Choice |
|------|--------|
| Deployable | Single Next.js app |
| Persistence | Single Neon database |
| Domain | Bounded contexts in `lib/domain` |
| Driving adapters | RSC / Server Actions / `app/api` Route Handlers |
| Validation | Zod in `lib/schemas` at adapter edge only |
| Public HTTP | One REST catalog (`doc/api`) — extend additively |
| Action results | Same error `code` vocabulary as HTTP |

## Consequences

### Positive

- Scales modules (Identity, Declarations, Trade, Platform) without network hops  
- Matches existing code shape — documentation, not a rewrite  
- One mental model for frontend BFF + backend ports  

### Negative / accepted costs

- Trade and Declarations share a DB — careful schema ownership required  
- Extracting a service later needs an explicit ADR (not accidental)  

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Microservices (Trade separate deployable) | Premature; doubles ops; shared Neon Auth/session complexity |
| GraphQL or tRPC beside REST | Second contract version; diamond dependency for clients |
| `/api/v1` + `/api/v2` | Violates one-version rule |
| Edge runtime as default | Neon/DB drivers and session model assume Node |
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; duplicates domain; anti-pattern in Next.js data patterns |
| Hand-written DTOs parallel to Zod | Drift; two sources of truth |

## References

- [../01-modular-hexagonal.md](../01-modular-hexagonal.md)  
- [../05-contract-rules.md](../05-contract-rules.md)  
- [../../frontend/04-bff-and-data.md](../../frontend/04-bff-and-data.md)  
- [../../api/01-boundaries.md](../../api/01-boundaries.md)  
