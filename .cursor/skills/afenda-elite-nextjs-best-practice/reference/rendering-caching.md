# Rendering and caching matrix

**Authority:** [ADR-008](../../../docs/architecture/adr/ADR-008-cache-components-mode-b.md) · [ARCH-002](../../../docs/architecture/ARCH-002-frontend-architecture.md) · [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md).  
**Method:** [nextjs-conventions.md](nextjs-conventions.md) · **[cache-components.md](cache-components.md)**.

Afenda product surfaces are **tenant / session-scoped by default**. Do not apply generic static optimization or shared remote cache without ADR-008 D4 principal-safe scope.

---

## Operating modes

| Mode | When | Tools |
|------|------|-------|
| **A — Default (operational)** | ADR-008 Phase 1; flag **off** | Request-time · Suspense · `React.cache()` · selective `force-dynamic` · pure session-independent chrome |
| **B — Enable** | ADR-008 Phase 2 checklists **only** | `cacheComponents: true` · extractable static shell · `'use cache'` · scoped tags · migrate **off** `dynamic`/`revalidate`/`fetchCache` |

Full law: [cache-components.md](cache-components.md) · ADR-008.

---

## A. Route Handlers (`app/api/**/route.ts`) — Mode A

| Kind | `dynamic` | `revalidate` | When |
|------|-----------|--------------|------|
| Mutations / session / org reads | `force-dynamic` | omit | Default product BFF (**Mode A only**) |
| Health / liveness | `auto` | short (e.g. 30) | Diagnostics only |
| `force-static` on tenant data | **prohibited** | — | Hard stop |

**Mode B:** remove unsupported segment configs; request-time default; runtime data / uncached / `connection()`; no tenant `'use cache'` without D4. Review GET handlers per ADR-008 checklist B.

- Named exports · Web `Request`/`Response` · Node default  
- Start independent promises early  
- **Never** colocated with `page.tsx`  
- Cache Components unsupported on Edge  

---

## B. Pages and layouts (Mode A — default)

| Scenario | Guidance |
|----------|----------|
| Dashboard / account / FFT / client workspace | Request-time via `await cookies()` / `await headers()` — **never** `force-static` |
| Pure session-independent chrome | Sync markup OK under Mode A — **not** Mode B partial static-shell extraction |
| Secondary panels | Suspense stream (no `cacheComponents` needed) |
| Cache Components | **Off** — Phase 1 only |

### Next 16 async request APIs

```ts
import { cookies, headers } from "next/headers";

const cookieStore = await cookies();
const headerList = await headers();
```

### Per-request dedup (not HTTP / Cache Components)

```ts
import { cache } from "react";

export const loadSessionThing = cache(loadSessionThingUncached);
```

`React.cache()` = **one request** only. Primitive args. Not a substitute for `'use cache'`.

### What opts a segment into dynamic (`auto`) — Mode A

- `await cookies()`, `await headers()`, `draftMode()`  
- Uncached fetches / request-scoped data  

---

## C. Directives

| Directive | Mode | When |
|-----------|------|------|
| `'use client'` | A/B | Hooks, events, browser APIs |
| `'use server'` | A/B | Server Actions (mutations) |
| `'use cache'` | **B Phase 2 only** | ADR-008 + D4 scope + tag graph |
| `'use cache: remote'` | **B Phase 2** | Platform-cache review |
| `'use cache: private'` | **B last resort** | Prefer passing ids |

### Mode B enable checklist (abbrev)

See ADR-008 Phase 2 A (isolation tests) + B (app-wide migration). Skill digest: [cache-components.md](cache-components.md).

Do **not** retain `force-dynamic` as a Mode B requirement. Do **not** use MCP `get_errors` as tenant-isolation proof.

---

## D. Server Actions

| Rule | Detail |
|------|--------|
| Re-verify session | Inside Action (Accelint 2.1) |
| Authorization | Org / FFT / ownership |
| Validate input | Zod / Living contract |
| Invalidation (Mode B) | After DB commit: `updateTag` (Actions) · `revalidateTag(tag, "max")` (SWR / RH) · centralized tags |
| Navigation | Do not swallow `redirect` / `notFound` |
| Non-blocking | `after()` for audit/log |
| Return shape | No secrets — api-contract |

---

## Hard stops

- Enabling `cacheComponents` without ADR-008 Phase 2  
- Product `'use cache'` under Phase 1  
- orgId-only keys when role/user/locale/flags alter output  
- Global tags on tenant rows  
- `cookies()` / `headers()` inside `'use cache'`  
- Retaining `force-dynamic` / `revalidate` / `fetchCache` after Mode B enable  
- `force-static` or untagged shared cache on session-varying output  
- Edge + Cache Components  
- `route.ts` beside `page.tsx`  
