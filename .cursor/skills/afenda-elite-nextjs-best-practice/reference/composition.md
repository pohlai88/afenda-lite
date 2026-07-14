# Composition — thin App Router pages

**Authority:** [ARCH-002](../../../docs/architecture/ARCH-002-frontend-architecture.md) · [ARCH-017](../../../docs/architecture/ARCH-017-frontend-folder-map.md).  
**Method:** Vercel `nextjs` + Accelint 1.x/2.x · [nextjs-conventions.md](nextjs-conventions.md) · [accelint-perf.md](accelint-perf.md).

---

## Flow

```text
page.tsx (thin RSC)
  → start independent promises immediately (Accelint 1.1)
  → Promise.allSettled when fully independent (1.2)
  → Suspense secondary panels; optional promise + use() (1.3 / 2.4)
  → features/* / AdminCN — pass minimal serializable props (2.3)
  → modules/* reads / app/actions/* mutations (2.1 auth inside Action)
```

**Do not** have the RSC call its own `fetch('/api/...')` for first-party reads.

---

## Where UI lives

| UI type | Location |
|---------|----------|
| Product screens | `features/<area>/` |
| AdminCN shell / portal-views | Logical `components-V2/` homes ([ARCH-017](../../../docs/architecture/ARCH-017-frontend-folder-map.md)) — Studio DNA promote only; never recover Collapse trees |
| Route-local composition | colocated `_components/` under the route segment when needed |
| Heavy charts / widgets | `next/dynamic` client leaves (`bundle-dynamic-imports`) |
| Studio MCP install | Temporary scratch cwd — promote into `features/` / `portal-views/`; never keep `shadcn-studio/` nesting |

**Do not** dump module UI into a root `components/` recycling bin. **Avoid barrel imports** that pull entire UI kits (`bundle-barrel-imports`).

---

## File contracts

| File | May | Must not |
|------|-----|----------|
| `page.tsx` | loader, feature panels, `generateMetadata`, Suspense | `"use client"`, DB clients, inline domain, colocated `route.ts` |
| `layout.tsx` | shell, providers (one theme owner) | Per-page waterfalls |
| `*.server.ts` loaders | session, `modules/*`, Zod, `React.cache` | React hooks; cross-tenant cache |
| `"use server"` actions | session+authz+Zod **inside** action, domain | Skip in-action auth; return secrets; catch redirect/notFound |
| `error.tsx` | `'use client'` + plain UI / shadcn **ui** only | Studio / AdminCN shell barrels; missing client directive |
| Client leaves | hooks, events | `async` client components; non-serializable props from RSC |

---

## Thin page shape

```tsx
import { Suspense } from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;

  // Kick independent work in parallel inside loaders (async-parallel).
  // const data = await loadThing(assignmentId);

  return (
    <>
      {/* Primary panel — awaited above or here */}
      {/* <ThingPanel data={data} /> */}
      <Suspense fallback={null}>
        {/* Secondary streamable panel */}
      </Suspense>
    </>
  );
}
```

---

## RSC → client boundary

- Pass **only fields the client uses** (Accelint 2.3)  
- Prefer shared object references over server-side `.map`/`.filter` copies that force duplicate serialization (2.2)  
- ISO strings — not `Date` objects  
- No function props except Server Actions  
- Never `'use client'` + `async`  
- Wrap `useSearchParams` clients in `<Suspense>`  
- `React.cache(fn)` with **primitive** arguments when deduping session/org loads (2.5)  
- Do not redefine components inside components  

---

## See also

- [accelint-perf.md](accelint-perf.md) — full Accelint checklists  
- [vercel-perf.md](vercel-perf.md) — Vercel id crosswalk  

## Naming

| Suffix | Use |
|--------|-----|
| `.server.ts` | Server-only loaders |
| `page.tsx` / `layout.tsx` | App Router segments |
| Client leaves | `"use client"` under `features/*` |

