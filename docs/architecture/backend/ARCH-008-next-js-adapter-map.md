# ARCH-008 Next.js Adapter Map

| Field | Value |
|-------|-------|
| ID | ARCH-008 |
| Category | Architecture |
| Version | 1.0.1 |
| Status | Living |
| Control State | Closed |
| Owner | Backend |
| Updated | 2026-07-14 |
Maps Hexagonal roles to **App Router primitives only**. No second BFF framework.

## Role ↔ primitive

| Hexagonal role | Next.js primitive | Optimize |
|----------------|-------------------|----------|
| Driving adapter (query) | RSC `page.tsx` → `features/*` runners | Call `modules/*/domain` directly |
| Driving adapter (command) | Server Action (`'use server'` in `app/actions`) | Zod + `require*Session` + `revalidatePath` / `revalidateTag` |
| Driving adapter (HTTP) | `app/api/**/route.ts` | Health, Neon Auth proxy, draft XHR, external clients |
| Inbound DTO validation | `modules/*/schemas` | Validate once at adapter |
| Application port | Named exports in `modules/*/domain` | Shared by Action and/or Route Handler |
| Driven adapter (DB) | SQL inside module domain | Node runtime |
| Driven adapter (Auth) | `modules/identity/auth` + `/api/auth/[...path]` | Do not reimplement auth |
| App edge session gate | `apps/web/proxy.ts` (Next 16) | Not `middleware.ts`; bypass `next-action` |

## Decision tree (mandatory)

Identical to [../architecture/frontend/ARCH-013-bff-and-data-flow.md](../../architecture/frontend/ARCH-013-bff-and-data-flow.md) — **link only; do not paste**.

## Live adapters (disk)

| Kind | Paths |
|------|-------|
| Server Actions | `app/actions/account.ts`, `admin.ts`, `client.ts`, `declarations.ts`, `fft.ts`, `surveys.ts` |
| Route Handlers | `app/api/health/liveness`, `app/api/health/readiness`, `app/api/auth/[...path]`, `app/api/client/declaration-draft` |

## Anti-patterns (forbidden)

| Anti-pattern | Why |
|--------------|-----|
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; secrets already on server |
| `page.tsx` + `route.ts` in same segment | Next.js conflict — APIs under `app/api/**` only |
| Fat `page.tsx` with SQL | Breaks hexagon; untestable |
| GraphQL/tRPC beside REST | Second contract version |
| Edge as default for domain routes | Neon/session assume Node |
| Passing non-serializable props Server → Client | RSC boundary violation (Actions are the exception) |
| New domain under `lib/` | Use `modules/<context>/` |

## Conventions checklist

- Await `params` / `searchParams` / `cookies()` / `headers()`  
- `loading.tsx` / `error.tsx` on authenticated product segments  
- Never colocate page and route handlers  
- See [../architecture/frontend/ARCH-016-next-js-conventions.md](../../architecture/frontend/ARCH-016-next-js-conventions.md)  

## Related

- [01-architecture.md](ARCH-004-backend-layers.md)  
- [04-ports-and-adapters.md](ARCH-007-ports-and-adapters.md)  
- [07-conventions.md](ARCH-010-backend-conventions.md)  
- [../architecture/frontend/ARCH-016-next-js-conventions.md](../../architecture/frontend/ARCH-016-next-js-conventions.md)  
