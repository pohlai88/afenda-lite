# App Router audit — Lite scorecard

Run after App Router changes when a Next app is present. **MCP preferred**.

```text
nextjs_index → get_routes → get_errors
```

Docs-first checkout with no product tree: audit Living ARCH only — no invented disk claims (ARCH-028).

Aligned to Vercel `nextjs` + Accelint via [nextjs-conventions.md](nextjs-conventions.md) · [accelint-perf.md](accelint-perf.md).

---

## Scorecard

| # | Topic | Target |
|---|--------|--------|
| 1 | Folder authority | ARCH-017 · ARCH-002 |
| 2 | Thin `page.tsx` | RSC loaders + features |
| 3 | Data pattern | RSC reads · Actions mutations · RH external only |
| 4 | No self `/api` hop from RSC | Prefer loaders |
| 5 | UI home | `features/*` / AdminCN — not root `components/` |
| 6 | Route catalogue | ARCH-012 |
| 7 | Session trees | Not `force-static` |
| 8 | BFF / actions | **In-action** session + org/FFT + Zod (Accelint 2.1) · api-contract |
| 9 | `error.tsx` | `'use client'` · client-safe · no Studio |
| 10 | `global-error.tsx` | Includes `<html>`/`<body>` if present |
| 11 | Nav control flow | Don’t catch redirect/notFound blindly |
| 12 | Suspense | `useSearchParams` wrapped; secondary panels stream |
| 13 | `loading.tsx` | Where segment suspends |
| 14 | Async params/cookies/headers | Always awaited |
| 15 | `proxy.ts` | No new `middleware.ts` |
| 16 | Route Handlers | Named exports · no `page`+`route` colocated |
| 17 | Runtime | Node default |
| 18 | RSC boundaries | No async client · serializable props |
| 19 | Waterfalls | Start early · `Promise.allSettled` (Accelint 1.1–1.2) |
| 20 | Serialization | Minimal props · no dup transforms (2.2–2.3) |
| 21 | `React.cache` keys | Primitives only (2.5) |
| 22 | Bundle | No mega barrels; `next/dynamic` heavy UI (3.1) |
| 23 | `next/image` · `next/font` | When adding media/fonts |
| 24 | Cache Components | Mode A default OFF; Mode B ADR + `org:` tags — [cache-components.md](cache-components.md) |
| 25 | MCP `get_errors` | Clean before done |
| 26 | Tenancy / FFT / auth island | ARCH-023 · ui-registry · CSS split |
| 27 | Anti-contamination | No Collapse recover (incl. `git show` seed) unless user names that recovery this turn |
| 28 | Auth vendor | Neon Auth retained |

---

## P0 blockers

| Issue | Fix |
|-------|-----|
| MCP errors | Fix before claim |
| Async client component | Move fetch to RSC |
| Non-serializable client props | POJO / ISO strings / Actions |
| Studio in error boundaries | Strip |
| Untagged / global tenant cache | Org-scoped tags or stay Mode A |
| `cookies()` inside `'use cache'` | Extract session/org outside; pass args |
| `page` + `route` same folder | Split paths |
| Action without in-function auth | Add session + authz + Zod (2.1) |
| Sequential independent awaits | Start early · `allSettled` (1.1–1.2) |
| Fat RSC→client props | Pass used fields only (2.3) |

---

## Related

- [../SKILL.md](../SKILL.md) · [nextjs-conventions.md](nextjs-conventions.md) · [cache-components.md](cache-components.md) · [accelint-perf.md](accelint-perf.md) · [composition.md](composition.md) · [rendering-caching.md](rendering-caching.md) · [vercel-perf.md](vercel-perf.md) · [runtime-mcp.md](runtime-mcp.md)
