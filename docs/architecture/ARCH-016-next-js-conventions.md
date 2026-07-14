# ARCH-016 Next.js Conventions

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-016     |
| **Category**      | Architecture |
| **Version**       | 1.2.2        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Record Living Next.js App Router **file and runtime conventions** for Afenda-Lite product UI: special files, RSC boundaries, async request APIs, directives, Route Handlers, errors, Suspense, proxy, media/metadata, bundling, Mode A segment defaults, and post-edit MCP verification.

**Authority split**

| Concern | Authority |
|---------|-----------|
| Layer diagram · Mode A/B policy · Accelint priority order | [ARCH-002](ARCH-002-frontend-architecture.md) |
| Route catalogue · proxy matcher | [ARCH-012](ARCH-012-app-router-routes.md) |
| BFF decision tree · Action/RH checklists · waterfalls | [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| Cache Components Phase 1≠2 · enable gate | [ADR-008](adr/ADR-008-cache-components-mode-b.md) |
| **Mechanics in this doc** | Special files · async APIs · RSC boundaries · RH segment defaults · errors · Suspense wiring · proxy · builtins · MCP |

**Method (not SSOT):** `.cursor/skills/afenda-elite-nextjs-best-practice/` — Living ARCH packs override the skill on conflict.

---

# 2. Scope

## 2.1 In Scope

- App Router special files, route groups, dynamic segments, coexistence rules
- Async `params` / `searchParams` / `cookies` / `headers`
- RSC ↔ client boundaries and directives (Mode A; `'use cache'` pointer only)
- Short data-pattern table (full tree in ARCH-013)
- Proxy, errors, Suspense, image/font/script, metadata, Node runtime
- Mode A Route Handler segment defaults (`force-dynamic` / health revalidate)
- Import / `next/dynamic` conventions that affect App Router composition
- MCP verify sequence after App Router edits

## 2.2 Out of Scope

- Route inventory rows ([ARCH-012](ARCH-012-app-router-routes.md))
- Layer diagram / KISS homes ([ARCH-002](ARCH-002-frontend-architecture.md))
- Full Action/RH authz checklists and waterfall examples ([ARCH-013](ARCH-013-bff-and-data-flow.md))
- Mode B enablement, isolation tests, tag graphs ([ADR-008](adr/ADR-008-cache-components-mode-b.md))
- Env compose ([ARCH-027](ARCH-027-env-model.md))
- AdminCN / Studio keep-drop ([ARCH-015](ARCH-015-admincn-alignment.md))
- Parallel / intercepting routes (`@slot`, `(.)`) — only if ARCH-012 later approves
- Recovering Collapse-era repo-root `app/` / `modules/` / `features/` / `components-V2/` ([ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. Next.js Conventions

**Audience:** engineers implementing App Router under Target `apps/web/**` or the Living logical `app/` map.  
**Runtime:** Node.js default (Neon). Edge only with a written exception.  
**Auth:** Neon Auth — not Clerk/Auth0 samples from generic Next guides.  
**Posture:** Paths are a logical Living map; implement under Target after explicit ARCH-028 — never Collapse recover.

## 3.1 Afenda overrides (generic Next / Vercel nudges)

| Generic nudge | Afenda |
|---------------|--------|
| Managed Clerk / Auth0 | **Neon Auth** |
| Edge by default | **Node** |
| Broad static / casual Cache Components | Mode A request-time; Mode B **Phase 2 only** — ADR-008 |
| `middleware.ts` | **`apps/web/proxy.ts` only** |
| Pages Router | Forbidden |
| Parallel / intercepting modals | Only with ARCH-012 approval |
| Cross-request LRU for tenant data | Avoid on serverless |
| Self-host Docker matrix | Vercel primary |

## 3.2 Special files

| File | When |
|------|------|
| `layout.tsx` | Shared chrome for a segment (root required) |
| `page.tsx` | Route UI — **thin** compose only (no SQL, no fat trees) |
| `loading.tsx` | Instant loading UI (Suspense) — required on authenticated product segments |
| `error.tsx` | Segment error boundary — **`'use client'`**; plain UI / shadcn **ui** only; **no** Studio/AdminCN shell barrels |
| `not-found.tsx` | 404 |
| `global-error.tsx` | Root fatal errors — must render `<html>` + `<body>`; `'use client'` |
| `route.ts` | HTTP only under `app/api/**` — **never** beside `page.tsx` |
| `template.tsx` / `default.tsx` | Optional; use with ARCH/route approval |

Also:

- Route groups `(name)` — no URL segment  
- Dynamic `[param]` — **descriptive** names (`[declarationId]`, `[assignmentId]`); avoid overloaded `[id]`  
- Catch-all `[...slug]` / optional `[[...slug]]` only when [ARCH-012](ARCH-012-app-router-routes.md) allows  

## 3.3 Async request APIs (mandatory)

```tsx
type Props = {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { assignmentId } = await params;
  const { q } = await searchParams;
  // …
}

export async function generateMetadata({ params }: Props) {
  const { assignmentId } = await params;
  return { title: assignmentId };
}
```

```ts
import { cookies, headers } from "next/headers";

const cookieStore = await cookies();
const headerList = await headers();
```

Route Handlers await `params` the same way:

```ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return Response.json({ id });
}
```

Do not treat `cookies` / `headers` / `params` as sync.

## 3.4 RSC boundaries

| Bad | Good |
|-----|------|
| `'use client'` + `async function` | Async RSC parent; sync client child |
| Pass functions, `Date`, `Map`, class instances to client | POJOs / ISO strings; Server Actions for mutations |
| Client fetches DB with secrets | RSC/loader or Action with session |
| Pass unused fields to client | Pass only fields the client uses (Accelint 2.3) |
| Client wrapper owns all data fetch | Pass Server Components as **children** into client shells |

Server Actions **may** be passed to client as props (serializable action reference).

## 3.5 Directives

| Directive | Mode | Use |
|-----------|------|-----|
| `'use client'` | A/B | Hooks, events, browser APIs, Radix, local form state |
| `'use server'` | A/B | Server Action module / function — session + org/FFT authz + Zod **inside** the Action (`proxy`/layout alone is not enough) — full checklist [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| `'use cache'` | **B Phase 2 only** | [ADR-008](adr/ADR-008-cache-components-mode-b.md) Phase 1 Accepted does **not** authorize product use |
| `'use cache: remote'` / `'use cache: private'` | B Phase 2 | Per ADR-008; prefer passing ids over cookies-in-cache |

## 3.6 Data patterns (summary)

Full decision tree SSOT: [ARCH-013](ARCH-013-bff-and-data-flow.md). Do not paste a second full tree here.

| Case | Choose |
|------|--------|
| Read in page/layout | RSC + loader / `modules/*` (preferred — no self-`fetch('/api')`) |
| Form / mutation | Server Action + in-action re-auth + Zod |
| Webhook / external / health / draft autosave | `app/api/**/route.ts` |
| Client needing later updates | Initial props from RSC; Action or RH for updates |

## 3.7 Route Handlers (Mode A)

| Kind | Segment default | Notes |
|------|-----------------|-------|
| Session / org / mutation BFF | Selective `export const dynamic = 'force-dynamic'` | Contract `no-store` where applicable |
| Health / liveness | `dynamic = 'auto'` + short `revalidate` | Diagnostics only |
| Tenant `force-static` | **Prohibited** | Hard stop |

- Named HTTP method exports only · Web `Request`/`Response` · Node default  
- Prefer Actions for first-party browser mutations  
- Start independent work early · `Promise.allSettled` when fully independent ([ARCH-013](ARCH-013-bff-and-data-flow.md))  
- **Mode B:** when/if ADR-008 Phase 2 enables `cacheComponents`, **remove** unsupported segment configs (`dynamic` / `revalidate` / `fetchCache`) and use runtime data / Suspense / `connection()` — not authorized now  

## 3.8 Pages and layouts (Mode A)

| Scenario | Guidance |
|----------|----------|
| `/dashboard/*`, `/account/*`, `/fft/*`, `/client/*` workspace | Request-time via `await cookies()` / `await headers()` — **never** `force-static` |
| Auth island / public links | Dynamic or static per surface; CSS island split (AdminCN skill) |
| Secondary panels | Suspense stream **now** — no Cache Components required |
| Pure session-independent chrome | Sync markup OK under Mode A — not Mode B partial-shell extraction |

## 3.9 Proxy (Next.js 16)

- File: `apps/web/proxy.ts` — **not** `middleware.ts`  
- Session/tenant **redirect only** — no business SQL or domain logic  
- Matched / public / bypass paths: [ARCH-012](ARCH-012-app-router-routes.md) § proxy matcher  
- Bypass patterns include: `next-action` header, `?embed=1`, client login, preview-unavailable  
- Server Actions still `require*Session` (and org/FFT + Zod) **inside** the Action  

## 3.10 Errors and navigation

| API | Use |
|-----|-----|
| `notFound()` | Missing resource |
| `redirect` / `permanentRedirect` | Auth / ACL redirects |
| `forbidden()` / `unauthorized()` | Prefer when available for ACL control flow |
| `error.tsx` / `global-error.tsx` | Unexpected render failures |
| `unstable_rethrow` / rethrow | Re-throw Next control-flow errors inside `catch` |

Do **not** swallow `redirect` / `notFound` in broad `catch`. Call them outside try/catch when practical.

## 3.11 Suspense, `React.cache`, and `after` (Mode A)

- `loading.tsx` wraps the segment in Suspense automatically  
- Client components using `useSearchParams` (and dynamic pathname clients) need a Suspense boundary  
- Stream secondary AdminCN / FFT panels without waiting on Cache Components  
- Per-request dedupe: `React.cache(fn)` with **primitive** keys — not a substitute for `'use cache'`  
- Non-blocking after-response work: `after()` for audit/log (never hide auth failures)  
- Waterfall / serialization detail: [ARCH-013](ARCH-013-bff-and-data-flow.md) § performance priorities  

## 3.12 Image, font, script, metadata

| Concern | Rule |
|---------|------|
| Images | `next/image` for product assets; configure `remotePatterns` when needed |
| LCP hero | `priority` on above-the-fold art |
| Fonts | `next/font` in root layout → Tailwind theme — no ad-hoc `<link>` font tags |
| Scripts | `next/script` for third-party; give inline scripts an `id` |
| Metadata | Static `metadata` or `generateMetadata`; prefer portal copy helpers; await `params` in generators |
| Mode B metadata | Runtime `generateMetadata` must follow ADR-008 Suspense / `connection()` rules when Phase 2 is on — **not now** |

## 3.13 Bundling and imports

| Concern | Rule |
|---------|------|
| Mega barrels | Avoid pulling entire icon/UI kits (`lucide-react` / large AdminCN barrels) — deep imports |
| Heavy widgets | `next/dynamic` for charts / Studio-adapted client leaves |
| UI homes | `features/*` · `components-V2/.../portal-views` — do not recreate root `components/` dump ([ARCH-017](ARCH-017-frontend-folder-map.md)) |
| Server-safe packages | Prefer packages safe on the server composition path; analyze when payload grows |

## 3.14 Runtime and hydration

- Default **Node.js** for pages, actions, Route Handlers (Neon)  
- Edge only with written exception (no DB driver on Edge without a plan)  
- No browser-only APIs in RSC; fix invalid HTML that causes hydration mismatch  
- Cache Components + Edge: unsupported together (ADR-008)  

## 3.15 Hard stops (conventions)

| Stop | Fix |
|------|-----|
| New `middleware.ts` | Use `apps/web/proxy.ts` |
| `page.tsx` + `route.ts` same folder | Split paths |
| Async `'use client'` | Fetch in RSC parent |
| Non-serializable RSC→client props | POJO / ISO / Actions |
| Studio / AdminCN barrels in `error.tsx` | Plain client UI |
| Product `'use cache'` / `cacheComponents` without ADR-008 Phase 2 | Stay Mode A |
| `cookies()` / `headers()` inside `'use cache'` on tenant paths | Pass ids as args (Phase 2 only) |
| `force-static` / untagged shared cache on session data | Request-time Mode A |
| Swallow `redirect` / `notFound` | Rethrow or call outside catch |
| Neon Auth → Clerk | Reject |
| Collapse recover of banned trees | [ARCH-028](ARCH-028-implementation-slices.md) |

## 3.16 Verification (after App Router edits)

When a Next app is running (docs-first checkout may have none):

```text
MCP nextjs_index → get_routes → get_errors
```

| Check | Meaning |
|-------|---------|
| `get_routes` | Paths align with [ARCH-012](ARCH-012-app-router-routes.md) when product tree exists |
| `get_errors` | Framework health — clean before claim done |
| Isolation | `get_errors` is **not** tenant-isolation proof (ADR-008 Phase 2 checklist) |

Also: `npx tsc --noEmit` on touched Target paths when code exists.

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-002 | Frontend Architecture | Mode A/B + layer authority |
| ARCH-012 | App Router Routes | Route inventory · proxy matcher |
| ARCH-013 | BFF and Data Flow | Data tree · Action/RH checklists · waterfalls |
| ARCH-015 | AdminCN Alignment | Studio / shell (UI homes adjacent) |
| ARCH-017 | Frontend Folder Map | Folder homes |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org isolation |
| ARCH-027 | Env Model | Out-of-scope pointer |
| ARCH-028 | Implementation Slices | Anti-contamination · Target greenfield |
| ADR-008 | Cache Components Mode B (Gated) | Phase 1 Accepted; Phase 2 enable gate |

Method: `.cursor/skills/afenda-elite-nextjs-best-practice/` (`reference/nextjs-conventions.md` · `accelint-perf.md` · `runtime-mcp.md`).

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.2.2 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.1 | 2026-07-14 | ADR link home → `docs/architecture/adr/` (DOC-001 2.5.0). |
| 1.2.0 | 2026-07-14 | Numbered mechanics; Afenda overrides; Mode A pages table; bundling; hard stops; RH/cookies samples; fix ARCH-027 link; clarify ARCH-013 as data-tree SSOT. |
| 1.1.0 | 2026-07-14 | Elite Next.js sync: data patterns; Mode A RH segment table; Action in-action auth; `React.cache`/`after`; error.tsx / global-error rules; ADR-008 Phase 1≠2; MCP vs isolation. |
| 1.0.5 | 2026-07-14 | Point `'use cache'` at Accepted ADR-008 Phase 1≠Phase 2. |
| 1.0.4 | 2026-07-14 | Align `'use cache'` with ARCH-002 Mode A/B (ADR-gated Cache Components). |
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

### Authority reminders

- Do not enable `cacheComponents` or product `'use cache'` from this conventions doc alone — ADR-008 Phase 2.  
- Do not grow a second BFF decision tree here — link [ARCH-013](ARCH-013-bff-and-data-flow.md).  
- Living ARCH packs override the Elite Next.js skill when they conflict.
