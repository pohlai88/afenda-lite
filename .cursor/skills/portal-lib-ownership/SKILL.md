---
name: portal-lib-ownership
description: >-
  Owns the Client Declaration Portal lib/ → modules/ relocate map. Assigns every
  lib/ path to Platform, Identity, Declarations, Trade, or FE-retire. Use when
  adding files under lib/, relocating domain code, choosing a bounded context,
  or when the user mentions lib ownership, modules/, or fat lib cleanup.
---

# Portal `lib/` ownership

**SSOT doc:** [doc/backend/06-lib-ownership.md](../../../doc/backend/06-lib-ownership.md)  
**Contexts:** [doc/backend/02-bounded-contexts.md](../../../doc/backend/02-bounded-contexts.md)  
**Full path tables:** [inventory.md](inventory.md)

`lib/` is a **transitional bin**. Do not treat it as Next.js best practice. Target:

```text
modules/{platform,identity,declarations,trade}/
```

Adapters stay in `app/actions`, `app/api`, thin `app/**/page.tsx`.

## Before adding or moving a file

1. Pick **exactly one** context (table below).  
2. If it needs two contexts → compose at the **adapter**, do not merge domains.  
3. Prefer the future `modules/<context>/` path when creating **new** domain/schema code after a context has started relocating.  
4. Do **not** add greenfield UI runners under `lib/pages` or `lib/entry` — use `features/*` (`/portal-frontend-scaffold`).  
5. Do **not** mix a `lib/` relocate into Hot Sales flag / gate-register work.

## Context cheat sheet

| Context | Owns | Must not import |
|---------|------|-----------------|
| **Platform** | `modules/platform/**` (relocated); shims `lib/utils`, `lib/format` only | Product domain rules |
| **Identity** | `modules/identity/**` (relocated) | Declarations domain, Trade domain |
| **Declarations** | `modules/declarations/**` (relocated); Trade stays `lib/domain/trade` | Trade |
| **Trade** | `modules/trade/**` (relocated) | Declarations |
| **FE-retire** | **Removed** — do not recreate under `lib/`. UI → `features/*` | — |

## Hard rules

1. **Trade ↛ Declarations** (and reverse).  
2. Ports never import `Request` / `next/headers` / UI.  
3. Zod at adapter edge; domain trusts parsed types (`/portal-api-contract`).  
4. One relocate PR = one context. Update [06-lib-ownership.md](../../../doc/backend/06-lib-ownership.md) if the map changes.  
5. Re-scan `lib/` before a large move (~287 files at last snapshot).

## Relocate order

1. Platform → 2. Identity → 3. Declarations → 4. Trade — **relocated 2026-07-11**.  
5. FE-retire — **deleted 2026-07-11**. Remaining `lib/`: `utils`/`format` shims only.

## Cross-skills

| Need | Skill |
|------|-------|
| Route Handlers / ActionResult / brands | `/portal-api-contract` |
| App Router stubs / wipe FE | `/portal-frontend-scaffold` |
| Generic API principles | `api-and-interface-design` |

## Checklist

- [ ] New file has a single context owner  
- [ ] No Trade ↔ Declarations import  
- [ ] Not dumping UI into `lib/pages` / `lib/entry`  
- [ ] Schemas colocated with owning context  
- [ ] Doc `06-lib-ownership.md` still accurate after the change  
