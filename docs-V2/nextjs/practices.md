# Practices (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/practices.md` |
| Authority | **Scratch** — Accelint order in nextjs skill + coding-discipline |
| Updated | 2026-07-19 |

---

## Accelint priority

| # | Topic | Do |
|---|--------|-----|
| 1 | Security | Session + authz + Zod inside every mutating Action / RH |
| 2 | Waterfalls | Start independent work early; `Promise.allSettled` when independent |
| 3 | Serialization | Pass only fields the client uses; ISO strings over `Date` |
| 4 | Suspense | Stream secondary panels; wrap `useSearchParams` |
| 5 | `React.cache()` | Per-request dedupe; primitive keys only |
| 6 | `after()` | Audit/log after response |
| 7 | Imports | No mega barrels; `next/dynamic` for heavy UI |

---

## Hard stops

- Collapse / legacy tree recover without named approval  
- Action without in-action auth / authz / Zod  
- Layout / `proxy` as sole mutation protection  
- Product `'use cache'` / `cacheComponents` without explicit Mode B authorization  
- `force-static` on session-varying data  
- Async `"use client"` · non-serializable RSC→client props  
- `page` + `route` same directory  
- Swallowing `redirect` / `notFound`  
- Sequential awaits of independent work  
- Inline object keys to `React.cache()`  
- Mega barrel icon/UI imports  
- `middleware.ts`  
- Neon Auth → Clerk swap  
- RSC `fetch('/api/...')` for ordinary same-origin reads  
- Product-path `any` / unearned `as`  
- Tutorial `{ success, data }` instead of `ActionResult`  
- Skip MCP `get_errors` after App Router product edits  

---

## Audit scorecard

| # | Topic | Target |
|---|--------|--------|
| 1 | Folders | [folders.md](folders.md) |
| 2 | Thin pages | RSC + `features/*` |
| 3 | Data pattern | [data.md](data.md) |
| 4 | No self `/api` hop | Prefer loaders |
| 5 | UI barrel | `@afenda/ui-system` |
| 6 | Routes | [routes.md](routes.md) ⊆ MCP |
| 7 | Session trees | Not `force-static` |
| 8 | In-action auth | Required |
| 9 | `error.tsx` | `'use client'` |
| 10 | Async params/cookies/headers | Awaited |
| 11 | `proxy.ts` | No `middleware.ts` |
| 12 | RH coexistence | No page+route colocated |
| 13 | Runtime | Node default |
| 14 | Cache mode | Request-time default; `'use cache'` off |
| 15 | MCP | `get_errors` clean (product edits) |
| 16 | Auth vendor | Neon Auth |

---

## Verify

```text
nextjs_index → get_routes → get_errors
```

Product/package edits also: scoped `pnpm typecheck` / `pnpm lint` when code changed.

Companion: [../discipline/README.md](../discipline/README.md) for TS hygiene floor.
