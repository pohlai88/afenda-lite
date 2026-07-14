# ADR-008 Cache Components Mode B (Gated)

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ADR-008      |
| **Category**      | ADR          |
| **Version**       | 1.0.1        |
| **Status**        | Accepted     |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Bind Next.js 16 Cache Components (`cacheComponents` / PPR / `'use cache'`) to **Mode B only**: ADR-gated, principal-safe cache keys, Node-only. **Mode A** remains the operational default for tenant/session surfaces ([ARCH-002](../ARCH-002-frontend-architecture.md)).

**Phase 1 (this Accepted revision):** Mode B laws are authoritative. **`cacheComponents` stays absent from `next.config`.** No product `'use cache'` is authorized.

**Phase 2 (not authorized by this Accept):** Enable the flag only after a named pilot, executable isolation tests, and an application-wide migration review.

---

# 2. Scope

## 2.1 In Scope

- Whether Cache Components may ever be enabled, and under which laws
- Cache-key / tag / invalidation / runtime hard stops for Mode B
- Two-phase gate: Accept framework → Enable flag
- Application-wide migration obligations when the flag flips (app-level config)
- Alignment with ARCH-002 Mode A/B and ARCH-023 tenancy

## 2.2 Out of Scope

- Naming the first pilot island (required before **Phase 2 enable**)
- Pure session-independent chrome under Mode A (no Cache Components required — see D1)
- Accelint / Vercel skill bodies (method only)
- Edge runtime · static export · Neon project-per-tenant (D5) · Collapse recover ([ARCH-028](../ARCH-028-implementation-slices.md))
- Consuming reserved slots `ADR-001`…`ADR-007` ([ARCH-029](../ARCH-029-interface-api-architecture.md))

---

# 3. Decision

## Context

`cacheComponents` replaces `experimental.ppr` and route-segment configs such as `dynamic`, `revalidate`, and `fetchCache` with `'use cache'` / `cacheLife` / Suspense / `connection()` ([Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)). That unlocks partial static shells and cached islands — and is unsafe if output is shared across principals who must not see each other’s data.

Afenda product data is **organization-scoped** and often **role- and user-scoped** ([ARCH-023](../ARCH-023-multi-tenancy.md)). `orgId` alone is necessary but not sufficient for cache isolation.

Mode A already covers Accelint priorities that matter today (Action auth, waterfalls, Suspense, `React.cache()`) without Cache Components. This ADR is the Mode B gate named by ARCH-002.

## Decision (binding)

### D1 — Modes

| Mode | Operational? | Tools |
|------|--------------|-------|
| **A** | **Yes (default)** | Request-time · Suspense / `loading.tsx` · `React.cache()` (primitive keys) · **selective `force-dynamic`** on tenant BFF · **pure session-independent chrome** (sync markup that never reads session — not claimed as build-time static or independently cached when nested in a dynamic tenant route) |
| **B** | No until Phase 2 | `cacheComponents: true` · extractable static shell · `'use cache'` islands · scoped `cacheTag` · Suspense for runtime access · migrate **unsupported** segment configs (`dynamic` / `revalidate` / `fetchCache`) off |

Mode A remains mandatory for `/dashboard/*`, `/account/*`, `/fft/*`, `/client/*` workspace, and tenant handlers until Phase 2 explicitly authorizes a named island.

**Partial static-shell extraction** (chrome prerendered while session UI streams) is a **Mode B** benefit — do not describe Mode A chrome as independently statically prerendered.

### D2 — Two-phase gate

| Phase | Outcome | Does **not** do |
|-------|---------|-----------------|
| **1 — Accept** (this Status) | Mode B laws D1–D7 authoritative; DOC-002 registered | Flip `next.config` · ship product `'use cache'` |
| **2 — Enable** | `cacheComponents: true` on Target `apps/web` (or Living app root when present) | Wide enable without pilot + isolation tests + app migration |

Phase 2 requires: this ADR Accepted · named pilot · Phase 2 checklists (isolation + app migration) complete · product tree exists (no Collapse recover).

### D3 — Three content types (Phase 2 on)

| Type | Mechanism | Afenda rule |
|------|-----------|-------------|
| Static shell | Sync / extractable chrome | No session/runtime APIs in the shell subtree |
| Cached | `'use cache'` + `cacheLife` + `cacheTag` | Only when **identical for every principal in the declared cache scope** (see D4); public (no PII/tenant rows) **or** fully scoped aggregates |
| Dynamic | Runtime APIs + Suspense | Session, org, role, user, FFT entitlements, mutations — never inside `'use cache'` |

### D4 — Cache-scope identity (stronger than orgId)

**Binding rule:** A cached result must be identical for every principal within its declared cache scope. Otherwise, keep it dynamic.

`orgId` prevents cross-organization reuse only. Every **output-affecting** value belongs in the cache key (pass explicitly as arguments / captured serializable values — Next.js includes them in the key; [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)):

| Must consider | Examples |
|---------------|----------|
| Organization | `organizationId` |
| Authorization / visibility class | role, FFT access class, membership visibility |
| Locale / timezone | `locale`, `timeZone` when they change rendered output |
| Feature flags | flags that alter UI or data shape |
| Query shape | filters, pagination, search |
| Publication state | draft vs public |

If role A and role B in the same org must see different HTML/data for the same route inputs, **do not** `'use cache'` that island — keep it dynamic under Suspense.

### D5 — Mode B hard stops (Phase 2)

| Rule | Requirement |
|------|-------------|
| Runtime | **Node only** — Cache Components unsupported on Edge; static export unsupported |
| Config | `cacheComponents: true` only after Phase 2 checklists |
| Segment configs | **Remove** `dynamic`, `revalidate`, `fetchCache` (and legacy `experimental_ppr`) — replaced by `'use cache'` / `cacheLife` / Suspense / `connection()` |
| Tenant BFF | **No** Phase 2 requirement to keep `force-dynamic` — request-time is default; use runtime data, uncached access, or `connection()` where required. **Still:** no tenant `'use cache'` without D4 scope; no untagged shared cache |
| `force-static` | **Prohibited** on session/tenant pages — do not fake via `'use cache'` on session-varying output |
| Tags (tenant) | Centralized builders; include org (+ visibility class when tagged views differ by authz); **forbid** bare global tags on tenant rows |
| Tags (public) | Global marketing tags OK only with **no** PII and **no** tenant rows |
| Tag shape | Normalized, case-sensitive strings; each tag below Next.js’s 256-character limit |
| Lifetime | `cacheLife(…)` or inline `{ stale, revalidate, expire }` on every cached island |
| Runtime APIs | **No** `cookies()` / `headers()` / `searchParams` inside `'use cache'` — extract outside; pass as args |
| `'use cache: private'` | Last resort only |
| `'use cache: remote'` | Separate platform-cache review + D4 scope — not default |
| Mutations | Accelint 2.1: session + org/FFT authz + Zod **inside** Action; invalidate **only after** DB transaction commits |
| Migration | Convert any `unstable_cache` → `'use cache'` in the same change — no dual styles |
| Non-determinism | `Date.now` / `Math.random` inside cache freeze — use `connection()` outside for request-time freshness |

### D6 — Invalidation semantics

| API | Use |
|-----|-----|
| `updateTag(tag)` | **Server Actions only** — read-your-own-writes in the same request ([updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)) |
| `revalidateTag(tag, "max")` | Stale-while-revalidate; **also** for Route Handler / webhook invalidation (Actions may use either form intentionally) |

Additional rules:

- Invalidate **after** the database transaction commits successfully.  
- **Centralize** tag construction (one module / helper — no ad-hoc string concat in views).  
- Pilot **tag graph** required: detail · list · aggregate tags so a mutation cannot refresh one view while leaving another stale.

### D7 — Authority

Accepted Mode B law = this ADR + [ARCH-002](../ARCH-002-frontend-architecture.md). Elite skill `afenda-elite-nextjs-best-practice` is **method only** and cannot authorize Phase 2 alone.

## Alternatives considered

| Option | Verdict |
|--------|---------|
| **A** Mode A forever | Rejected as exclusive policy — Mode B stays available under gates |
| **B** Enable `cacheComponents` now for all routes | **Rejected** — isolation + app-wide migration risk; no product tree |
| **C** Public chrome only; tenant always Mode A | Allowed as a **Phase 2 pilot class**, not auto-enable |
| **D** `'use cache: private'` as tenant default | **Rejected** as default — extract-and-pass + D4 required |
| **E** Keep `force-dynamic` on all BFF under Mode B | **Rejected** — conflicts with Cache Components migration (segment configs replaced) |

## Consequences

| | |
|--|--|
| **+** | Hard stop for agents; Mode A continues; principal-safe key rule; clear Invalidation / tag-graph law |
| **−** | Phase 2 is heavier (app-wide migration + executable isolation tests); Accept ≠ Enable must be respected |
| **=** | `ADR-001`…`007` untouched; `cacheComponents` absent from config until Phase 2 |

## Phase 2 checklist A — Isolation tests (executable)

Replace “privacy / MCP `get_errors`” as the isolation gate. MCP `get_errors` remains useful for framework health only.

1. Seed Org A and Org B with **distinct canary** values.  
2. Hit the **same route and query** inputs for both orgs.  
3. Warm-cache requests in **both request orders** (A→B and B→A).  
4. Assert **neither** response contains the other organization’s canary.  
5. **Same-organization cross-role** test: two principals with different visibility; assert no disclosure across roles when output must differ (or prove D4 keys separate the caches).  
6. Mutate → assert invalidation (detail/list/aggregate per tag graph).  
7. Assert **expired / stale** cache behavior per chosen `cacheLife` / `revalidateTag(..., "max")` profile.

## Phase 2 checklist B — Application-wide migration gate

`cacheComponents` is an **application-level** switch even if only one island uses `'use cache'`. Before enable:

1. Full **route + Route Handler** inventory.  
2. Full **production build** clean.  
3. Migrate unsupported route-segment configuration (`dynamic` / `revalidate` / `fetchCache` / `experimental_ppr`).  
4. **Suspense** coverage for all runtime access (`cookies` / `headers` / `searchParams`).  
5. **Metadata** and dynamic-route review (`generateMetadata` / `generateStaticParams` per Next guidance).  
6. **GET Route Handler** review (no segment `dynamic` crutches; cached helpers vs request-time explicit).  
7. Regression of every **session/tenant route family** (`/dashboard`, `/account`, `/fft`, `/client` workspace, auth/public as applicable).  
8. Pilot named; D4 keys + D6 tag graph documented for that pilot.

## Follow-up

| Action | Status |
|--------|--------|
| Register DOC-002 · Status Accepted | Done with this revision |
| Cite from ARCH-002 Mode B | Same change set |
| Point skill `cache-components.md` at this ADR | Same change set |
| Name pilot → Phase 2 enable | Blocked until product tree + checklists A/B |
| Keep `cacheComponents` out of `next.config.ts` | **Required** until Phase 2 |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-002 | Frontend Architecture | Mode A/B Living policy |
| ARCH-013 | BFF and Data Flow | Tenant BFF / data tree |
| ARCH-016 | Next.js Conventions | Directives / Suspense |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org isolation |
| ARCH-028 | Turborepo Implementation Slices | Anti-contamination |
| ARCH-029 | Interface / API Architecture | Reserves ADR-001…007 |

External: [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components) · [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache) · [updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)

Method: `.cursor/skills/afenda-elite-nextjs-best-practice/reference/cache-components.md`

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0.1 | 2026-07-14 | Home moved to `docs/architecture/adr/` (DOC-001 2.5.0); `decisions/` directory banned. |
| 1.0.0 | 2026-07-14 | **Accepted Phase 1** — framework law only; no enablement. Incorporates 0.3.0 Review corrections. |
| 0.3.0 | 2026-07-14 | Review: drop Mode B `force-dynamic` retention; D4 principal-safe cache scope; executable isolation tests; app-wide migration gate; chrome wording; invalidation + tag graph. |
| 0.2.0 | 2026-07-14 | Elite Next.js review: two-phase Accept≠Enable; three content types; remote/cacheLife/force-static hard stops. |
| 0.1.0 | 2026-07-14 | Initial Draft — Mode B gated; provisional ADR-008. |

---

# 6. Notes

- **Phase 1 Accepted ≠ Phase 2 enable.** No product `'use cache'`; no `cacheComponents` in config.  
- Pure session-independent chrome under Mode A is safe/inexpensive but is **not** Mode B partial static-shell extraction.  
- Home: `docs/architecture/adr/` only — not top-level `docs/adr/` or any `decisions/` folder.
