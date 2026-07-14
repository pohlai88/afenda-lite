# Accelint Next.js perf (Afenda-scoped)

Digest of **`accelint-nextjs-best-practices`** (`AGENTS.md` · `references/*`).  
Upstream lives under `~/.claude/skills/accelint-nextjs-best-practices/` — load a specific `references/*.md` for ❌/✅ examples.

**Overrides:** Neon session helpers · ARCH-023 org/FFT gates · `afenda-elite-api-contract` ActionResult · no Collapse `lib/` auth restore · no cross-request LRU for tenant data.

---

## Quick diagnostic

| Symptom | Accelint # | Do |
|---------|------------|-----|
| Action callable without login | 2.1 | Auth + authz **inside** Action |
| Action / RH slow | 1.1–1.2 | Start work early · `Promise.allSettled` |
| Whole page blocked on data | 1.3 · 2.4 | Suspense · sibling parallel RSC |
| Huge HTML / RSC payload | 2.2–2.3 | Fewer props · share references |
| Same query N times / request | 2.5 | `React.cache()` + primitive keys |
| Logging blocks response | 2.6 | `after()` |
| Slow `next dev` import graph | 3.1 | Deep imports, not mega barrels |
| Unsure server vs client | 3.2 | Server default |

---

## Priority checklist (Accelint)

### 1. Security (Critical)

- [ ] `'use server'` Action re-verifies session (treat as public endpoint)  
- [ ] Org / FFT / ownership authorization before mutation  
- [ ] Zod (or Living contract schema) on all inputs  
- [ ] Safe return shape — no secrets (`afenda-elite-api-contract`)  
- [ ] Do **not** rely solely on `proxy.ts` / layout gates  

### 2. Waterfalls (High)

- [ ] Independent promises **started** before first await (1.1)  
- [ ] Fully independent ops → `Promise.allSettled` (1.2)  
- [ ] Dependent ops still overlap what they can (auth∥config, then data)  
- [ ] Sibling RSC composition for parallel fetches (2.4)  

### 3. Serialization (High)

- [ ] Pass only fields the client uses (2.3)  
- [ ] Avoid server `.map`/`.filter` copies that break reference dedupe when client needs same object graph (2.2)  
- [ ] Prefer ISO strings over `Date` across RSC→client  

### 4. Suspense (Medium)

- [ ] Shell / chrome renders while secondary panels stream (1.3)  
- [ ] Optional: pass `Promise` + `use()` inside Suspense child  
- [ ] Wrap `useSearchParams` clients  

### 5. Cache & after (Medium)

- [ ] `React.cache(fn)` for session/org lookups reused in layout+page  
- [ ] Cache args are **primitives** / stable ids — never inline `{}`  
- [ ] `after(() => …)` for audit/log after response  

### 6. Imports / boundaries (As needed)

- [ ] Deep imports for large UI/icon kits (3.1)  
- [ ] `next/dynamic` for heavy AdminCN/chart clients  
- [ ] `'use client'` only for hooks/events/DOM (3.2)  
- [ ] Pass Server Components as **children** into client wrappers  

---

## Compound pattern (dashboard-style)

```tsx
import { Suspense, cache } from "react";

const getMember = cache(async (userId: string) => {
  /* session + org-scoped load — primitive key */
  return null;
});

export default function DashboardPage() {
  const memberPromise = getMember("…"); // start immediately
  const statsPromise = loadStats();

  return (
    <>
      <Suspense fallback={null}>
        <Header memberPromise={memberPromise} />
      </Suspense>
      <Suspense fallback={null}>
        <Stats statsPromise={statsPromise} />
      </Suspense>
    </>
  );
}
```

Pass **narrow** props into any `'use client'` leaf (`name`, `avatarUrl` — not the whole row).

---

## New Action checklist (Afenda)

- [ ] `'use server'`  
- [ ] Zod / contract parse  
- [ ] Session (Neon)  
- [ ] Org / FFT / resource ownership  
- [ ] Domain call in `modules/*`  
- [ ] Typed ActionResult  
- [ ] `after()` for audit if required  
- [ ] No try/catch swallowing `redirect` / `notFound`  

---

## New Route Handler checklist

- [ ] Named `GET`/`POST`/…  
- [ ] Auth when not public health  
- [ ] Start independent work immediately  
- [ ] `Promise.allSettled` when independent  
- [ ] `after()` for logs  
- [ ] Not colocated with `page.tsx`  
- [ ] Node runtime (default)  

---

## Anti-patterns

| Don’t | Do |
|-------|-----|
| Action with no in-function auth | Session + authz inside Action |
| `await a; await b;` for independent work | Start both, then `allSettled` |
| Pass entire DB row to client | Pass used fields only |
| Await all data before any UI | Suspense secondary panels |
| `cache(async () => f({ id }))` inline object | `cache(async (id: string) => …)` |
| `await log()` before return | `after(() => log())` |
| `import { Icon } from 'lucide-react'` mega trees blindly | Deep path / trim usage |
| `'use client'` on static panels | Keep RSC |

---

## Full upstream refs

Load from Accelint skill when implementing a fix:

- `references/prevent-waterfall-chains.md` (1.1)  
- `references/parallelize-independent-operations.md` (1.2)  
- `references/strategic-suspense-boundaries.md` (1.3)  
- `references/server-actions-security.md` (2.1)  
- `references/avoid-duplicate-serialization.md` (2.2)  
- `references/minimize-serialization.md` (2.3)  
- `references/parallel-data-fetching.md` (2.4)  
- `references/react-cache-deduplication.md` (2.5)  
- `references/use-after-non-blocking.md` (2.6)  
- `references/avoid-barrel-imports.md` (3.1)  
- `references/server-vs-client-component.md` (3.2)  
- `references/quick-checklist.md` · `compound-patterns.md`  

Do **not** use Accelint’s review report template as product SSOT — Afenda verification is MCP + Living ARCH.

**Cache / PPR:** Accelint Suspense + `React.cache()` apply in Mode A today. Full `'use cache'` / `cacheComponents` is Mode B only — [cache-components.md](cache-components.md).
