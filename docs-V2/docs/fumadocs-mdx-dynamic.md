# Fumadocs MDX — Dynamic Entry (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-dynamic.md` |
| Authority | **Scratch** — upstream [Dynamic Entry](https://fumadocs.dev/docs/mdx/entry/dynamic) · [Lazy Loading / Dynamic mode](https://fumadocs.dev/docs/mdx/async) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `collections/dynamic` · no `docs.dynamic: true` · no `page.data.load()` |
| Audience | Engineers evaluating on-demand MDX compilation |
| Updated | 2026-07-19 |

Upstream Dynamic Entry mirrors Server Entry output, but compiled properties load via `load()` after enabling **dynamic mode** on docs/doc collections.

Lite stays on **sync Server Entry** — [fumadocs-mdx-server.md](fumadocs-mdx-server.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Entry | `collections/server` only — [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) |
| `docs.dynamic: true` / `docs.async: true` | Absent in [`source.config.ts`](../../apps/docs/source.config.ts) |
| `import { docs } from "collections/dynamic"` | Absent |
| Page body | Sync `page.data.body` / `page.data.toc` — not `await page.data.load()` |
| Blog `doc` collection via dynamic | Outside — [loader-source.md](loader-source.md) |

Wire test enforces absences. Active path: [fumadocs-mdx-server.md](fumadocs-mdx-server.md).

---

## Why not Dynamic Entry (Lite)

| Upstream | Lite |
|----------|------|
| On-demand compile for large trees | Small `content/docs/**` — sync bundler fine |
| Same API as server + `load()` | Changes every page call site |
| Trade bundler opts for build memory | Not needed at current scale |
| Images / MDX imports constraints in dynamic mode | Prefer full sync pipeline — [remark-image.md](remark-image.md) |

---

## Upstream ladder (reference only)

Do **not** paste into Lite without a named Docs Fumadocs MDX Dynamic Entry reopen + Scratch update.

```ts
// Upstream — NOT Lite
import { docs } from "collections/dynamic";
import { loader } from "fumadocs-core/source";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

// pages: const { body, toc } = await page.data.load();
```

Requires `dynamic: true` on the collection in `source.config.ts` (see upstream Lazy Loading).

---

## When reopen is allowed

Explicit Docs Fumadocs MDX Dynamic Entry reopen must cover:

1. Measured build/memory evidence that sync bundler is insufficient
2. Cutover of every `page.data.body` / TOC / OpenAPI preload / LLM text site to `load()`
3. Image / import constraints under dynamic mode
4. Coexistence with Orama search + Feedback + OpenAPI
5. Wire tests + update [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · this chapter

Until then: do **not** enable `dynamic: true` or import `collections/dynamic`.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| `dynamic: true` / `async: true` on `defineDocs` | Lazy cutover |
| `collections/dynamic` | Dynamic entry |
| `page.data.load()` | Async body contract |
| Dynamic blog `doc` + `toFumadocsSource(posts, [])` | Extra surface |

---

## Verify

```text
1. source.config.ts: no dynamic: true · no async: true
2. lib/source.ts: collections/server · not collections/dynamic
3. Docs page: page.data.body · no page.data.load()
4. Wire test: Fumadocs MDX Dynamic Entry Outside lock
```

Companion: [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [fumadocs-mdx-server.md](fumadocs-mdx-server.md) · [fumadocs-mdx-browser.md](fumadocs-mdx-browser.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [loader-source.md](loader-source.md) · [next.md](next.md).
