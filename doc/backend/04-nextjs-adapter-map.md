# Next.js adapter map

Maps Hexagonal roles to **App Router primitives only**. No second BFF framework.

## Role ↔ primitive

| Hexagonal role | Next.js primitive | Optimize |
|----------------|-------------------|----------|
| Driving adapter (query) | RSC `page.tsx` → `lib/pages` / `lib/entry` | Call `lib/domain` directly |
| Driving adapter (command) | Server Action (`'use server'` in `app/actions`) | Zod + `require*Session` + `revalidatePath` / `revalidateTag` |
| Driving adapter (HTTP) | `app/api/**/route.ts` | Health, Neon Auth proxy, draft XHR, external clients |
| Inbound DTO validation | `lib/schemas` | Validate once at adapter |
| Application port | Named exports in `lib/domain` | Shared by Action and/or Route Handler |
| Driven adapter (DB) | SQL inside domain modules | Node runtime |
| Driven adapter (Auth) | `lib/auth` + `/api/auth/[...path]` | Do not reimplement auth |
| App edge session gate | `proxy.ts` (Next 16) | Not `middleware.ts`; bypass `next-action` |

## Decision tree (mandatory)

Identical to [../frontend/04-bff-and-data.md](../frontend/04-bff-and-data.md) and [01-modular-hexagonal.md](01-modular-hexagonal.md):

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

## Anti-patterns (forbidden)

| Anti-pattern | Why |
|--------------|-----|
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; secrets already on server |
| `page.tsx` + `route.ts` in same segment | Next.js conflict — APIs under `app/api/**` only |
| Fat `page.tsx` with SQL | Breaks hexagon; untestable |
| GraphQL/tRPC beside REST | Second contract version |
| Edge as default for domain routes | Neon/session assume Node |
| Passing non-serializable props Server → Client | RSC boundary violation (Actions are the exception) |

## Conventions checklist

- Await `params` / `searchParams` / `cookies()` / `headers()`  
- `loading.tsx` / `error.tsx` on authenticated product segments  
- Never colocate page and route handlers  
- See [../frontend/07-nextjs-conventions.md](../frontend/07-nextjs-conventions.md)  

## Related

- [01-modular-hexagonal.md](01-modular-hexagonal.md)  
- [03-ports-and-adapters.md](03-ports-and-adapters.md)  
- [../frontend/07-nextjs-conventions.md](../frontend/07-nextjs-conventions.md)  
