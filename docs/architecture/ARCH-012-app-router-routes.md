# ARCH-012 App Router Routes

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-012     |
| **Category**      | Architecture |
| **Version**       | 1.2.5        |
| **Status**        | Living       |
| **Control State** | Closed     |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-15   |

---

# 1. Purpose

Publish the Living App Router route catalogue: path inventory, proxy gates, special-file expectations, and render/data posture for product and harness surfaces.

This document is the **route map SSOT**. File conventions, RSC rules, and Mode A/B caching live in sibling ARCH packs; this pack inventories *which* routes exist and how they are gated.

---

# 2. Scope

## 2.1 In Scope

- Pre-login, join, client, operator dashboard, account, public Route Handlers, playground, FFT route families
- Proxy matcher and in-matcher bypasses
- Layout-group intent, special-file expectations, owner feature homes
- Ingress and render defaults per route family (Mode A — request-time)

## 2.2 Out of Scope

- Hexagon ports and backend ownership maps ([ARCH-005](ARCH-005-backend-folder-map.md) / [ARCH-009](ARCH-009-modules-ownership-map.md))
- AdminCN customization levers ([ARCH-015](ARCH-015-admincn-alignment.md))
- Data-pattern decision tree detail ([ARCH-013](ARCH-013-bff-and-data-flow.md))
- Special-file / directive mechanics ([ARCH-016](ARCH-016-next-js-conventions.md))
- Target monorepo package moves ([ARCH-022](ARCH-022-system-overview.md) / [ARCH-028](ARCH-028-implementation-slices.md))
- Recovering Collapse-era repo-root `app/` / `modules/` / `features/` / `components-V2/` from git (contamination ban — [ARCH-028](ARCH-028-implementation-slices.md))
- Cache Components Mode B enablement ([ADR-008](adr/ADR-008-cache-components-mode-b.md) — Phase 2 not authorized)

---

# 3. App Router Routes

**Posture:** Paths are a **logical Living map**. After Collapse, repo-root product trees are absent by design. When product code is implemented, place it under Target `apps/web/**` (logical `app/` shape below) after an **explicit** [ARCH-028](ARCH-028-implementation-slices.md) implement request — never by restoring banned Collapse trees.

**Shell DNA:** Operator families (`/dashboard`, `/account`, `/fft`) use the shared AdminCN-pattern shell from **Shadcn Studio** DNA — promote via [ARCH-015](ARCH-015-admincn-alignment.md); homes via [ARCH-017](ARCH-017-frontend-folder-map.md). Auth stays Neon island (`features/auth`) — never blank Studio auth demos.

**Composition column:** Values describe **intended Target bindings** when a product tree exists — not a claim that Collapse-era files are on disk.

**Method (not authority):** `.cursor/skills/afenda-elite-nextjs-best-practice/` — Living ARCH packs override the skill on conflict.

## 3.1 Ingress and data posture

```text
apps/web/proxy.ts (session gate; not middleware.ts)
  → layout.tsx (segment chrome / require*Session where gated)
  → thin page.tsx (RSC — await params / searchParams)
      → features/* or components-V2/.../portal-views (UI)
      → modules/*/domain via loaders / runners (reads)
      → app/actions/* (mutations — authz + Zod inside Action)
  → app/api/*/route.ts — health / Neon Auth proxy / draft XHR / external only
```

| Need | Choose | Authority |
|------|--------|-----------|
| Server read | RSC → loader / `modules/*` (no self-`fetch('/api')`) | [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| Browser mutation | Server Action — session + org/FFT + Zod **inside** the Action | [ARCH-002](ARCH-002-frontend-architecture.md) · [ARCH-013](ARCH-013-bff-and-data-flow.md) |
| Webhook / external REST / health / auth proxy | `app/api/**/route.ts` | This catalogue + [ARCH-016](ARCH-016-next-js-conventions.md) |
| Client-only read | Props from RSC parent; else Route Handler — never invent `/api` for ordinary RSC reads | [ARCH-013](ARCH-013-bff-and-data-flow.md) |

**Hard bindings**

| Topic | Rule |
|-------|------|
| Proxy file | `apps/web/proxy.ts` only — **no** new `middleware.ts` |
| Coexistence | Never colocate `page.tsx` and `route.ts` in the same segment |
| Session trees | Request-time Mode A — **never** `force-static` on `/dashboard/*`, `/account/*`, `/fft/*`, `/client/*` workspace |
| Cache Components | Off until ADR-008 Phase 2 — [ARCH-002](ARCH-002-frontend-architecture.md) |
| Parallel / intercepting routes | Out of scope for v1 — [ARCH-016](ARCH-016-next-js-conventions.md) |
| Catch-all / optional catch-all | Only when a row in this catalogue allows it |

## 3.2 Route-family matrix

| Family | Gate | Default render (Mode A) | Special files |
|--------|------|-------------------------|---------------|
| `/dashboard/*`, `/account/*` | Authenticated member (`requireMemberSession`); admin ops use `requirePlatformOperatorSession` | Request-time | `loading` + `error` required on authenticated segments |
| `/fft/*` | Platform `fft.access` (`requireFftAccess` / `hasFftModuleAccess`) — org admin alone is insufficient | Request-time | `loading` + `error` on authenticated segments |
| `/client/*` workspace | `requireRole('client')` on `(workspace)` layout; Closed product restore (onboarding/profile/declare) remains registered Closed | Request-time when authorized | `loading` + `error` under `dashboard/` (not on redirect parents) |
| `/client/login`, `/client/preview-unavailable` | Gate blank chrome; session-gate bypass (no `requireRole`) | Request-time | Parent `(gate)` has **no** `loading`/`error` (login uses `redirect()`); preview segment may own them |
| `/auth/*`, join, public links | Auth island / public | Per surface | See rows |
| `/api/health/*` | None | `auto` + short revalidate | Route Handlers only |
| `/playground/*` | Local only (`PLAYGROUND_ENABLED`) | Never a production contract | Dev harness |

Secondary panels may Suspense-stream **now** without Cache Components ([ARCH-002](ARCH-002-frontend-architecture.md)).

## 3.3 Legend

| Column / term | Meaning |
|---------------|---------|
| **Page** | Logical path under Target `apps/web/app/` (shown as `app/...`) |
| **Proxy** | Matched by `apps/web/proxy.ts` session gate |
| **loading / error** | Required on authenticated product segments after Target rebuild — [ARCH-016](ARCH-016-next-js-conventions.md) |
| **Composition** | `wired` = product composition intended when Target tree exists; `holding` = registered Closed/Intentional surface (not an open gap); `rebuild` = catalogue row awaiting an authorized implement slice |
| **Closed (registered)** | Completeness must not read “missing” / “TODO” — [deprecation register — Closed product phases](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

Do **not** treat holding/Closed rows as authorization to invent new shims or product stubs outside an explicit reopen letter.

## 3.4 Pre-login (wired)

| Path | Page | Layout | loading | error | Proxy | Owner |
|------|------|--------|---------|-------|-------|-------|
| `/` | `app/page.tsx` | root | optional | root | no | `features/landing` |
| `/auth/[path]` | `app/auth/[path]/page.tsx` | root | yes | yes | no | `features/auth` |
| `/auth/admin` | `app/auth/admin/page.tsx` | root | yes | — | no | `features/auth` / entry |
| `/org/login` | `app/org/login/page.tsx` | root | yes | — | no | `features/auth/entry` org sign-in |
| `/client/login` | `app/(client)/client/(gate)/login/page.tsx` | `(gate)` | — | — | bypass* | `features/auth` → `redirect(/auth/login)` |
| `/client/preview-unavailable` | `app/(client)/client/(gate)/preview-unavailable/page.tsx` | `(gate)` | yes† | yes† | bypass* | `features/auth` preview gate |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | root | yes | — | no | `features/auth/entry` legacy invite |
| `/f/[token]` | `app/f/[token]/page.tsx` | root | yes | — | no | share access |
| `/survey/[slug]` | `app/survey/[slug]/page.tsx` | root | yes | — | no | open link |

\* `/client/*` is in the proxy matcher; `/client/login` and `/client/preview-unavailable` are bypassed in `apps/web/proxy.ts` via `CLIENT_GATE_PATHS` (`session-gate-policy.ts`).  
† Segment `loading`/`error` under `preview-unavailable` only — do not place them on the parent `(gate)` segment (they swallow `redirect()` and soft-serve 200).

## 3.5 Join

| Path | Page | Layout | loading | error | Proxy | Owner | Composition |
|------|------|--------|---------|-------|-------|-------|-------------|
| `/join` | `app/join/page.tsx` | root | yes | yes | no | `features/auth` invitation join (`?invitationId=…`) | holding · Target composition when tree exists |

Canonical client invitation entry: `/join?invitationId=…` ([AGENTS.md](../../AGENTS.md) · Neon Auth).

## 3.6 Client post-login

**On-disk (Living):** Target tree under `apps/web/app/(client)/client/{(gate)|(workspace)}` — see [ARCH-022](ARCH-022-system-overview.md). `(gate)` = blank chrome + session-gate bypass; `(workspace)` = `requireRole('client')`.

**Disposition — Closed product restore:** `/client/onboarding`, `/client/profile`, `/client/declare/*` remain **Closed (registered)**. Do not restore Collapse-era `features/client-workspace/` or banned repo-root trees. Reopen requires explicit user letter + frontend spec slice + vertical slice.

| Path | Page | Layout | loading | error | Proxy | Owner | Composition |
|------|------|--------|---------|-------|-------|-------|-------------|
| `/client` | `app/(client)/client/(workspace)/page.tsx` | workspace | — | — | yes | redirect → `/client/dashboard` | wired |
| `/client/dashboard` | `app/(client)/client/(workspace)/dashboard/page.tsx` | workspace | yes | yes | yes | `features/declarations` DeclarationsShell | wired |
| `/client/onboarding` | `app/(client)/client/(workspace)/onboarding/page.tsx` | workspace | — | — | yes | Closed product phases | holding · **Closed (registered)** |
| `/client/profile` | `app/(client)/client/(workspace)/profile/page.tsx` | workspace | — | — | yes | Closed product phases | holding · **Closed (registered)** |
| `/client/declare/[assignmentId]` | `app/(client)/client/(workspace)/declare/[assignmentId]/page.tsx` | workspace | — | — | yes | Closed product phases | holding · **Closed (registered)** |

Route groups: `(gate)` = blank chrome entry; `(workspace)` = authenticated client shell — [ARCH-002](ARCH-002-frontend-architecture.md). Gate rows (`/client/login`, `/client/preview-unavailable`) live in §3.4.

## 3.7 Organization admin (dashboard)

Shared AdminCN shell (`AdminCnShell`). Layout gate: **authenticated member** (`requireMemberSession`) — Declarations module is open to every org member. Admin-route ops (dashboard lists, roles, users, invites) use `requirePlatformOperatorSession` (Neon admin **or** matching platform permission codes). Neon `requireAdminSession` remains for impersonation/preview bootstrap only. There is no separate “portal persona” type — use organization admin vs client.

| Path | Page | Layout | loading | error | Proxy | Owner | Composition |
|------|------|--------|---------|-------|-------|-------|-------------|
| `/dashboard` | `app/dashboard/page.tsx` | dashboard AdminCN | yes | yes | yes | `components-V2/.../portal-views` organization-admin-declarations-dashboard | wired |
| `/dashboard/clients` | `app/dashboard/clients/page.tsx` | dashboard | yes | yes | yes | `portal-views` organization-admin-clients-list | wired |
| `/dashboard/users` | `app/dashboard/users/page.tsx` | dashboard | yes | yes | yes | `portal-views` organization-admin-users-list | wired |
| `/dashboard/users/[userId]` | `app/dashboard/users/[userId]/page.tsx` | dashboard | yes | yes | yes | `portal-views` organization-admin-users-view | wired |
| `/dashboard/roles` | `app/dashboard/roles/page.tsx` | dashboard | yes | yes | yes | `features/organization-admin` organization-admin-roles-list | wired |
| `/dashboard/permissions` | `app/dashboard/permissions/page.tsx` | dashboard | yes | yes | yes | `features/organization-admin` permissions matrix | wired |
| `/dashboard/[declarationId]` | `app/dashboard/[declarationId]/page.tsx` | dashboard | yes | yes | yes | `portal-views` organization-admin-declaration-detail | wired |

Prefer descriptive dynamic segment names (`[declarationId]`, `[userId]`) — not overloaded `[id]`.

## 3.8 Account

Same AdminCN shell as dashboard. Layout gate: `requireMemberSession`.

| Path | Page | Layout | loading | error | Proxy | Owner | Composition |
|------|------|--------|---------|-------|-------|-------|-------------|
| `/account` | `app/account/page.tsx` | account AdminCN | yes | yes | yes | `features/account` | holding · Target neon AccountView wiring |
| `/account/[path]` | `app/account/[path]/page.tsx` | account | yes | yes | yes | Neon AccountView wrapper | holding · Target neon AccountView wiring |

## 3.9 Public API (Route Handlers — not pages)

| Path | File | Role | Cache (Mode A) |
|------|------|------|----------------|
| `/api/health/liveness` | `app/api/health/liveness/route.ts` | Liveness | `auto` + short revalidate |
| `/api/health/readiness` | `app/api/health/readiness/route.ts` | Readiness | `auto` + short revalidate |
| `/api/auth/[...path]` | `app/api/auth/[...path]/route.ts` | Neon Auth proxy | session / `force-dynamic` as required |
| `/api/client/declaration-draft` | `app/api/client/declaration-draft/route.ts` | Draft autosave XHR | tenant BFF — not `force-static` |

Never place `route.ts` beside a `page.tsx` in the same segment. Prefer Server Actions for first-party browser mutations ([ARCH-013](ARCH-013-bff-and-data-flow.md)).

## 3.10 Playground (dev only)

| Path | Role | Proxy | Composition |
|------|------|-------|-------------|
| `/playground` | Harness index | yes | wired / local-only |
| `/playground/[screenId]` | Screen iframe host | yes | wired |
| `/playground/coverage` | Route coverage | yes | wired |
| `/playground/hitl-review` | Source-backed HITL route review | yes | wired |

Gated by `PLAYGROUND_ENABLED`. Not a client product surface. Never sync playground env to Vercel production.

Curated route bindings live in `features/playground/playground-registry.ts` when the Target tree exists; `pnpm check:playground` enforces route, review-definition, evidence, and E2E fixture parity.

HITL route review keeps two facts separate: **Expected from source** is the registered fixture contract backed by route/entry files; **Human verdict** is the locally stored runtime observation. Notes and copied repair prompts never mark a route verified.

## 3.11 Feed Farm Trade (gated appendix)

**Product purpose:** B2B feed & farm trade sales for 3F businesses (feedmills, farmers, Feed · Farm · Food — industry customers, not portal organization admins). Downstream customer portal is a future series branch.

| Authority | Doc |
|-----------|-----|
| Locks / architecture | [FFT-MOD-001](../modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |
| Roadmap / index | [FFT-MOD-010](../modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |
| Ops / gates / flags | [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Auth / RBAC | [FFT-MOD-005](../modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md) |
| Platform tenancy | [ARCH-023](ARCH-023-multi-tenancy.md) |

**Shell id:** `fft`. Same AdminCN shell as Declarations. Layout gate: platform **`fft.access`** via `requireFftAccess` / `hasFftModuleAccess` (hard org-scoped). Organization admin alone does **not** unlock `/fft`. Locale URL segment removed (i18n deferred to action arg); paths are flat under `/fft/*`. Do **not** restore a separate `FftShell` or locale switcher.

Sidebar entitlement: `features/portal-chrome/resolve-shell-access.ts` (`declarations` for all members; `fft` only with permission). Types: `modules/platform/shell/access.ts`.

| Path pattern | Role | Proxy | Composition |
|--------------|------|-------|-------------|
| `/fft` | Redirect → `/fft/events` | yes | wired (shell) |
| `/fft/events` | Sales events list | yes | P1 wired |
| `/fft/events/[eventId]/order` | Order | yes | P1 wired |
| `/fft/my-orders` | My orders (+ transfer / complete) | yes | P1 wired |
| `/fft/admin/events` | Admin events | yes | P1 wired |
| `/fft/admin/events/new` | Create event | yes | P1 wired |
| `/fft/admin/events/[eventId]/setup` | Setup (+ supply / fields / priority / audit / export) | yes | P1 wired |
| `/fft/admin/events/[eventId]/allocation` | Allocation | yes | P1 wired |
| `/fft/admin/rbac` | RBAC / sales-member | yes | P1 wired |
| `/fft/admin/events/[eventId]/deposits` | Deposits | yes | P3 · flag-gated · **Closed (registered)** prod promotion |
| `/fft/admin/events/[eventId]/imports` | Imports | yes | P3 · flag-gated · **Closed (registered)** prod promotion |
| `/fft/admin/events/[eventId]/pickup` | Pickup | yes | P3 · flag-gated · **Closed (registered)** prod promotion |
| `/fft/admin/erp-sync` | ERP sync | yes | P3 · flag-gated · **Closed (registered)** prod promotion |

Promotion and flags: follow [FFT-MOD-008](../modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) — not this doc. Phase 2B–2D product work remains blocked until explicit program reopen + Approved slice group in FFT-MOD-008.

## 3.12 Proxy matcher (authoritative)

From `apps/web/proxy.ts`:

| Class | Paths |
|-------|-------|
| Matched | `/account/*`, `/dashboard/*`, `/client/*`, `/fft/*`, `/playground/*` |
| Public (not matched) | `/`, `/auth/*`, `/join`, `/org/login`, `/invite/*`, `/api/*`, `/survey/*`, `/f/*` |
| Bypasses inside matcher | `?embed=1`, `/client/login`, `/client/preview-unavailable` (`CLIENT_GATE_PATHS`), `POST`+`next-action` header |

`proxy.ts` gates document navigations only. Server Actions must still call `require*Session` (and org/FFT authz + Zod) **inside** the Action.

## 3.13 Verification (when Target App Router exists)

```text
nextjs_index → get_routes → get_errors
```

Docs-first checkout with no product tree: audit this Living catalogue only — no invented disk claims ([ARCH-028](ARCH-028-implementation-slices.md)).

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-002 | Frontend Architecture | Layer rules · Mode A/B · Action trust |
| ARCH-013 | BFF and Data Flow | Data-pattern decision tree |
| ARCH-015 | AdminCN Alignment | Shell / portal-views |
| ARCH-016 | Next.js Conventions | Special files · async APIs · proxy mechanics |
| ARCH-017 | Frontend Folder Map | Folder homes for owners |
| ARCH-022 | System Overview | Target monorepo tree |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org isolation · FFT entry |
| ARCH-028 | Implementation Slices | Anti-contamination · Target greenfield |
| ADR-008 | Cache Components Mode B (Gated) | Mode B enable gate (Phase 1 only) |
| FFT-MOD-001 | Feed Farm Trade module architecture | FFT product locks |
| FFT-MOD-005 | Feed Farm Trade auth / tenancy / RBAC | FFT access gate |
| FFT-MOD-008 | Feed Farm Trade ops runtime | Gates · flags · checklists |
| FFT-MOD-010 | Feed Farm Trade module docs index | Roadmap / spine |

Agent method (not a controlled ID): `.cursor/skills/afenda-elite-nextjs-best-practice/` via `/using-afenda-elite-skills`. Closed-phase dispositions: [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.2.5 | 2026-07-15 | `(client)` normalize: workspace `loading`/`error` under `dashboard/` only (redirect-safe; same class as gate login). |
| 1.2.4 | 2026-07-15 | Client path honesty: Living inventory under `app/(client)/client/{(gate)|(workspace)}`; gate loading/error rules; `/client` + `/client/dashboard` wired; preview gate moved to §3.4. |
| 1.2.3 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` (repo SSOT `packageManager` + `pnpm-lock.yaml`). |
| 1.2.2 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.1 | 2026-07-14 | ADR link home → `docs/architecture/adr/` (DOC-001 2.5.0). |
| 1.2.0 | 2026-07-14 | Studio shell DNA note; composition column = Target logical bindings (not on-disk claim); ARCH-015/017 pointers. |
| 1.1.0 | 2026-07-14 | Elite Next.js sync: ingress + family matrix; Mode A render defaults; composition vocabulary (wired/holding/Closed registered); fix FFT MOD links; expand References; proxy Action-trust note. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover; Target greenfield via ARCH-028 only. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log; Control State Closed after architecture sync campaign. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` (and wiped Collapse-era ops scripts) are **not present** in this checkout after design-SSOT Collapse (`4680c91`).
- **Forbidden:** recovering those trees from git history (`f014807` / Collapse parents) — contamination of the docs-first checkout. See [ARCH-028](ARCH-028-implementation-slices.md) Anti-contamination lock.
- Paths in this document are a **logical Living map** (shape). When product code is implemented, place it under **Target** roots per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-028](ARCH-028-implementation-slices.md) (`apps/web/**`, `packages/*`) after an **explicit** implement request — never as a restore of banned repo-root trees.
- Phrases such as “on disk”, “wired”, or “relocate complete” describe the intended shape when a Target product tree exists; they are **not** a claim that Collapse-era files may be recovered.

### Authority vs skill

- This Living ARCH is the **route catalogue** SSOT.
- Rendering Mode A/B and Action trust: [ARCH-002](ARCH-002-frontend-architecture.md) + [ADR-008](adr/ADR-008-cache-components-mode-b.md).
- The Elite Next.js skill is method only — it cannot add routes, flip `cacheComponents`, or reopen Closed client/FFT phases without the named authority above.
