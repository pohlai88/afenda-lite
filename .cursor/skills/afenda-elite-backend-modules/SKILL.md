---
name: afenda-elite-backend-modules
description: >-
  Afenda Elite backend modules SSOT — modules/{platform,identity,declarations,fft},
  ports/adapters, Pass-2 residue, shared Platform Zod. Use when adding domain/schema
  under modules/, relocating lib residue, choosing a bounded context, fixing
  Trade↛Declarations imports, or when the user mentions afenda-elite-backend-modules,
  lib ownership, or modular monolith backend.
---

# Afenda Elite — backend modules

**SSOT for this program.** Shape domain work from this skill + companions + disk `apps/web/modules/**` + Scratch [`docs-V2/api`](../../../docs-V2/api/README.md). Do not grow `lib/` as architecture or invent `modules/trade/`. Cite `term.afenda-elite`. Living `docs/architecture` / `docs/api` bodies are dormant — operative ARCH facts live in companions.

```text
LOAD:
  companions: module-tree.md · context-boundaries.md · adapter-map.md · residue-inventory.md · completeness.md
  apps/web/modules/** · apps/web/features/**   # disk honesty
  docs-V2/api/README.md · rest.md · actions.md # HTTP / Action Scratch
SKIP:
  Living docs/architecture · docs/api as required LOAD
  recreating lib/ · modules/trade/ · Collapse root recover
VERIFY:
  Test-Path apps/web/modules · companion checklists
```

| Doc | Purpose |
|-----|---------|
| [module-tree.md](module-tree.md) | Target / logical L2 inventory — not docs-first disk SSOT |
| [context-boundaries.md](context-boundaries.md) | Trade ↛ Declarations, port isolation, narrow edges |
| [adapter-map.md](adapter-map.md) | Action / Route Handler → module entrypoints |
| [residue-inventory.md](residue-inventory.md) | Pass 2 + full runner absorb — `lib/` gone; runners under `features/` |
| [completeness.md](completeness.md) | Plan ↔ codebase matrix for this program |
| [docs-V2/api/](../../../docs-V2/api/) | Error shape, RH allowlist, Actions Scratch |
| [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) | Brands · envelopes · OpenAPI |

## Target tree + docs-first checkout

| Surface | Authority |
|---------|-------------|
| Target physical home | `apps/web/modules/{platform,identity,declarations,fft}` (ARCH-006 · ARCH-022 — see [module-tree](module-tree.md)) |
| This checkout | Root `modules/` / `app/` may be **absent by design** (ARCH-028 — Collapse ban); Target under `apps/web` is present |
| Packages | Exactly the ARCH-024 named set under Target; no new `packages/*` or `apps/*` without a preceding ADR |
| Contaminations ban | Do not recover wiped Collapse roots (`app/`, `modules/`, `features/`, `components-V2/`) from git — including `git show` mining — unless the user explicitly names that recovery in this turn |

Logical shape in companions may say `modules/*` — physical Target path is under `apps/web`.

### Bounded contexts (locked)

Only **Platform · Identity · Declarations · Trade (`fft`)**. Inventing Sales/Purchasing/Inventory/Finance/Payments contexts (or `modules/trade/`) requires a controlled ADR first — scratch ERP requirements cannot authorize them.

### AuthZ at module boundary

Domain entrypoints that mutate or read tenant data take explicit `orgId` and rely on adapter-enforced permission codes (ARCH-023 · [`neon-tenancy-efficiency`](../neon-tenancy-efficiency/SKILL.md)). Modules must not:

- infer org from ambient state;
- authorize by Neon Auth role display names; or
- import another context’s tables/schemas outside published ports.

Adapter checklist → [`afenda-elite-api-contract`](../afenda-elite-api-contract/SKILL.md).

## Agent operating rules

1. **Surface assumptions** if disk and this skill disagree — stop and ask.
2. **Scope:** new domain/schema/env files go under Target `apps/web/modules/<context>/`. Adapters stay thin in App Router Actions / Route Handlers.
3. **Simplicity:** one context per file; compose two contexts only at the adapter.
4. **Verify** with the checklist below — “looks right” is not done.
5. **Push back** on `lib/domain` recreation, RSC `fetch('/api')` for ordinary reads, `modules/trade/`, or new bounded contexts without ADR.

## Hard rules

1. **Modules are SSOT (when product exists)** — domain / Zod / Neon Auth under Target `apps/web/modules/{platform,identity,declarations,fft}` (logical `modules/*`). Do not grow `lib/` as architecture. Docs-first: trees may be absent — do not recover Collapse roots.
2. **Adapters stay thin** — Target `apps/web/app/actions/*`, `app/api/*`, thin pages / runners; no SQL in adapters.
3. **Ports never import** `Request`, `next/headers`, or UI.
4. **One context per new file** — compose two contexts only at the adapter.
5. **Trade code path = `fft`** — never create `modules/trade/`. Product UI under `features/fft/…` on Target (not `trade-*`).
6. **Validate once at adapter** — product Zod in owning context schemas; **shared** primitives from Platform `schemas/common` only. Do **not** import shared Zod from Declarations into Trade/Identity.
7. **Decision tree (ARCH-013 operative):** RSC read → domain port; client mutation → Server Action → Zod → port → ActionResult; draft XHR / auth / health / webhook → Route Handler; external REST → RH per api-contract (contract-only until needed). Do not paste a second copy.
8. **Contract** — errors / brands / REST live in [`afenda-elite-api-contract`](../afenda-elite-api-contract/SKILL.md) + `docs-V2/api`; this skill does not restate error tables.
9. **Residue program** — do not recreate `lib/`; historical absorb targets are under Target `features/` ([residue-inventory.md](residue-inventory.md)).

## Context cheat sheet

| Context | Owns | Must not import |
|---------|------|-----------------|
| **Platform** | `modules/platform/**` (incl. `schemas/common`, `normalize-email`, `copy`, `evidence-acceptance`) | Product domain rules |
| **Identity** | `modules/identity/**` | Declarations (any), Trade |
| **Declarations** | `modules/declarations/**` | Trade (`modules/fft`) |
| **Trade** | `modules/fft/**` | Declarations (any tree — use Platform for shared Zod) |
| **FE runners** | Target: `features/{auth,declarations,fft,org-admin}` shells (S7.4) | Domain SQL / copy SSOT (those live in `modules/`) |

## Data adapters (wire)

```text
RSC read?              → modules/*/domain directly (never fetch own /api)
Client mutation?       → Server Action → Zod → port → ActionResult
Draft XHR / auth / health / webhook? → Route Handler
External/mobile REST?  → Route Handler per docs-V2/api + api-contract (contract-only until needed)
```

## Pass order

1. **Skill truth** — this skill + companions (**done**)
2. **Wire** — `/afenda-elite-api-contract` + Actions / handlers
3. **UI** — `/afenda-elite-frontend-scaffold` + `features/*`
4. **Residue Pass 2** — **done** 2026-07-12
5. **Platform copy port + entry/org-admin absorb** — **done** 2026-07-12
6. **Playground harness absorb** — **done** 2026-07-12 (`features/playground`; `lib/` gone); **harness removed** 2026-07-15 — do not handroll; Studio MCP for any return

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
| Route stubs / wipe FE | `/afenda-elite-frontend-scaffold` |
| ActionResult / brands / api-now | `/afenda-elite-api-contract` |
| FFT product UI / gates / registry | `/feed-farm-trade` (ops facts in that farm — Living FFT-MOD bodies dormant) |

## Verify backend modules

- [ ] On Target checkout: [module-tree.md](module-tree.md) matches `apps/web/modules`
- [ ] Docs-first checkout: absent product roots are expected — do not recover Collapse trees
- [ ] No fifth bounded context / `modules/trade/` without ADR
- [ ] `lib/` is absent (no `entry|pages|playground|domain|schemas|auth|copy|utils|format`)
- [ ] New domain/schema file sits in exactly one context; tenant entrypoints take explicit `orgId`
- [ ] Actions listed in [adapter-map.md](adapter-map.md) match on-disk Actions when present
- [ ] Route Handlers match api-now (four trees only unless catalog updated)
- [ ] No `from "@/modules/declarations` inside `modules/fft` (domain or schemas)
- [ ] Shared Zod / `parseSchema` imported from `@/modules/platform/schemas/common` at Action edge
- [ ] FFT UI: HITL `ui-registry.json` + Living `apps/web/features/fft` paths when touching FFT UI (package `check:fft-ui-registry*` removed)
- [ ] Zod at adapter edge; domain has no duplicate DTO Zod for the same input
