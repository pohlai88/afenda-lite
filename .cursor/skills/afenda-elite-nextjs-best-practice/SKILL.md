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

Local Elite Next.js mechanics: Vercel **`nextjs`** → **`accelint-nextjs-best-practices`** → evaluated **`next-cache-components`** (PPR / `'use cache'` — Mode B ADR-gated; Mode A default = request-time + Suspense).

**Elite locks:** Target `apps/web/**` + Living shape maps · Neon Auth · ARCH docs · no PAS/`apps/erp`/Storybook · no Collapse recover ([ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md)).

**Announce:** "I'm using afenda-elite-nextjs-best-practice — App Router mechanics only; not inventing module layout."

```text
LOAD: using-afenda-elite-skills · ARCH-002 · ARCH-017 · ARCH-012 · this skill
SKIP: PAS/erp · Xerp editorial overlays · Collapse recover · Pages Router · middleware.ts · Neon→Clerk
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

### Server Action mechanics (this farm)

App Router / public-endpoint discipline lives here; wire shapes and codes live in [`afenda-elite-api-contract`](../afenda-elite-api-contract/SKILL.md); org predicates and permission-first IAM live in [`neon-tenancy-efficiency`](../neon-tenancy-efficiency/SKILL.md).

- [ ] `'use server'` file/export is reachable like a public HTTP endpoint — re-verify session in the body
- [ ] Do **not** treat `proxy.ts` or layout auth as sufficient for mutations
- [ ] Org-scoped tags / cache keys when any cache crosses requests (Mode B / tags) — never org-blind tenant payloads
- [ ] Prefer RSC reads; never `fetch('/api/...')` for ordinary same-origin product reads

Full Accelint security/perf checklist: [reference/accelint-perf.md](reference/accelint-perf.md).

### Env / client-secret boundary (ARCH-027)

Dedicated `afenda-elite-env-governance` remains catalog **candidate**. Enforce [ARCH-027](../../../docs/architecture/ARCH-027-env-model.md) two-state rule:

| State | Rule |
|-------|------|
| **Docs-first / pre-S4.1 (this checkout)** | No live `env:compose` pipeline. Do **not** restore Collapse compose scripts or `lib/env/`. Do **not** create `.env.local` or run `vercel env pull`. Human `env.config` / `env.secret` files (if present) are inventory notes only — not a compose authority. |
| **Target post-S4.1** | `@afenda/env` is the only app config reader; `.env.local` is the only local runtime env file; no compose / `env:guard`. |

| Rule | Detail |
|------|--------|
| No secrets in client bundles | Never put DB URLs, API keys, or service credentials in `NEXT_PUBLIC_*` or Client Components |
| Fail fast on critical config | After S4.1, Zod `@afenda/env` refuses boot on missing critical secrets |
| Optional integrations | Unconfigured optional vendors degrade that capability only — do not fail unrelated boot paths |
| Docs-first audit | Prefer key-**name** audits / Neon MCP over inventing compose |

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
- Historical inspiration from an earlier Afenda Next.js skill set (local copy only; no external-repo LOAD)  
