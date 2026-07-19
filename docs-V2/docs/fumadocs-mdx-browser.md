# Fumadocs MDX — Browser Entry (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-browser.md` |
| Authority | **Scratch** — upstream [Browser Entry](https://fumadocs.dev/docs/mdx/entry/browser) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `collections/browser` · no `createClientLoader` |
| Audience | Engineers evaluating non-RSC / client-side MDX collection loading |
| Updated | 2026-07-19 |

Upstream `collections/browser` exposes doc/docs collections for **browser/client** environments via async imports + `createClientLoader` / `preload` / `useContent`.

Lite keeps **RSC + Server Entry** — [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md). Upstream recommends RSC whenever possible to avoid hydration cost; Lite follows that.

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Page render | RSC `page.data.body` as component — [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) |
| No `collections/browser` | Absent from `lib/**` · `app/**` · `components/**` |
| No `createClientLoader` / `clientLoader.preload` / `useContent` | Absent |
| No TanStack Start / React Router docs routes | Docs app is Next App Router only — [fumadocs-mdx-next.md](fumadocs-mdx-next.md) |
| Client islands | Feedback / OpenAPI UI / ImageZoom — **not** browser collection loaders |

Wire test enforces absences. Active path: [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [next.md](next.md).

---

## Why not Browser Entry (Lite)

| Upstream | Lite |
|----------|------|
| Non-RSC frameworks (TanStack Start · React Router) | Next App Router RSC |
| `createClientLoader` + path preload | Sync `page.data.body` on server |
| Avoid shipping full MDX to client via hydration | RSC already streams compiled body |
| Only doc/docs on browser | N/A — no browser entry |

---

## Upstream ladder (reference only)

Do **not** paste into Lite without a named Docs Browser Entry reopen + Scratch update.

```tsx
// Upstream — NOT Lite
import browserCollections from "collections/browser";

const clientLoader = browserCollections.docs.createClientLoader({
  component({ frontmatter, default: MDX }) {
    return (
      <div className="prose">
        <h1>{frontmatter.title}</h1>
        <MDX />
      </div>
    );
  },
});

// server returns page.path → clientLoader.preload(path) → useContent(path)
```

TanStack Start / React Router examples in upstream docs assume non-RSC routers — out of scope for `@afenda/docs`.

---

## When reopen is allowed

Explicit Docs Fumadocs MDX Browser Entry reopen must cover:

1. Why RSC `page.data.body` is insufficient (named non-RSC surface or hybrid)
2. Coexistence with Server Entry + OpenAPI preload + Feedback
3. Search / LLM / OG still keyed off server `source`
4. Wire tests + update [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · this chapter

Until then: do **not** import `collections/browser` or add `createClientLoader`.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| `import … from "collections/browser"` | Client collection entry |
| `createClientLoader` / `useContent` / `preload` | Non-RSC page contract |
| TanStack / React Router docs page for MDX | Wrong framework |
| Using browser entry “for performance” on Next RSC | Prefer RSC — upstream guidance |

---

## Verify

```text
1. No collections/browser under apps/docs lib · app · components
2. No createClientLoader · useContent · clientLoader.preload
3. Docs page: source.getPage · page.data.body (RSC)
4. Wire test: Fumadocs MDX Browser Entry Outside lock
```

Companion: [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [fumadocs-mdx-next.md](fumadocs-mdx-next.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [next.md](next.md) · [loader-api.md](loader-api.md).
