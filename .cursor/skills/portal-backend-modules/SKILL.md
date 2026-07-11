---
name: portal-backend-modules
description: >-
  Afenda-Lite backend modules SSOT — modules/{platform,identity,declarations,fft},
  ports/adapters, Pass-2 residue, shared Platform Zod. Use when adding domain/schema
  under modules/, relocating lib residue, choosing a bounded context, fixing
  Trade↛Declarations imports, or when the user mentions portal-backend-modules,
  lib ownership, or modular monolith backend.
---

# Portal backend modules

**SSOT for this program.** Shape domain work from `doc/backend/` + this skill. Do not grow `lib/` as architecture or invent `modules/trade/`.

| Doc | Purpose |
|-----|---------|
| [module-tree.md](module-tree.md) | Exact `modules/*` L2 + Actions / API checklist |
| [context-boundaries.md](context-boundaries.md) | Trade ↛ Declarations, port isolation, narrow edges |
| [adapter-map.md](adapter-map.md) | Action / Route Handler → module entrypoints |
| [residue-inventory.md](residue-inventory.md) | Pass 2 + full runner absorb — `lib/` gone; runners under `features/` |
| [completeness.md](completeness.md) | Plan ↔ codebase matrix for this program |
| [doc/backend/](../../../doc/backend/) | Architecture, ownership, conventions |
| [doc/api/](../../../doc/api/) | Error shape, REST catalog, types |

## Agent operating rules

1. **Surface assumptions** if disk and this skill disagree — stop and ask.
2. **Scope:** new domain/schema/env files go under `modules/<context>/`. Adapters stay in `app/actions` / `app/api`.
3. **Simplicity:** one context per file; compose two contexts only at the adapter.
4. **Verify** with the checklist below — “looks right” is not done.
5. **Push back** on `lib/domain` recreation, RSC `fetch('/api')` for ordinary reads, or `modules/trade/`.

## Hard rules

1. **Modules are SSOT** — domain / Zod / env / Neon Auth live under `modules/{platform,identity,declarations,fft}`. Do not grow `lib/` as architecture.
2. **Adapters stay thin** — `app/actions/*`, `app/api/*`, thin `app/**/page.tsx` / runners; no SQL in adapters.
3. **Ports never import** `Request`, `next/headers`, or UI.
4. **One context per new file** — compose two contexts only at the adapter.
5. **Trade code path = `modules/fft`** — never create `modules/trade/`. Product files under `features/fft/fft-*.tsx` (not `trade-*`, not `features/trade/`).
6. **Validate once at adapter** — product Zod in owning `modules/*/schemas`; **shared** primitives (`uuidSchema`, `emailSchema`, `passwordSchema`, `slugSchema`, `parseSchema`) from `@/modules/platform/schemas/common` only. Do **not** import shared Zod from Declarations into Trade/Identity. Email normalize: `@/modules/platform/normalize-email`.
7. **Decision tree** — link [doc/frontend/04-bff-and-data.md](../../../doc/frontend/04-bff-and-data.md); do not paste a second copy.
8. **Contract** — errors / brands / REST live in `doc/api` + `/portal-api-contract`; this skill does not restate error tables.
9. **Relocate + Pass 2 + full runner absorb are complete** — do not recreate `lib/`; product + playground runners live under `features/` ([residue-inventory.md](residue-inventory.md)).

## Context cheat sheet

| Context | Owns | Must not import |
|---------|------|-----------------|
| **Platform** | `modules/platform/**` (incl. `schemas/common`, `normalize-email`, `copy`, `evidence-acceptance`) | Product domain rules |
| **Identity** | `modules/identity/**` | Declarations (any), Trade |
| **Declarations** | `modules/declarations/**` | Trade (`modules/fft`) |
| **Trade** | `modules/fft/**` | Declarations (any tree — use Platform for shared Zod) |
| **FE runners** | `features/auth/entry`, `features/organization-admin` pages, `features/auth/public-link-page*`, `features/playground` | Domain SQL / copy SSOT (those live in `modules/`) |

## Data adapters (wire)

```text
RSC read?              → modules/*/domain directly (never fetch own /api)
Client mutation?       → Server Action → Zod → port → ActionResult
Draft XHR / auth / health / webhook? → Route Handler
External/mobile REST?  → Route Handler per doc/api (contract-only until needed)
```

## Pass order

1. **Docs / skill truth** — this skill + `doc/backend` (**done**)
2. **Wire** — `/portal-api-contract` + Actions / handlers
3. **UI** — `/portal-frontend-scaffold` + `features/*`
4. **Residue Pass 2** — **done** 2026-07-12
5. **Platform copy port + entry/org-admin absorb** — **done** 2026-07-12
6. **Playground harness absorb** — **done** 2026-07-12 (`features/playground`; `lib/` gone)

## Lessons (2026-07-12) — do not relearn the hard way

| Lesson | Do this |
|--------|---------|
| Shared Zod in Declarations breaks Trade isolation | Put uuid/email/`parseSchema` in **Platform** `schemas/common`; Declarations `schemas/common` may re-export + keep `surveyAnswersSchema` |
| `normalizeEmail` in Declarations domain pulled Identity across the ban | Own it in **Platform** `normalize-email.ts`; Declarations may re-export |
| Indexer/Glob lie about deleted `lib/domain` | Trust **disk** (`Get-ChildItem`); never recreate gone drawers from ghost paths |
| FFT inventory pointed at `features/trade` | Disk product UI is `features/fft/fft-*.tsx`; registry paths + `collectDiskInventory` must match disk (path sync ≠ inventing IDs) |
| `transferStatus: null` fails types | Use `"none"` from `FFT_TRANSFER_STATUSES` |
| JSDoc with `modules/*/schemas/` | `*/` **closes the comment** — write “each modules context schemas folder” instead |
| Tests asserting old copy strings | Follow live `portalCopy` SSOT (`"Client"` not `"Client portal"`) |
| Pass 2 ≠ delete runners | All runners absorbed into `features/`; do not recreate `lib/`; do not mix with FFT flags |
| Users list was fixture-only | Wire `modules/identity/domain/organization-users` + `UserId` schemas; RSC loader maps display; role/ban via `app/actions/admin` → `neonAdmin*` |
| Users export / bulk | Client CSV/JSON from filtered list; bulk remove/ban actions with Zod `userIds` array; import via CSV/JSON template (`email,name,password,role`) |

| AdminCN plan/billing columns | Keep as chrome defaults (`Basic` / `Manual`); do not invent SaaS billing in Identity |
| Users create/edit/password/sessions | Actions in `admin.ts`; forms in `features/organization-admin`; enrich company/phone/country from Declarations profile summaries **at the RSC adapter only** |
| Mapper tests pulled Neon Auth Next entry | Keep pure mappers in `features/organization-admin/organization-admin-users-map.ts` — do not import `neonAdmin*` into unit-tested map modules |
| Identity bootstrap still calls Declarations invite/profile | **Closed** — Identity `client-profile` + `client-invitation-bootstrap`; Declarations re-exports profile reads |
| Remaining Identity→Declarations | **Closed** — Platform copy port; Identity has zero Declarations imports |
| Grep ghosts for deleted `lib/*` / `components/` | Trust disk (`Test-Path` / `Get-ChildItem`); git may still list deleted `app/actions/trade.ts` until committed |

## Forbidden

- Recreating `lib/` (any drawer), `lib/domain`, `lib/schemas`, `lib/env`, `lib/routing`, `lib/auth`, `lib/copy`
- Creating `modules/trade/` or `features/trade/` product trees
- Trade (or Identity) importing `@/modules/declarations/schemas/common` for shared primitives — use Platform
- Mixing residue / runner migrate into Feed Farm Trade flag / gate-register work
- RSC `fetch('/api/...')` for ordinary product reads
- New REST list endpoints for web UI (use RSC → port)
- Divergent Action vs HTTP business logic for the same use-case
- Editing `ui-registry.json` to invent `FFT-UI-*` / `ACN-*` IDs — path sync to disk after renames is OK; new IDs need HITL

## Cross-skills

| Need | Skill |
|------|-------|
| Route stubs / wipe FE | `/portal-frontend-scaffold` |
| ActionResult / brands / api-now | `/portal-api-contract` |
| FFT product UI / gates / registry | `/feed-farm-trade` · `fft-ui-registry.mdc` |

## Verify backend modules

- [ ] [module-tree.md](module-tree.md) matches `Get-ChildItem modules`
- [ ] `lib/` is absent (no `entry|pages|playground|domain|schemas|auth|copy|utils|format`)
- [ ] New domain/schema file sits in exactly one context
- [ ] Actions listed in [adapter-map.md](adapter-map.md) match `app/actions/`
- [ ] Route Handlers match api-now (four trees only unless catalog updated)
- [ ] No `from "@/modules/declarations` inside `modules/fft` (domain or schemas)
- [ ] Shared Zod / `parseSchema` imported from `@/modules/platform/schemas/common` at Action edge
- [ ] `npm run check:fft-ui-registry` OK when touching FFT UI paths
- [ ] Zod at adapter edge; domain has no duplicate DTO Zod for the same input
