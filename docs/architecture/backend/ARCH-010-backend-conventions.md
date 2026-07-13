# ARCH-010 Backend Conventions

| Field | Value |
|-------|-------|
| ID | ARCH-010 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Backend |
| Updated | 2026-07-13 |

Pointer doc — full contract tables live under [`docs/api/`](../../api/). Decision tree lives under [`docs/architecture/frontend/ARCH-013-bff-and-data-flow.md`](../../architecture/frontend/ARCH-013-bff-and-data-flow.md).

## Runtime

- **Node.js** default for product pages, Actions, and domain routes.  
- Edge only as a documented exception (not for Neon/session domain work).  
- `proxy.ts` (Next 16) for document navigation session gates — never new `middleware.ts`.

## SQL and domain

- Parameterized queries only inside `modules/*/domain` (or driven helpers owned by that context).  
- No raw SQL in `app/actions`, `app/api` route files, or `page.tsx`.  
- Ports never import `Request`, `next/headers`, or UI.

## Validation

- Zod at the adapter edge in the **owning** `modules/*/schemas` module.  
- Env via `modules/platform/env`.  
- Domain trusts typed values after `parseSchema` / `safeParse`.

## One-version contract (summary)

Full rules: [../api/API-001-api-boundaries.md](../../api/API-001-api-boundaries.md), [../api/API-002-error-contract.md](../../api/API-002-error-contract.md), [../api/API-003-api-types.md](../../api/API-003-api-types.md).

- One public contract — no `/api/v2`, no GraphQL/tRPC twin.  
- Server Action and Route Handler for the same use-case share Zod schema, output type, and error `code`s.  
- Prefer additive optional fields; breaking changes need a new ADR.  
- Errors: HTTP `{ error: { code, message, details? } }` · Actions `ActionResult<T>` — same `code` vocabulary.  
- Types from `z.infer` — no parallel hand-written DTO trees.  
- Brands: `DeclarationId`, `ClientId`, `TradeEventId`, … — see [../api/API-003-api-types.md](../../api/API-003-api-types.md).

## Trade naming

- Product: **Feed Farm Trade**  
- Code path: **`modules/fft/`** (never `modules/trade/`)  
- Action file: `app/actions/fft.ts`

## Greenfield vs runners

- New domain/schema/env → `modules/<context>/`  
- Do not grow `lib/pages` / `lib/entry` for greenfield UI — use `features/*`  
- Pass 2 residue prune **complete** — see skill `residue-inventory.md` (`lib/` = runners only)

## Related

- [01-architecture.md](ARCH-004-backend-layers.md)  
- [05-nextjs-adapter-map.md](ARCH-008-next-js-adapter-map.md)  
- [../api/REST-001-rest-resources.md](../../api/REST-001-rest-resources.md)  
- [ARCH-022](../turborepo/ARCH-022-system-overview.md)  
