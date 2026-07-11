---
name: portal-frontend-scaffold
description: >-
  Greenfield Next.js App Router frontend scaffold for Client Declaration Portal.
  Enforces Next.js 15+/16 conventions, async params, hardened route/API boundaries,
  branded resource IDs, wipe rules, and stub-only pages. Use when scaffolding
  frontend, wiping product UI, adding app/ routes, naming [param] segments,
  designing FE↔BE contracts, or when the user mentions greenfield FE, clean
  frontend scaffold, or portal frontend structure.
---

# Portal frontend scaffold

**SSOT for this program.** Shape `app/` from backend resources + this skill. Do not invent routes or restore tombstones.

| Doc                                    | Purpose                                        |
| -------------------------------------- | ---------------------------------------------- |
| [route-tree.md](route-tree.md)         | Exact folders + URL checklist                  |
| [stubs.md](stubs.md)                   | Stub templates (layout / error / page)         |
| [boundaries.md](boundaries.md)         | FE↔BE contracts, branded IDs, validation edges |
| [wipe-inventory.md](wipe-inventory.md) | Complete DELETE / REPLACE / KEEP file list     |
| [doc/api/](../../../doc/api/)          | Error shape, REST catalog, types               |

## Agent operating rules

1. **Surface assumptions** before wipe/scaffold if anything conflicts with this skill — stop and ask.
2. **Scope:** scaffold PR = tree + stubs only. No domain wiring, no e2e fixes, no `lib/` relocate, no AdminCN demos.
3. **Simplicity:** thin `page.tsx`; UI in `features/*`; no clever route abstractions.
4. **Verify** with the checklist below — “looks right” is not done.
5. **Push back** on overloaded `[id]`, `fetch('/api')` for RSC reads, or growing `lib/`.

## Hard rules

1. **Scaffold ≠ wire.** No `@/lib/**`, `@/app/actions`, `@/lib/pages`, `@/lib/entry`, `@/lib/domain` in stub pages.
2. **Descriptive params only** — never overloaded `[id]` (table below).
3. **`lib/` is a bin.** Not Next.js best practice. Post-FE → `modules/{identity,declarations,trade,platform}`.
4. **No root `components/` restore.** Product UI → `features/*`.
5. **Next 16:** `proxy.ts` only — never new `middleware.ts`.
6. **Never** `page.tsx` + `route.ts` in the same segment.
7. **No** parallel/intercepting routes in v1. No `template.tsx` / `default.tsx` unless required later.
8. **Node runtime default.** No `runtime = 'edge'` on product pages.
9. **One-version contracts.** Route param names = brand names = Zod field names (`declarationId`, not `id` vs `surveyId` drift). See [boundaries.md](boundaries.md).

## Wipe vs leave

| Wipe / replace                                  | Leave (stubs must not import)                      |
| ----------------------------------------------- | -------------------------------------------------- |
| Product `app/**` pages, layouts, loading, error | `app/api/**`, `app/actions/**`                     |
| `features/**` implementations                   | entire `lib/**` until modules pass                 |
| `portal-views/**` product screens               | `db/**`, `proxy.ts`, `messages/trade/**`, `doc/**` |

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
Draft XHR / auth / health / webhook? → Route Handler
External/mobile REST?  → Route Handler per doc/api (contract-only until needed)
```

## Dynamic params (exact)

| Segment / query   | Path                              | Brand (wire)               |
| ----------------- | --------------------------------- | -------------------------- |
| `[path]`          | `/auth/[path]`, `/account/[path]` | AuthPath / AccountPath     |
| `[...path]`       | `/api/auth/[...path]` only        | —                          |
| `[token]`         | `/invite/[token]`                 | InviteToken                |
| `[token]`         | `/f/[token]`                      | ShareToken                 |
| `[slug]`          | `/survey/[slug]`                  | SurveySlug                 |
| `[declarationId]` | `/dashboard/[declarationId]`      | DeclarationId              |
| `[assignmentId]`  | `/client/declare/[assignmentId]`  | AssignmentId               |
| `[locale]`        | `/trade/[locale]/…`               | TradeLocale (`vi` \| `en`) |
| `[eventId]`       | `…/events/[eventId]/…`            | TradeEventId               |
| `[screenId]`      | `/playground/[screenId]`          | PlaygroundScreenId         |
| `invitationId`    | `/join` searchParams              | InvitationId               |

**Forbidden:** `/dashboard/[id]`, `/client/declare/[id]`, mixing brands as raw `string` across ports when wiring.

## `features/` modules

```text
features/{landing,auth,account,operator,client-workspace,portal-chrome,trade}/
```

`app/**/page.tsx` composes only. Prefer `features/` over `app/_components/` for product UI.

## Pass order

1. **Scaffold** — this skill (tree + stubs)
2. **UI** — `features/*` shells
3. **Wire** — boundaries.md + Zod + ActionResult
4. **Decompose `lib/`** → `modules/*`

## Forbidden

- Tombstone restore / journey reopen instead of greenfield
- RSC `fetch('/api/...')` for ordinary product reads
- New REST list endpoints for web UI (use RSC → port)
- Sync params, server `error.tsx`, Edge product pages
- Growing fat `lib/` as the architecture
- Divergent param names vs schema fields vs brands

## Verify scaffold

- [ ] [route-tree.md](route-tree.md) complete with stub pages
- [ ] Root + global-error have html/body; every error file is client
- [ ] All dynamic pages: `params: Promise<{…}>` + await
- [ ] `/join` types invitationId searchParams
- [ ] No overloaded `[id]`; names match brand table
- [ ] No stub imports from `@/lib/**` or `@/app/actions`
- [ ] No page+route colocation; api/actions untouched
- [ ] Typecheck clean; no `runtime = 'edge'` on pages
