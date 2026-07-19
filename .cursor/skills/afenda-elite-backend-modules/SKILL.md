---
name: afenda-elite-backend-modules
description: >-
  Afenda Elite backend modules SSOT — modules/{platform,identity},
  ports/adapters, Pass-2 residue, shared Platform Zod. Use when adding domain/schema
  under modules/, relocating lib residue, choosing a bounded context,
  or when the user mentions afenda-elite-backend-modules,
  lib ownership, or modular monolith backend.
---

# Afenda Elite — backend modules

**SSOT for this program.** Shape domain work from this skill + companions + disk `apps/web/modules/**` + Scratch [`docs-V2/api`](../../../docs-V2/api/README.md). Do not grow `lib/` as architecture. Cite `term.afenda-elite`. Living `docs/architecture` / `docs/api` bodies are dormant — operative ARCH facts live in companions.

**Removed (nuclear wipe):** Declarations (`modules/declarations`) and Feed Farm Trade (`modules/fft`) product modules — do not recreate. Living contexts = **platform + identity** only.

```text
LOAD:
  companions: module-tree.md · context-boundaries.md · adapter-map.md · residue-inventory.md · completeness.md
  apps/web/modules/** · apps/web/features/**   # disk honesty
  docs-V2/api/README.md · rest.md · actions.md # HTTP / Action Scratch
SKIP:
  Living docs/architecture · docs/api as required LOAD
  recreating lib/ · modules/trade/ · modules/declarations/ · modules/fft/ · Collapse root recover
VERIFY:
  Test-Path apps/web/modules · companion checklists
```

| Doc | Purpose |
|-----|---------|
| [module-tree.md](module-tree.md) | Target / logical L2 inventory — not docs-first disk SSOT |
| [context-boundaries.md](context-boundaries.md) | Living import bans, port isolation, wiped-domain footnotes |
| [adapter-map.md](adapter-map.md) | Action / Route Handler → module entrypoints |
| [residue-inventory.md](residue-inventory.md) | Pass 2 + full runner absorb — `lib/` gone; runners under `features/` |
| [completeness.md](completeness.md) | Plan ↔ codebase matrix for this program |
| [docs-V2/api/](../../../docs-V2/api/) | Error shape, RH allowlist, Actions Scratch |
| [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) | Brands · envelopes · OpenAPI |

## Target tree + docs-first checkout

| Surface | Authority |
|---------|-------------|
| Target physical home | `apps/web/modules/{platform,identity}` (see [module-tree](module-tree.md)) |
| This checkout | Root `modules/` / `app/` may be **absent by design** (ARCH-028 — Collapse ban); Target under `apps/web` is present |
| Packages | Exactly the ARCH-024 named set under Target; no new `packages/*` or `apps/*` without a preceding ADR |
| Contaminations ban | Do not recover wiped Collapse roots or wiped Declarations/FFT trees from git — including `git show` mining — unless the user explicitly names that recovery in this turn |

Logical shape in companions may say `modules/*` — physical Target path is under `apps/web`.

### Bounded contexts (locked)

Only **Platform · Identity**. Declarations and Trade (`fft`) are **removed** (not frozen). Inventing Sales/Purchasing/Inventory/Finance/Payments contexts (or `modules/trade/` / recreating wiped domains) requires a controlled ADR first — scratch ERP requirements cannot authorize them.

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
5. **Push back** on `lib/domain` recreation, RSC `fetch('/api')` for ordinary reads, `modules/trade/`, wiped Declarations/FFT trees, or new bounded contexts without ADR.

## Hard rules

1. **Modules are SSOT (when product exists)** — domain / Zod / Neon Auth under Target `apps/web/modules/{platform,identity}` (logical `modules/*`). Do not grow `lib/` as architecture. Docs-first: trees may be absent — do not recover Collapse roots.
2. **Adapters stay thin** — Target `apps/web/app/actions/*`, `app/api/*`, thin pages / runners; no SQL in adapters.
3. **Ports never import** `Request`, `next/headers`, or UI.
4. **One context per new file** — compose two contexts only at the adapter.
5. **No Trade / Declarations product paths** — never create `modules/trade/`, `modules/fft/`, `modules/declarations/`, or matching `features/*` product trees.
6. **Validate once at adapter** — product Zod in owning context schemas; **shared** primitives from Platform `schemas/common` only.
7. **Decision tree (ARCH-013 operative):** RSC read → domain port; client mutation → Server Action → Zod → port → ActionResult; auth / health / webhook → Route Handler; external REST → RH per api-contract (contract-only until needed). Do not paste a second copy.
8. **Contract** — errors / brands / REST live in [`afenda-elite-api-contract`](../afenda-elite-api-contract/SKILL.md) + `docs-V2/api`; this skill does not restate error tables.
9. **Residue program** — do not recreate `lib/`; historical absorb targets are under Target `features/` ([residue-inventory.md](residue-inventory.md)).

## Context cheat sheet

| Context | Owns | Must not import |
|---------|------|-----------------|
| **Platform** | `modules/platform/**` (incl. `schemas/common`, `normalize-email`, `copy`) | Product domain rules for removed modules |
| **Identity** | `modules/identity/**` | Wiped Declarations / FFT trees |
| **FE runners** | Target: `features/{auth,org-admin}` (+ portal-chrome / landing as present) | Domain SQL / copy SSOT (those live in `modules/`) |
| **Declarations** *(removed)* | — | Do not recreate |
| **Trade / FFT** *(removed)* | — | Do not recreate |

## Data adapters (wire)

```text
RSC read?              → modules/*/domain directly (never fetch own /api)
Client mutation?       → Server Action → Zod → port → ActionResult
Auth / health / webhook? → Route Handler
External/mobile REST?  → Route Handler per docs-V2/api + api-contract (contract-only until needed)
```

## Pass order

1. **Skill truth** — this skill + companions (**done**)
2. **Wire** — `/afenda-elite-api-contract` + Actions / handlers
3. **UI** — `/afenda-elite-frontend-scaffold` + `features/*`
4. **Residue Pass 2** — **done** 2026-07-12
5. **Platform copy port + entry/org-admin absorb** — **done** 2026-07-12
6. **Playground harness absorb** — **done** 2026-07-12 (`features/playground`; `lib/` gone); **harness removed** 2026-07-15 — do not handroll; Studio MCP for any return
7. **Domain wipe** — Declarations + FFT product modules **removed** (governance E9)

## Forbidden

- Recreating `lib/` (any drawer), `lib/domain`, `lib/schemas`, `lib/env`, `lib/routing`, `lib/auth`, `lib/copy`
- Creating `modules/trade/`, `modules/fft/`, `modules/declarations/`, or matching product `features/*`
- RSC `fetch('/api/...')` for ordinary product reads
- New REST list endpoints for web UI (use RSC → port)
- Divergent Action vs HTTP business logic for the same use-case
- Teaching Declarations/FFT as living modules or “frozen until reopen”

## Cross-skills

| Need | Skill |
|------|-------|
| Route stubs / wipe FE | `/afenda-elite-frontend-scaffold` |
| ActionResult / brands / api-now | `/afenda-elite-api-contract` |
| Tenancy / hard org roots | `/neon-tenancy-efficiency` |

## Verify backend modules

- [ ] On Target checkout: [module-tree.md](module-tree.md) matches `apps/web/modules`
- [ ] Docs-first checkout: absent product roots are expected — do not recover Collapse trees
- [ ] No fifth bounded context / `modules/trade/` / wiped Declarations/FFT without ADR + named approval
- [ ] `lib/` is absent
- [ ] New domain/schema file sits in exactly one living context; tenant entrypoints take explicit `orgId`
- [ ] Actions listed in [adapter-map.md](adapter-map.md) match on-disk Actions when present
- [ ] Route Handlers match api-now (health / auth / session — no declaration-draft)
- [ ] Shared Zod / `parseSchema` imported from `@/modules/platform/schemas/common` at Action edge
- [ ] Zod at adapter edge; domain has no duplicate DTO Zod for the same input
