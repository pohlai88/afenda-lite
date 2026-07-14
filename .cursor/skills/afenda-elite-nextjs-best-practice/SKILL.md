---
name: afenda-elite-nextjs-best-practice
description: >-
  Afenda-Lite / Elite Next.js App Router mechanics — Vercel nextjs conventions, Accelint
  performance rules, and evaluated Next.js 16 Cache Components (PPR / use cache) gated by
  ADR + org-scoped tags. Use when editing App Router routes, layouts, loaders, Server Actions,
  Route Handlers, rendering/cache policy, or reviewing Next.js perf / security / caching in
  this repo.
disable-model-invocation: true
---

# Afenda Elite — Next.js Best Practice

Xerp-borrowed → Vercel **`nextjs`** → **`accelint-nextjs-best-practices`** → evaluated **`next-cache-components`** (PPR / `'use cache'` — Mode B ADR-gated; Mode A default = request-time + Suspense).

**Elite locks:** Target `apps/web/**` + Living `app/`/`features/`/`modules/` · Neon Auth · ARCH docs · no PAS/`apps/erp`/Storybook · no Collapse recover ([ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md)).

**Announce:** "I'm using afenda-elite-nextjs-best-practice — App Router mechanics only; not inventing module layout."

```text
LOAD: using-afenda-elite-skills · ARCH-002 · ARCH-017 · ARCH-012 · this skill
SKIP: PAS/erp · Xerp editorial · Collapse recover · Pages Router · middleware.ts · Neon→Clerk
LANE: Fix or Normalize — one lane
AUTHORITY: Living frontend ARCH packs override this skill
METHOD: Vercel nextjs + Accelint + next-cache-components (evaluate; default OFF for tenant)
```

---

## Skill chain

| Need | Use |
|------|-----|
| Product entry | `/using-afenda-elite-skills` |
| Greenfield / wipe | `afenda-elite-frontend-scaffold` |
| AdminCN | `admincn-customization` |
| Modules / ports | `afenda-elite-backend-modules` |
| Actions / OpenAPI | `afenda-elite-api-contract` |
| Tenancy | `neon-tenancy-efficiency` · ARCH-023 |
| FFT | `/feed-farm-trade` |
| Conventions API | Vercel plugin `nextjs` → [reference/nextjs-conventions.md](reference/nextjs-conventions.md) |
| Cache Components / PPR | [ADR-008](../../../docs/architecture/adr/ADR-008-cache-components-mode-b.md) · [reference/cache-components.md](reference/cache-components.md) — Phase 1 Accepted; Phase 2 not authorized |
| Perf + Action security | Accelint → [reference/accelint-perf.md](reference/accelint-perf.md) |
| Vercel rule ids | [reference/vercel-perf.md](reference/vercel-perf.md) |
| `proxy.ts` | `routing-middleware` |

---

## Agent read order

1. This file  
2. [reference/nextjs-conventions.md](reference/nextjs-conventions.md)  
3. [reference/accelint-perf.md](reference/accelint-perf.md) — Accelint priority + checklists  
4. [reference/composition.md](reference/composition.md)  
5. [reference/rendering-caching.md](reference/rendering-caching.md)  
6. [reference/cache-components.md](reference/cache-components.md) — PPR / `'use cache'` evaluation (gated)  
7. [reference/vercel-perf.md](reference/vercel-perf.md)  
8. [reference/runtime-mcp.md](reference/runtime-mcp.md)  
9. [reference/app-router-audit.md](reference/app-router-audit.md)  

---

## Ingress map (Lite)

```text
proxy.ts → layout → thin page.tsx (RSC)
  → features/* / AdminCN views
  → app/actions/* (mutations)  OR  modules/* via loaders (reads)
  → app/api/*/route.ts — webhooks / external / health only (not RSC self-fetch)
```

| Family | Gate | Default render |
|--------|------|----------------|
| `/dashboard/*`, `/account/*` | member | request-time |
| `/fft/*` | FFT access | request-time |
| `/client/*` workspace | client session | request-time |
| `/auth/*`, join, public | auth island / public | per surface |
| `/api/health/*` | none | `auto` + short revalidate |
| `/playground/*` | local only | never prod contract |

---

## Data pattern decision

```text
Need data?
├─ Server Component read → RSC / loader (preferred — no /api hop)
├─ Mutation → Server Action — auth+authz+Zod **inside** the action (public endpoint)
├─ Webhook / external REST → Route Handler
└─ Client read → props from RSC; else RH — never invent fetch('/api') for own RSC reads
```

---

## Next.js bindings (hard)

| Topic | Rule |
|-------|------|
| RSC default | No `"use client"` unless hooks / DOM / events |
| Async client | **Invalid** |
| Props RSC→client | Serializable; only fields client uses; Actions for fns |
| Params / cookies / headers | Always `await` (Next 16) |
| Metadata / nav / font / image | Next builtins — not `next/head` / `next/router` |
| Errors | Client `error.tsx`; no Studio barrels; don’t swallow redirect/notFound |
| Coexistence | No `page.tsx` + `route.ts` same folder |
| Proxy / runtime | `proxy.ts` · **Node** default |
| Homes | Thin pages · `features/*` · `modules/*` · no banished `lib/` growth |

→ [reference/nextjs-conventions.md](reference/nextjs-conventions.md)

---

## Performance priority (Accelint order)

Apply **in this order** (details: [reference/accelint-perf.md](reference/accelint-perf.md)):

1. **Security** — every Server Action: session + org/FFT authz + Zod (layout/`proxy` is not enough)  
2. **Waterfalls** — start independent work immediately; `Promise.allSettled` when fully independent  
3. **Serialization** — pass only used fields; avoid duplicate transforms that break RSC reference dedupe  
4. **Suspense** — stream secondary panels; optional promise + `use()` for progressive load  
5. **`React.cache()`** — per-request dedupe; **primitive** cache keys (no inline objects)  
6. **`after()`** — logging/audit after response (never hide auth failures)  
7. **Imports** — avoid mega barrels; deep imports / `next/dynamic` for heavy widgets  

Symptom → rule map lives in Accelint AGENTS.md; Afenda digest: [accelint-perf.md](reference/accelint-perf.md).

---

## Rendering summary

| Surface | Policy |
|---------|--------|
| Session / tenant pages | Request-time — never `force-static` |
| Tenant BFF | Mode A: selective `force-dynamic` / `no-store` · Mode B: migrate segment configs off (ADR-008) |
| Health | `auto` + short revalidate (Mode A) |
| Suspense secondary panels | **Yes now** (no Cache Components required) |
| `'use cache'` / PPR / `cacheComponents` | **Off** — [ADR-008](../../../docs/architecture/adr/ADR-008-cache-components-mode-b.md) Phase 1 Accepted; Phase 2 not authorized |

→ [reference/rendering-caching.md](reference/rendering-caching.md)

---

## MCP (mandatory after App Router edits)

```text
nextjs_index → get_routes → get_errors
```

→ [reference/runtime-mcp.md](reference/runtime-mcp.md)

---

## Hard stops

- Collapse recover (ARCH-028)  
- Server Action without **in-action** auth/authz/Zod  
- Relying only on layout/`proxy` to protect Actions  
- Enabling `cacheComponents` / product `'use cache'` without ADR-008 Phase 2  
- Retaining `force-dynamic`/`revalidate`/`fetchCache` after Mode B enable  
- orgId-only cache keys when role/user/locale/flags alter output  
- Treating MCP `get_errors` as tenant-isolation proof  
- `cookies()`/`headers()` inside `'use cache'` on tenant paths  
- Global cache tags on tenant rows  
- `force-static` / untagged shared cache on session-varying data  
- Async `"use client"` · non-serializable RSC→client props  
- `page` + `route` same directory  
- Swallowing `redirect`/`notFound`  
- Sequential awaits of independent work  
- Inline object keys to `React.cache()`  
- Mega barrel imports for large icon/UI kits  
- Skip MCP `get_errors`  
- Neon Auth replaced by Clerk  

---

## Verification

```bash
npx tsc --noEmit
```

MCP `get_errors` clean · Action checklist in [accelint-perf.md](reference/accelint-perf.md) · AdminCN → `/admincn-customization`

---

## Provenance

- Accelint: `accelint-nextjs-best-practices`  
- Vercel: `nextjs` · `next-cache-components` (+ companions)  
- Xerp: `afenda-nextjs-best-practice` (adapted)  
- Do not invoke Xerp overlay skills here  
