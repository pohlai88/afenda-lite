# Cache Components (Next.js 16) — Elite method

Digest of Vercel plugin **`next-cache-components`**.  
**Authority:** ADR-008 (Accepted Phase 1) · ARCH-002 · ARCH-023.

| Phase | State |
|-------|--------|
| **1 — Accept** | Done — Mode B laws bind; **`cacheComponents` absent from config**; no product `'use cache'` |
| **2 — Enable** | **Not authorized** until ADR-008 checklists A/B (isolation tests + app-wide migration) |

---

## Evaluation (borrow vs defer)

| Capability | Elite stance | Why |
|------------|--------------|-----|
| `cacheComponents: true` | **Phase 2 only** | App-wide switch; see ADR-008 migration gate |
| Pure session-independent chrome | **Mode A OK** | Sync markup with no session reads — **not** claimed as build-time / independently cached inside a dynamic tenant route |
| Partial static-shell extraction | **Mode B** | Prerendered shell + Suspense dynamic — Phase 2 benefit |
| `'use cache'` | **Phase 2 + D4 scope** | Identical for every principal in declared scope, else keep dynamic |
| `'use cache: remote'` | Platform-cache review | Not default |
| `'use cache: private'` | Last resort | Prefer extract-and-pass |
| Suspense / `React.cache()` | **Mode A now** | Accelint — no flag required |
| Keep `force-dynamic` under Mode B | **No** | Segment `dynamic` / `revalidate` / `fetchCache` **removed** when Cache Components on ([migration guide](https://nextjs.org/docs/app/guides/migrating-to-cache-components)) |
| Mode A selective `force-dynamic` | **Yes** | Tenant BFF while flag off |

**Verdict:** Operate on **Mode A**. Phase 2 is a gated Target upgrade under ADR-008 — not a silent default.

---

## Cache-scope identity (ADR-008 D4)

> A cached result must be identical for every principal within its declared cache scope. Otherwise, keep it dynamic.

Pass every output-affecting value as args (enter the cache key): organization · authz/visibility class · locale/timezone · feature flags · filters/pagination/search · draft/public. **`orgId` alone is not enough.**

---

## Three content types (Phase 2)

| Type | Mechanism | Afenda use |
|------|-----------|------------|
| Static shell | Sync / extractable | No runtime APIs in shell |
| Cached | `'use cache'` + `cacheLife` + `cacheTag` | Public (no PII/tenant) **or** D4-scoped aggregates |
| Dynamic | Runtime + Suspense | Session / org / role / FFT / mutations |

---

## Runtime API constraint

**Cannot** call `cookies()`, `headers()`, or read `searchParams` **inside** `'use cache'` — extract outside, pass args.

---

## Tagging and invalidation (Phase 2)

| Rule | Detail |
|------|--------|
| Builders | Centralized helpers; tags normalized, case-sensitive, below 256 chars |
| Tenant tags | Include org (+ visibility class when views differ by authz) |
| Tag graph | Pilot must define detail · list · aggregate |
| `updateTag(tag)` | Server Actions only — read-your-own-writes |
| `revalidateTag(tag, "max")` | SWR; use from Route Handlers / webhooks |
| Timing | Invalidate **after** DB commit; Accelint 2.1 authz first |

---

## Mode B segment migration (Phase 2)

| Old (Mode A) | Mode B |
|--------------|--------|
| `dynamic = 'force-dynamic'` | Remove — request-time default; use runtime data / `connection()` + Suspense |
| `dynamic = 'force-static'` | Still prohibited for tenant/session-varying output |
| `revalidate = N` | `cacheLife` inside `'use cache'` |
| `fetchCache` | Remove |
| `unstable_cache` | `'use cache'` + `cacheTag` + `cacheLife` |

---

## Phase 2 gates (abbrev)

1. Named pilot + tag graph  
2. Executable isolation tests (cross-org canaries both orders, same-org cross-role, mutation invalidation, stale/expire) — **not** MCP `get_errors` as isolation proof  
3. App-wide: route/RH inventory · production build · segment-config purge · Suspense for runtime APIs · metadata/dynamic routes · GET RH review · tenant route-family regression  

Full lists: ADR-008 § Phase 2 checklist A/B.

---

## Mode A operating mode (current)

| Do | Don’t |
|----|-------|
| Suspense stream secondary panels | Enable `cacheComponents` |
| Selective `force-dynamic` on tenant BFF | Product `'use cache'` |
| `React.cache()` per-request dedupe | Assume MCP `get_errors` proves tenant isolation |
| Pure session-independent chrome | Call Mode A chrome “build-time static shell” |

---

## See also

- ADR-008  
- [rendering-caching.md](rendering-caching.md) · [accelint-perf.md](accelint-perf.md)  
- Vercel: `next-cache-components`  
