# ARCH-013 BFF and Data Flow

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-013     |
| **Category**      | Architecture |
| **Version**       | 1.1.3        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Own the Living Next.js **data-pattern decision tree** for BFF reads and mutations: when to use RSC loaders, Server Actions, or Route Handlers; how vertical slices compose; and Accelint-aligned rules for Action trust, waterfalls, serialization, Suspense, and per-request dedupe.

This document is the **data-flow SSOT**. Route inventory lives in [ARCH-012](ARCH-012-app-router-routes.md); Mode A/B rendering policy in [ARCH-002](ARCH-002-frontend-architecture.md) / [ADR-008](adr/ADR-008-cache-components-mode-b.md); ActionResult and HTTP error shapes in the API pack.

---

# 2. Scope

## 2.1 In Scope

- Mandatory data-pattern decision tree (unique SSOT — do not paste a second copy elsewhere)
- Vertical slice layout (page → runner/feature → Action or domain)
- Server Action and Route Handler checklists (authz, Zod, return shapes)
- Waterfall, serialization, Suspense, `React.cache()`, and `after()` rules for BFF loaders
- Mode A HTTP / cache posture for tenant BFF vs health handlers

## 2.2 Out of Scope

- Route catalogue rows ([ARCH-012](ARCH-012-app-router-routes.md))
- Special-file / directive mechanics ([ARCH-016](ARCH-016-next-js-conventions.md))
- Error body / ActionResult type definitions ([API-002](../api/API-002-error-contract.md) · [API-003](../api/API-003-api-types.md))
- Tenancy SQL posture ([ARCH-023](ARCH-023-multi-tenancy.md))
- Vercel Node/region/pooler/Fluid deploy matrix ([ARCH-010](ARCH-010-backend-conventions.md) · [ARCH-008](ARCH-008-next-js-adapter-map.md))
- Cache Components Mode B enablement and tag graphs ([ADR-008](adr/ADR-008-cache-components-mode-b.md) — Phase 2 not authorized)
- Recovering Collapse-era repo-root `app/` / `modules/` / `features/` / `components-V2/` from git (contamination ban — [ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. BFF and Data Flow

**Posture:** Paths and package homes are a **logical Living map**. After Collapse, repo-root product trees are absent by design. Implement under Target `apps/web/**` / `packages/*` only after an **explicit** [ARCH-028](ARCH-028-implementation-slices.md) request — never by restoring banned trees.

**Method (not authority):** `.cursor/skills/afenda-elite-nextjs-best-practice/` — Living ARCH packs override the skill on conflict.

## 3.1 Data-pattern decision tree (mandatory)

**SSOT** for this tree — every other doc links here; do not paste a second copy.

```text
Need data?
├── Server Component read?
│     → modules/*/domain (or page runner / *.server.ts loader) directly
│     → never RSC self-fetch('/api/...') for ordinary first-party reads
├── Client mutation / form / button?
│     → Server Action ('use server')
│     → session + org/FFT/ownership authz + Zod **inside** the Action
├── Client read that cannot be passed from parent?
│     → prefer lift fetch to Server parent; else Route Handler
├── Webhook / third-party HTTP / health / Neon Auth proxy / draft autosave XHR?
│     → Route Handler under app/api/**
└── External / mobile REST consumer?
      → Route Handler implementing docs/api REST contract
```

### Anti-patterns (forbidden)

| Anti-pattern | Why |
|--------------|-----|
| RSC `fetch('/api/...')` for ordinary reads | Extra hop; secrets already on server; duplicates domain |
| Fat `page.tsx` with SQL / domain | Breaks layering; untestable — thin compose only |
| `page.tsx` + `route.ts` in the same folder | Next.js conflict |
| Action auth only in layout / `proxy.ts` | Actions are public endpoints — Accelint 2.1 |
| Validation deep inside domain for already-parsed input | Validate once at adapter edge (`modules/*/schemas`) |
| Mixing Action return shapes (throw vs `{ error }` ad hoc) | Unpredictable clients — [API-002](../api/API-002-error-contract.md) `ActionResult` |
| Sequential `await` of independent work | Waterfall — start early · `Promise.allSettled` (Accelint 1.1–1.2) |
| Inline object keys to `React.cache()` | Breaks dedupe — primitive / stable id args only (2.5) |
| `force-static` / untagged shared cache on tenant BFF | Isolation failure — Mode A request-time; Mode B only per ADR-008 |
| Swallowing `redirect` / `notFound` in Action try/catch | Breaks App Router control flow |

## 3.2 Vertical slice (one feature)

```text
app/**/page.tsx                    → await params/searchParams; start independent promises; compose
features/*/… or portal-views       → UI (RSC + small client islands); minimal serializable props
features/*/… runners or *.server.ts → session-aware load model; React.cache where reused
app/actions/*.ts                   → 'use server'; Zod; require*Session + org/FFT; domain; revalidate
modules/*/schemas/*.ts             → boundary schemas (owning context)
modules/*/domain/*.ts              → parameterized queries only (org-scoped where required)
```

UI homes: auth/landing → `features/`; operator AdminCN screens → `components-V2/.../portal-views/` — [ARCH-017](ARCH-017-frontend-folder-map.md). Do **not** recreate root `components/` as a dump.

### Reads

```tsx
// app/**/page.tsx (Server Component) — preferred
export default async function Page({
  params,
}: {
  params: Promise<{ declarationId: string }>;
}) {
  const { declarationId } = await params;
  // Kick independent work immediately inside the runner / loader.
  const model = await loadDeclarationPage(declarationId); // → modules/declarations/domain
  return <DeclarationView model={model} />;
}
```

Always `await` `params` / `searchParams` / `cookies()` / `headers()` (Next 16). Pass **only fields the client uses** into `'use client'` leaves (Accelint 2.3); prefer ISO strings over `Date`.

### Mutations (Server Actions)

Every Action is a **public endpoint**. Layout and `apps/web/proxy.ts` gate document navigations only — they do **not** satisfy Accelint 2.1.

```tsx
// app/actions/declarations.ts
"use server";

export async function updateDeclarationAction(input: unknown) {
  const parsed = parseSchema(updateSurveySchema, input);
  if (!parsed.success) {
    return { ok: false as const, code: "VALIDATION_ERROR", message: parsed.error };
  }
  // Session + org / ownership — never rely on proxy/layout alone
  await requirePlatformOperatorSession();
  await domainUpdate(/* org-scoped args from session + parsed.data */);
  revalidatePath("/dashboard");
  // after(() => audit(...)) when audit must not block the response
  return { ok: true as const };
}
```

**New Action checklist**

| Step | Requirement |
|------|-------------|
| 1 | `'use server'` |
| 2 | Zod / Living contract parse on all inputs |
| 3 | Neon session (`require*Session`) **inside** the Action |
| 4 | Org / FFT / resource ownership authz before mutation |
| 5 | Domain call in `modules/*` (parameterized, org-scoped) |
| 6 | Typed `ActionResult` — no secrets ([API-002](../api/API-002-error-contract.md) · [API-001](../api/API-001-api-boundaries.md)) |
| 7 | `revalidatePath` / `revalidateTag` after successful UI-backed writes (Mode A); Mode B invalidation per ADR-008 (`updateTag` / `revalidateTag(tag, "max")`) only when Phase 2 authorized |
| 8 | `after()` for audit/log when it must not block the response |
| 9 | Do not catch-and-swallow `redirect` / `notFound` |

### Route Handlers (HTTP only)

Use when the browser, probe, or external client must speak HTTP:

| Kind | Examples | Mode A cache posture |
|------|----------|----------------------|
| Diagnostics | `/api/health/liveness`, `/api/health/readiness` | `auto` + short revalidate |
| Auth proxy | `/api/auth/[...path]` | Session / dynamic as required |
| Frequent XHR | `/api/client/declaration-draft` | Tenant BFF — selective `force-dynamic` / `no-store`; never `force-static` |
| External REST | Future mobile / partners | `docs/api` REST contract + same Zod → domain path |

**New Route Handler checklist**

| Step | Requirement |
|------|-------------|
| 1 | Named exports only (`GET` / `POST` / …) |
| 2 | Auth when not public health |
| 3 | Start independent work immediately; `Promise.allSettled` when fully independent |
| 4 | Zod → module domain — same adapter edge as Actions |
| 5 | `after()` for non-blocking logs |
| 6 | Never colocated with `page.tsx` |
| 7 | Node runtime default |

Shared edge: Zod → `modules/*/domain` — same as Actions. Prefer Server Actions for first-party browser mutations.

## 3.3 Performance priorities (BFF order)

Apply in this order when shaping loaders and Actions ([ARCH-002](ARCH-002-frontend-architecture.md) · Accelint):

1. **Security** — in-Action session + org/FFT + Zod  
2. **Waterfalls** — start independent promises before the first await; `Promise.allSettled` when fully independent; overlap auth∥config then data when dependent  
3. **Serialization** — minimal RSC→client props; avoid duplicate transforms that break reference dedupe  
4. **Suspense** — `loading.tsx` / stream secondary panels; do not block the whole shell on one slow query; optional promise + `use()` inside Suspense children  
5. **`React.cache()`** — per-request dedupe for session/org lookups reused by layout+page; **primitive** cache keys only  
6. **`after()`** — audit/log after the response (never hide auth failures behind deferred work)  
7. **Imports** — deep imports / `next/dynamic` for heavy AdminCN or chart clients; no mega barrels  

**Platform deploy optimum** (Node, Neon region affinity, `-pooler`, Fluid pool attach, Mode A RH posture): [ARCH-010](ARCH-010-backend-conventions.md) · adapter map [ARCH-008](ARCH-008-next-js-adapter-map.md). This document retains Accelint BFF order only.

```tsx
import { Suspense, cache } from "react";

const getMember = cache(async (userId: string) => {
  /* session + org-scoped load — primitive key */
  return loadMember(userId);
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

`'use cache'` / `cacheComponents` remain **off** until ADR-008 Phase 2. Mode A may use Suspense + `React.cache()` today without Cache Components.

## 3.4 Rendering vs this pack

| Concern | Authority |
|---------|-----------|
| Which adapter (RSC / Action / RH) | **This document** |
| Mode A request-time vs Mode B Cache Components | [ARCH-002](ARCH-002-frontend-architecture.md) · [ADR-008](adr/ADR-008-cache-components-mode-b.md) |
| Which routes exist / proxy matcher | [ARCH-012](ARCH-012-app-router-routes.md) |
| Org isolation for any future shared cache tags | [ARCH-023](ARCH-023-multi-tenancy.md) |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-002 | Frontend Architecture | Layer rules · Mode A/B · priority order |
| ARCH-004 | Backend Layers | Domain / adapter edge alignment |
| ARCH-008 | Next.js Adapter Map | Adapter ↔ hexagon · Vercel runtime posture |
| ARCH-010 | Backend Conventions | Vercel deploy optimum · Node/SQL pointers |
| ARCH-012 | App Router Routes | Route inventory · proxy families |
| ARCH-016 | Next.js Conventions | Special files · async APIs · proxy |
| ARCH-017 | Frontend Folder Map | Feature / portal-views homes |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org / FFT gates for authz |
| ARCH-028 | Implementation Slices | Anti-contamination · Target greenfield |
| ADR-008 | Cache Components Mode B (Gated) | Mode B invalidation / enable gate |
| API-001 | API Boundaries | Action vs HTTP adapter boundaries |
| API-002 | Error Contract | `ActionResult` / safe failure codes |
| API-003 | API Types | Shared typed result shapes |
| REST-001 | REST Resources | External RH contract catalogue |

Agent method (not a controlled ID): `.cursor/skills/afenda-elite-nextjs-best-practice/` (Accelint digest: `reference/accelint-perf.md`) via `/using-afenda-elite-skills`.

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.1.3 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.2 | 2026-07-14 | ADR link home → `docs/architecture/adr/` (DOC-001 2.5.0). |
| 1.1.1 | 2026-07-14 | Pointer to ARCH-008/010 Vercel deploy optimum; out-of-scope + References sync (Accelint BFF body unchanged). |
| 1.1.0 | 2026-07-14 | Elite Next.js / Accelint sync: Action + RH checklists; waterfall `allSettled` / `React.cache` / `after` / serialization; Mode A RH posture; Mode B pointer; cleaned References. |
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

### Authority vs skill

- This Living ARCH is the **BFF data-pattern** SSOT.
- Mode B enablement and tag law: [ADR-008](adr/ADR-008-cache-components-mode-b.md) (Accepted Phase 1; Phase 2 not authorized).
- The Elite Next.js skill is method only — it cannot flip `cacheComponents`, weaken in-Action authz, or invent `/api` self-fetch patterns that contradict this tree.
