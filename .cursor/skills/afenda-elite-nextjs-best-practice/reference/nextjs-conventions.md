# Next.js conventions (Vercel `nextjs` → Afenda)

Maps Vercel plugin `nextjs` reference topics into this repo. For full examples, open the plugin skill refs; apply **Afenda overrides** at the bottom.

| Vercel ref | Afenda use |
|------------|------------|
| `file-conventions` | App Router special files · route groups · **proxy.ts** (not middleware) |
| `rsc-boundaries` | No async client · serializable props · Server Actions as fn exception |
| `async-patterns` | Await `params` / `searchParams` / `cookies` / `headers` |
| `data-patterns` | RSC reads · Actions mutations · RH external |
| `error-handling` | Client `error.tsx` · don’t swallow redirect/notFound |
| `route-handlers` | Named methods · no `page`+`route` colocated |
| `directives` | `'use client'` / `'use server'` / gated `'use cache'` → [cache-components.md](cache-components.md) |
| `runtime-selection` | Node default |
| `suspense-boundaries` | Wrap `useSearchParams` (and dynamic `usePathname` clients) |
| `functions` | `after`, metadata, navigation hooks |
| `metadata` / `image` / `font` / `scripts` | Prefer Next builtins |
| `bundling` | Server-safe packages · analyze when needed |
| `hydration-error` | No browser APIs in RSC; fix invalid HTML |
| `parallel-routes` | Optional modals — only with ARCH/route approval |
| `debug-tricks` | MCP `/_next/mcp` + next-devtools |

---

## File conventions (short)

Required shape under `app/`:

- `layout.tsx` (root required) · `page.tsx` · optional `loading` / `error` / `not-found` / `template` / `default`  
- Route groups `(name)` — no URL segment  
- Dynamic `[param]` — descriptive names (no overloaded `[id]` — frontend-scaffold)  
- Catch-all `[...slug]` / optional `[[...slug]]` only when ARCH-012 allows  

**proxy.ts:** Next 16 rename of middleware — session/tenant redirect only; no business logic.

---

## RSC boundaries

| Bad | Good |
|-----|------|
| `'use client'` + `async function` | Async RSC parent; sync client child |
| Pass `() => …`, `Date`, `Map` to client | Pass ISO strings / POJOs; Actions for mutations |
| Client fetches own DB via secrets | RSC/loader or Action with session |

Server Actions **may** be passed to client as props (serializable action reference).

---

## Async patterns

```tsx
type Props = {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { assignmentId } = await params;
  const { q } = await searchParams;
  // …
}

export async function generateMetadata({ params }: Props) {
  const { assignmentId } = await params;
  return { title: assignmentId };
}
```

Route Handlers:

```ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return Response.json({ id });
}
```

---

## Data patterns

| Case | Choose |
|------|--------|
| Read in page/layout | RSC + loader / `modules/*` (preferred) |
| Form / mutation | Server Action + re-auth + Zod |
| Stripe webhook / public machine API | `app/api/**/route.ts` |
| Health | `app/api/health/**` |
| Client needing live poll | Pass initial from RSC; Action/RH for updates — avoid RSC→`/api` self-fetch |

---

## Errors & navigation

- `error.tsx` / `global-error.tsx`: `'use client'`; plain button UI; **no** Studio/AdminCN barrels  
- `global-error.tsx` must render `<html>` + `<body>`  
- Prefer `notFound()`, `redirect()`, `forbidden()`, `unauthorized()` for control flow  
- In Actions: call `redirect`/`notFound` **outside** try/catch, or rethrow Next control errors  

---

## Route Handlers

- Named HTTP exports only  
- Web `Request`/`Response`  
- `await params` on dynamic segments  
- **Never** same folder as `page.tsx`  
- Prefer Actions for first-party browser mutations  

---

## Suspense

- Wrap client components using `useSearchParams`  
- Stream secondary AdminCN/FFT panels  
- Pair with `loading.tsx` at segment boundaries that await  

---

## Runtime / media / scripts

- Default **Node** for DB/session (Neon)  
- `next/image` for product images; configure remotePatterns when needed  
- `next/font` for app fonts  
- `next/script` for third-party; give inline scripts an `id`  

---

## Afenda overrides

| Vercel nudge | Afenda |
|--------------|--------|
| Managed Clerk/Auth0 | **Neon Auth** |
| Edge by default | **Node** (ARCH-002) |
| Broad static / Cache Components | Mode A request-time default; Mode B Phase 2 only — ADR-008 · Living ARCH-016 |
| Parallel/intercepting modals | Only with route catalogue approval |
| Self-host Docker matrix | Vercel primary — consult ops ADRs if ever needed |

---

## See also

- [composition.md](composition.md)  
- [rendering-caching.md](rendering-caching.md)  
- [cache-components.md](cache-components.md)  
- [accelint-perf.md](accelint-perf.md)  
- [vercel-perf.md](vercel-perf.md)  
- [runtime-mcp.md](runtime-mcp.md)  
- [app-router-audit.md](app-router-audit.md)  
