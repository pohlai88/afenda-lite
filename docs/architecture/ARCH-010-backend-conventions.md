# ARCH-010 Backend Conventions

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-010     |
| **Category**      | Architecture |
| **Version**       | 1.3.0        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Backend      |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Own Living backend **runtime and Vercel deploy optimum** conventions. This document is the **sole deploy-matrix SSOT** — siblings (ARCH-008, ARCH-013) must link, not paste.

**Audience:** engineers deploying or wiring Node adapters on Vercel.  
**Action enabled:** apply Node / region / pooler / Fluid / Mode A–B hard stops before shipping adapters.  
**When NOT to edit:** do not paste the [ARCH-013](ARCH-013-bff-and-data-flow.md) tree or [ARCH-008](ARCH-008-next-js-adapter-map.md) role map here; do not reopen ARCH-023 R*/D*.

---

# 2. Scope

## 2.1 In Scope

- Runtime defaults (Node; `proxy.ts`)
- Vercel deploy optimum for Target `apps/web` — **sole SSOT matrix**
- SQL / domain placement rules
- Validation and naming summaries
- Trade path naming (`modules/fft/`)

## 2.2 Out of Scope

- Full API tables ([docs/api](../api/))
- Data-pattern tree body ([ARCH-013](ARCH-013-bff-and-data-flow.md))
- Adapter role ↔ primitive map body ([ARCH-008](ARCH-008-next-js-adapter-map.md))
- Folder L2 inventory ([ARCH-005](ARCH-005-backend-folder-map.md))
- Layer do/don't ([ARCH-004](ARCH-004-backend-layers.md))
- UI shell rules ([ARCH-017](ARCH-017-frontend-folder-map.md))
- Env schema ownership ([ARCH-027](ARCH-027-env-model.md))
- Recovering Collapse-era product trees ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Backend Conventions

**Posture:** Logical Living map. Physical Target = `apps/web` + packages after explicit [ARCH-028](ARCH-028-implementation-slices.md) implement. Contracts: [`docs/api/`](../api/). Data tree: [ARCH-013](ARCH-013-bff-and-data-flow.md) (link only). Adapter roles: [ARCH-008](ARCH-008-next-js-adapter-map.md) (link only).

## Runtime

- **Node.js** default for product pages, Server Actions, and domain Route Handlers.  
- Edge only as a documented exception — **not** for Neon/session domain work.  
- `apps/web/proxy.ts` (Next 16) for document **navigation** session gates — never new `middleware.ts`.  
- `proxy.ts` / layout gates do **not** replace in-Action or in-RH session + org/FFT authz ([ARCH-008](ARCH-008-next-js-adapter-map.md) · [ARCH-013](ARCH-013-bff-and-data-flow.md)).

## Vercel deploy optimum (Target) — SSOT

Sole deployable: `apps/web` on Vercel project **`afenda-lite`** (`APP_URL=https://afenda-lite.vercel.app`). Which adapter to use: [ARCH-008](ARCH-008-next-js-adapter-map.md) + [ARCH-013](ARCH-013-bff-and-data-flow.md).

| Concern | Optimum condition | Why |
|---------|-------------------|-----|
| Runtime | Node.js for all Neon/session adapters | Neon drivers + session cookies assume Node APIs |
| Function region | Prefer **`sin1`** (align with Neon `aws-ap-southeast-1`) | Cuts DB RTT vs a user-nearest region far from the pooler |
| `DATABASE_URL` | Production **`-pooler`** host ([ARCH-023](ARCH-023-multi-tenancy.md)) | Avoids connection exhaustion under serverless concurrency |
| Fluid Compute | Prefer Fluid for Node functions that hold a DB pool; after creating a `pg` (or compatible) Pool, call `attachDatabasePool(pool)` from `@vercel/functions` | Releases idle clients before suspend |
| Read path | RSC → domain in-process (no self `/api` hop) | One less function invocation and serialization boundary |
| Mutate path | Server Actions with in-action authz + Zod; `after()` for audit | Correct trust model; audit does not block TTFB |
| Health RH | `dynamic = 'auto'` + short `revalidate` (Mode A) | Cheap probes without caching tenant data |
| Tenant BFF RH | Selective `force-dynamic` / `no-store` (Mode A) | Never `force-static` or untagged shared cache on org/session rows |
| Mode B Cache Components | **Off** until [ADR-008](adr/ADR-008-cache-components-mode-b.md) Phase 2 | Principal-safe tags required before cross-request cache |
| Bundle size | Deep imports; no UI mega-barrels inside Actions/RH | Smaller functions → faster cold start |
| Env sync | Local → Vercel for canonical keys; never `NEXT_PUBLIC_` for secrets; never sync `PLAYGROUND_*` ([ARCH-027](ARCH-027-env-model.md)) | Prevents browser secret leak and prod playground exposure |
| Preview DB | Prefer a **preview Neon branch** when Target ops allow | Avoids preview deployments mutating production data |

**Hard stops (Vercel):** `vercel env pull` on this docs-first checkout before S4.1 ([ARCH-027](ARCH-027-env-model.md)); Edge as default for domain Routes/Actions; `force-static` on tenant BFF; product `'use cache'` without ADR-008 Phase 2; Action authz only in `proxy`/layout.

## SQL and domain

- Parameterized queries only inside `modules/*/domain` (or driven helpers owned by that context).  
- No raw SQL in `app/actions`, `app/api` route files, or `page.tsx`.  
- Ports never import `Request`, `next/headers`, or UI.  
- Prefer short transactions; release clients promptly (pooler + Fluid pool attach above).  
- Logical homes: [ARCH-005](ARCH-005-backend-folder-map.md).

## Validation

- Zod at the adapter edge in the **owning** `modules/*/schemas` module.  
- Env via Target `@afenda/env` / logical `modules/platform/env` shape ([ARCH-027](ARCH-027-env-model.md)).  
- Domain trusts typed values after `parseSchema` / `safeParse`.  
- Typed ActionResult / HTTP error shapes — [API-002](../api/API-002-error-contract.md).

## One-version contract (summary)

Full rules: [API-001](../api/API-001-api-boundaries.md), [API-002](../api/API-002-error-contract.md), [API-003](../api/API-003-api-types.md).

- One public contract — no `/api/v2`, no GraphQL/tRPC twin.  
- Server Action and Route Handler for the same use-case share Zod schema, output type, and error `code`s.  
- Prefer additive optional fields; breaking changes need a new ADR under [`docs/architecture/adr/`](adr/).  
- Errors: HTTP `{ error: { code, message, details? } }` · Actions `ActionResult<T>` — same `code` vocabulary.  
- Types from `z.infer` — no parallel hand-written DTO trees.  
- Brands: `DeclarationId`, `ClientId`, `TradeEventId`, … — see [API-003](../api/API-003-api-types.md).

## Trade naming

- Product: **Feed Farm Trade**  
- Code path: **`modules/fft/`** (never `modules/trade/`)  
- Action file: `app/actions/fft.ts`

## Greenfield vs runners

- New domain/schema → `modules/<context>/` (Target packages per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-024](ARCH-024-package-boundaries.md))  
- Do **not** recreate or grow `lib/` for domain or greenfield UI — use `modules/*` and `features/*` ([ARCH-005](ARCH-005-backend-folder-map.md) · [ARCH-017](ARCH-017-frontend-folder-map.md))  
- Residue inventory: skill [`residue-inventory.md`](../../.cursor/skills/afenda-elite-backend-modules/residue-inventory.md) (`lib/` = **gone**)

## Alignment (must not diverge)

| Topic | Authority |
|-------|-----------|
| Adapter primitives / anti-patterns | [ARCH-008](ARCH-008-next-js-adapter-map.md) |
| Layers | [ARCH-004](ARCH-004-backend-layers.md) |
| Folder map | [ARCH-005](ARCH-005-backend-folder-map.md) |
| Data-pattern tree | [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| Tenancy / pooler | [ARCH-023](ARCH-023-multi-tenancy.md) |
| Env | [ARCH-027](ARCH-027-env-model.md) |
| Mode B cache law | [ADR-008](adr/ADR-008-cache-components-mode-b.md) |
| REST resources | [REST-001](../api/REST-001-rest-resources.md) |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-004 | Backend Layers | Layer rules |
| ARCH-005 | Backend Folder Map | Module / adapter homes |
| ARCH-008 | Next.js Adapter Map | Primitive ↔ hexagon |
| ARCH-013 | BFF and Data Flow | Data-pattern SSOT |
| ARCH-022 | System Overview | Target tree |
| ARCH-023 | Multi-Tenancy | Pooler · org isolation |
| ARCH-027 | Environment Variable Model | `@afenda/env` |
| ADR-008 | Cache Components Mode B (Gated) | Mode B enable gate |
| API-001 | API Boundaries | Action vs HTTP |
| API-002 | Error Contract | ActionResult / HTTP |
| API-003 | API Types | Brands · z.infer |
| REST-001 | REST Resources | External RH catalogue |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.3.0 | 2026-07-14 | Utilization trio; declare sole deploy-matrix SSOT; hard-stop wording aligned to ARCH-027 docs-first STOP. |
| 1.2.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.0 | 2026-07-14 | Pack sync: deploy matrix as SSOT; proxy≠authz hard stop; `lib/` gone; ADR home under `architecture/adr/`; Alignment + cleaned References. |
| 1.1.1 | 2026-07-14 | ADR link home → `docs/architecture/adr/` (DOC-001 2.5.0). |
| 1.1.0 | 2026-07-14 | Vercel deploy optimum matrix (Node, sin1↔Neon, pooler, Fluid `attachDatabasePool`, Mode A/B, env hard stops); env pointer to ARCH-027; link cleanup. |
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
