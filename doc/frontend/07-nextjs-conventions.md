# Next.js conventions (App Router)

Authority: Next.js App Router best practices (file conventions, RSC, async APIs, data patterns, route handlers, errors, suspense, image/font).

## Special files

| File | When |
|------|------|
| `layout.tsx` | Shared chrome for a segment (root required) |
| `page.tsx` | Route UI — thin |
| `loading.tsx` | Instant loading UI (Suspense) — required on authenticated product segments |
| `error.tsx` | Segment error boundary (client) |
| `not-found.tsx` | 404 |
| `global-error.tsx` | Root fatal errors |
| `route.ts` | HTTP only under `app/api/**` — **never** beside `page.tsx` |

Parallel / intercepting routes (`@slot`, `(.)`): **out of scope for v1**.

## Async APIs (mandatory)

```tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  // ...
}
```

Also await `cookies()` / `headers()` when used. Do not treat them as sync.

## RSC boundaries

| Rule | Detail |
|------|--------|
| No async client components | `'use client'` components cannot be `async` |
| Serializable props | Server → Client: plain data only (no class instances, functions, Dates unless serialized) |
| Server Actions exception | Pass actions as props / import in client forms |
| Fetch in parent | Load in RSC; pass props into client islands |

## Directives

| Directive | Use |
|-----------|-----|
| `'use client'` | Interactivity, browser APIs, Radix, forms with local state |
| `'use server'` | Server Action module / function |
| `'use cache'` | Only with explicit caching design — default off for auth-bound data |

## Proxy (Next.js 16)

- File: root [`proxy.ts`](../../proxy.ts) — **not** `middleware.ts`  
- Session gate for matched paths; public prefixes stay unmatched  
- Bypass: `next-action` header, `?embed=1`, client login, preview-unavailable  
- Server Actions still call `require*Session` inside the action  

## Errors and navigation

| API | Use |
|-----|-----|
| `notFound()` | Missing resource |
| `redirect` / `permanentRedirect` | Auth / ACL redirects |
| `error.tsx` | Unexpected render failures |
| `unstable_rethrow` | Re-throw Next control-flow errors inside catch |

Do not swallow `redirect` / `notFound` in broad `catch`.

## Suspense

- `loading.tsx` wraps the segment in Suspense automatically  
- Client components using `useSearchParams` need a Suspense boundary (parent or `loading.tsx`) to avoid CSR bailout flashes  

## Image and font

| Concern | Rule |
|---------|------|
| Images | `next/image` for `public/lynx/*` (and any future static assets) |
| LCP hero | `priority` on above-the-fold Lynx art |
| Fonts | `next/font` in root layout; wire to Tailwind theme — no ad-hoc `<link>` font tags |

## Runtime

- Default **Node.js** for pages, actions, route handlers (Neon)  
- Edge only with a written exception (no DB driver on Edge without a plan)  

## Metadata

- Static `metadata` or `generateMetadata` on pages that need titles  
- Prefer portal copy helpers over hardcoded strings  

## Related

- [04-bff-and-data.md](04-bff-and-data.md)  
- [03-routes.md](03-routes.md)  
