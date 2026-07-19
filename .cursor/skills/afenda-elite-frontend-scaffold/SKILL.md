---
name: afenda-elite-frontend-scaffold
description: >-
  Greenfield Next.js App Router frontend scaffold for Afenda Elite.
  Enforces Next.js 15+/16 conventions, async params, hardened route/API boundaries,
  branded resource IDs, wipe rules, and stub-only pages. Use when scaffolding
  frontend, wiping product UI, adding app/ routes, naming [param] segments,
  designing FE↔BE contracts, or when the user mentions greenfield FE, clean
  frontend scaffold, or afenda-elite-frontend-scaffold.
---

# Afenda Elite — frontend scaffold

**SSOT for this program.** Shape `app/` from backend resources + this skill. Do not invent routes or restore tombstones. Cite `term.afenda-elite` — see glossary register.

| Doc                                    | Purpose                                        |
| -------------------------------------- | ---------------------------------------------- |
| [completeness.md](completeness.md) | Plan ↔ codebase matrix |
| [route-tree.md](route-tree.md)         | Exact folders + URL checklist                  |
| [stubs.md](stubs.md)                   | Stub templates (layout / error / page)         |
| [boundaries.md](boundaries.md)         | FE↔BE contracts, branded IDs, validation edges |
| [wipe-inventory.md](wipe-inventory.md) | Complete DELETE / REPLACE / KEEP file list     |
| [docs-V2/api/](../../../docs-V2/api/) · [api-contract](../afenda-elite-api-contract/SKILL.md) | Error shape, REST allowlist, types |
| Companions + [nextjs-best-practice](../afenda-elite-nextjs-best-practice/SKILL.md) | Routes, BFF tree, App Router mechanics |
| ADR-010 (operative) | UI primitives: `@afenda/ui-system` barrel + `styles.css` only; no handroll under `apps/web/components` |
| [afenda-elite-ui-compose](../afenda-elite-ui-compose/SKILL.md) | Before product UI body in `features/*` / visible pages: load compose consistency lock (QUALITY ORDER incl. SCALABILITY-FIRST / UI-CAP-*; type/spacing/radius/color); this farm owns routes/scaffold shape only |

## Agent operating rules

1. **Surface assumptions** before wipe/scaffold if anything conflicts with this skill — stop and ask.
2. **Scope:** scaffold PR = tree + stubs only. No domain wiring, no e2e fixes, no `lib/` residue prune, no AdminCN demos.
3. **Simplicity:** thin `page.tsx`; UI in `features/*`; no clever route abstractions.
4. **Verify** with the checklist below — “looks right” is not done. Browser-visible UI turns must import primitives only from `@afenda/ui-system` (ADR-010 barrel-only boundary; committed `ui-boundary` test enforces it).
5. **Push back** on overloaded `[id]`, `fetch('/api')` for RSC reads, or growing `lib/` with domain code.

## Hard rules

1. **Scaffold ≠ wire.** No `@/lib/**`, `@/app/actions`, `@/lib/pages`, `@/lib/entry`, `@/modules/**` domain in stub pages.
2. **Descriptive params only** — never overloaded `[id]` (table below).
3. **`lib/` is gone.** Domain/Zod/env live under `modules/{platform,identity}`. Runners live under `features/{auth,org-admin}` (+ portal-chrome / landing as present). Do not recreate `lib/` or wiped Declarations/FFT trees. See `/afenda-elite-backend-modules`.
4. **No root `components/` restore.** Product UI → `features/*`.
5. **No Collapse / wiped-domain recovery.** Never restore banned trees or Declarations/FFT product modules from git — including `git show` as a seed — unless the user explicitly names that recovery in this turn (ARCH-028).
6. **Next 16:** `proxy.ts` only — never new `middleware.ts`.
7. **Never** `page.tsx` + `route.ts` in the same segment.
8. **No** parallel/intercepting routes in v1. No `template.tsx` / `default.tsx` unless required later.
9. **Node runtime default.** No `runtime = 'edge'` on product pages.
10. **One-version contracts.** Route param names = brand names = Zod field names. See [boundaries.md](boundaries.md).

## Wipe vs leave

| Wipe / replace                                  | Leave (stubs must not import)                      |
| ----------------------------------------------- | -------------------------------------------------- |
| Product `app/**` pages, layouts, loading, error | `app/api/**`, `app/actions/**`                     |
| `features/**` implementations                   | `modules/**` (wire pass) |
| `portal-views/**` product screens               | `db/**`, `proxy.ts`, `doc/**` |

## Next.js conventions (scaffold)

| Concern                          | Rule                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| Root layout                      | Must include `<html>` + `<body>`                             |
| Segment layout                   | `children` only — no nested html/body                        |
| `params` / `searchParams`        | Always `Promise<…>` + `await`                                |
| `error.tsx` / `global-error.tsx` | `'use client'`; global-error owns html/body                  |
| `loading.tsx`                    | Instant fallback — no fetch                                  |
| `route.ts`                       | Only under `app/api/**`                                      |
| RSC                              | Never `'use client'` + `async`; pages stay Server Components |
| `/join`                          | `searchParams: Promise<{ invitationId?: string }>`           |

Templates: [stubs.md](stubs.md).

### Data adapters (wire pass — not scaffold)

```text
RSC read?              → module port directly (never fetch own /api)
Client mutation?       → Server Action → Zod → port → ActionResult
Auth / health / webhook? → Route Handler
External/mobile REST?  → Route Handler per docs-V2/api + api-contract (contract-only until needed)
```

Decision tree SSOT (ARCH-013 operative): RSC → domain; mutation → Action; auth/health → RH — see [boundaries.md](boundaries.md) + api-contract.

## Dynamic params (exact)

| Segment / query   | Path                              | Brand (wire)               |
| ----------------- | --------------------------------- | -------------------------- |
| `[path]`          | `/auth/[path]`, `/account/[path]` | AuthPath / AccountPath     |
| `[...path]`       | `/api/auth/[...path]` only        | —                          |
| `[userId]`        | org-admin users routes when present | UserId (wire pass)       |
| `invitationId`    | `/join` searchParams              | InvitationId               |

**Removed routes (nuclear wipe — do not scaffold as living):** `/client/declarations`, `/client/declare/*`, `/fft/**`, `/survey/*`, `/f/*`, declaration-draft RH params.

**Forbidden:** overloaded `[id]` params; mixing brands as raw `string` across ports when wiring; recreating wiped Declarations/FFT product routes.

## `features/` modules

```text
Target living: features/{auth,org-admin}/
Optional present: landing, portal-chrome
Removed: declarations, fft, playground
  — Living docs may still say organization-admin; Target physical folder is org-admin
```

`app/**/page.tsx` composes only. Prefer `features/` over `app/_components/` for product UI. `CLIENT_HOME` = `/client` (workspace shell — not Declarations product).

## Pass order

1. **Scaffold** — this skill (tree + stubs)
2. **UI** — `features/*` shells
3. **Wire** — boundaries.md + Zod + ActionResult + `/afenda-elite-api-contract`
4. **Modules** — relocate **complete**; residue Pass 2 via `/afenda-elite-backend-modules`

## Forbidden

- Tombstone restore / journey reopen instead of greenfield
- RSC `fetch('/api/...')` for ordinary product reads
- New REST list endpoints for web UI (use RSC → port)
- Sync params, server `error.tsx`, Edge product pages
- Growing fat `lib/` as the architecture (domain belongs in `modules/*`)
- Divergent param names vs schema fields vs brands
- Creating `modules/trade/`, `modules/fft/`, `modules/declarations/`, or matching product `features/*`

## Cross-skills

| Need | Skill |
|------|-------|
| ActionResult / brands / api-now | `/afenda-elite-api-contract` |
| Modules / ports / residue | `/afenda-elite-backend-modules` |

## Verify scaffold

- [ ] [route-tree.md](route-tree.md) complete with stub pages
- [ ] Root + global-error have html/body; every error file is client
- [ ] All dynamic pages: `params: Promise<{…}>` + await
- [ ] `/join` types invitationId searchParams
- [ ] No overloaded `[id]`; names match brand table
- [ ] No stub imports from `@/lib/**`, `@/app/actions`, or `@/modules/**`
- [ ] No page+route colocation; api/actions untouched
- [ ] Typecheck clean; no `runtime = 'edge'` on pages
