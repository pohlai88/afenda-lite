# ARCH-008 Next.js Adapter Map

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-008     |
| **Category**      | Architecture |
| **Version**       | 1.3.0        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Backend      |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Map Hexagonal **roles → Next.js App Router primitives** on the sole Vercel deployable (`apps/web`).

**Audience:** engineers wiring Actions / RH / RSC runners.  
**Action enabled:** choose the correct primitive; keep authz + Zod **inside** the adapter.  
**When NOT to edit:** do not paste the [ARCH-013](ARCH-013-bff-and-data-flow.md) tree or the [ARCH-010](ARCH-010-backend-conventions.md) deploy matrix into this file.

---

# 2. Scope

## 2.1 In Scope

- Role ↔ primitive map
- Logical adapter inventory (shape when Target tree exists)
- Anti-patterns and conventions checklist

## 2.2 Out of Scope

- Domain port interfaces ([ARCH-007](ARCH-007-ports-and-adapters.md))
- Folder / modules L2 inventory ([ARCH-005](ARCH-005-backend-folder-map.md))
- Layer do/don't body ([ARCH-004](ARCH-004-backend-layers.md))
- Env schema ([ARCH-027](ARCH-027-env-model.md))
- BFF / data-pattern tree body ([ARCH-013](ARCH-013-bff-and-data-flow.md))
- Vercel deploy matrix (Node, region, pooler, Fluid, Mode A/B) — **sole SSOT** [ARCH-010](ARCH-010-backend-conventions.md)
- Recovering Collapse-era product trees ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Next.js Adapter Map

Maps Hexagonal roles to **App Router primitives only**. No second BFF framework.

**Posture:** Paths are a **logical Living map**. Physical home after implement = `apps/web/app/**` + module packages ([ARCH-005](ARCH-005-backend-folder-map.md) · [ARCH-022](ARCH-022-system-overview.md)).

## Role ↔ primitive

| Hexagonal role | Next.js primitive | Optimize |
|----------------|-------------------|----------|
| Driving adapter (query) | RSC `page.tsx` → `features/*` runners | Call `modules/*/domain` in-process; no self `/api` hop |
| Driving adapter (command) | Server Action (`'use server'` in `app/actions`) | Zod + session + **org/FFT/ownership authz inside** Action + typed ActionResult + `revalidatePath` / `revalidateTag`; `after()` for audit |
| Driving adapter (HTTP) | `app/api/**/route.ts` | Health, Neon Auth proxy, draft XHR, webhooks, external REST only |
| Inbound DTO validation | `modules/*/schemas` | Validate once at adapter edge |
| Application port | Named exports in `modules/*/domain` | Shared by Action and/or Route Handler |
| Driven adapter (DB) | SQL inside module domain | Node runtime; pooler ([ARCH-010](ARCH-010-backend-conventions.md)) |
| Driven adapter (Auth) | `modules/identity/auth` + `/api/auth/[...path]` | Do not reimplement auth |
| App edge session gate | `apps/web/proxy.ts` (Next 16) | Not `middleware.ts`; bypass `next-action`; **not** a substitute for in-Action authz |

## Data-pattern tree (mandatory)

**Link only — do not paste.** [ARCH-013](ARCH-013-bff-and-data-flow.md).

## Deploy / runtime optimum (mandatory)

**Link only — do not paste the matrix.** Sole SSOT: [ARCH-010](ARCH-010-backend-conventions.md) (Node, `sin1`↔Neon, pooler, Fluid, Mode A/B, env hard stops). Project: Vercel **`afenda-lite`**.

## Logical adapter inventory

When a Target product tree exists, expect adapters shaped like:

| Kind | Logical paths |
|------|----------------|
| Server Actions | `app/actions/account.ts`, `admin.ts`, `client.ts`, `declarations.ts`, `fft.ts`, `surveys.ts` |
| Route Handlers | `app/api/health/liveness`, `app/api/health/readiness`, `app/api/auth/[...path]`, `app/api/client/declaration-draft` |

This inventory is **shape**, not a claim that Collapse-era files are present on this docs-first checkout.

## Anti-patterns (forbidden)

| Anti-pattern | Why |
|--------------|-----|
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; secrets already on server |
| `page.tsx` + `route.ts` in same segment | Next.js conflict — APIs under `app/api/**` only |
| Fat `page.tsx` with SQL | Breaks hexagon; untestable |
| GraphQL/tRPC beside REST | Second contract version |
| Edge as default for domain routes | Neon/session assume Node |
| Passing non-serializable props Server → Client | RSC boundary violation (Actions for mutations) |
| New domain under `lib/` | Use `modules/<context>/` ([ARCH-005](ARCH-005-backend-folder-map.md)) |
| Authz only in `proxy.ts` / layout | Actions are public endpoints — [ARCH-013](ARCH-013-bff-and-data-flow.md) |

## Conventions checklist

- Await `params` / `searchParams` / `cookies()` / `headers()` (Next 16)  
- Session + org/FFT/ownership + Zod **inside** every Action / protected RH  
- Typed ActionResult / HTTP error — [API-002](../api/API-002-error-contract.md)  
- `loading.tsx` / `error.tsx` on authenticated product segments  
- Never colocate page and route handlers  
- Node default; region + pooler per [ARCH-010](ARCH-010-backend-conventions.md)  
- Special files / directives — [ARCH-016](ARCH-016-next-js-conventions.md)  

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Layers | [ARCH-004](ARCH-004-backend-layers.md) |
| Folder homes | [ARCH-005](ARCH-005-backend-folder-map.md) |
| Data-pattern tree | [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| Deploy optimum detail | [ARCH-010](ARCH-010-backend-conventions.md) |
| Cache Mode B law | [ADR-008](adr/ADR-008-cache-components-mode-b.md) |
| Errors / ActionResult | [API-002](../api/API-002-error-contract.md) |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-004 | Backend Layers | Hexagon layer rules |
| ARCH-005 | Backend Folder Map | Adapter / module homes |
| ARCH-007 | Ports and Adapters | Port catalog |
| ARCH-010 | Backend Conventions | Node + Vercel deploy optimum |
| ARCH-013 | BFF and Data Flow | Data-pattern SSOT |
| ARCH-016 | Next.js Conventions | Special files · async APIs |
| ADR-008 | Cache Components Mode B (Gated) | Mode B enable gate |
| API-002 | Error Contract | ActionResult / HTTP errors |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.3.0 | 2026-07-14 | Consolidate: remove deploy optimum table (ARCH-010 SSOT); utilization trio; pointer-only ARCH-013/010. |
| 1.2.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.0 | 2026-07-14 | Pack sync with ARCH-004/005: in-Action org/FFT authz + `after()`; logical inventory (not Collapse disk claim); Alignment; proxy≠authz; cleaned References. |
| 1.1.1 | 2026-07-14 | ADR link home → `docs/architecture/adr/` (DOC-001 2.5.0). |
| 1.1.0 | 2026-07-14 | Added Vercel adapter optimum (Node, region/Neon affinity, narrow RH, pooler, Mode A/B gates); fixed ARCH-013/016 link targets. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover; Target greenfield via ARCH-028 only. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log; Control State Closed after architecture sync campaign. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` (and wiped Collapse-era ops scripts) are **not present** in this checkout after design-SSOT Collapse (`4680c91`).
- **Forbidden:** recovering those trees from git history (`f014807` / Collapse parents) — contamination of the docs-first checkout. See [ARCH-028](ARCH-028-implementation-slices.md) Anti-contamination lock.
- Paths in this document are a **logical Living map** (shape). When product code is implemented, place it under **Target** roots per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-028](ARCH-028-implementation-slices.md) (`apps/web/**`, `packages/*`) after an **explicit** implement request — never as a restore of banned repo-root trees.
- Phrases such as “on disk”, “live adapters”, or “relocate complete” describe the intended shape when a Target product tree exists; they are **not** a claim that Collapse-era files may be recovered.
