# Fumadocs MDX — Performance (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-performance.md` |
| Authority | **Scratch** — upstream [Performance](https://fumadocs.dev/docs/mdx/performance) · [Lazy Loading](https://fumadocs.dev/docs/mdx/async) · disk `@afenda/docs` |
| Status | **Active** — bundler / sync Fumadocs MDX · image static imports · no lazy/dynamic cutover |
| Audience | Engineers worried about MDX build memory or considering on-demand compile |
| Updated | 2026-07-19 |

Fumadocs MDX is a **bundler plugin** (higher compile bottleneck than a pure runtime loader). With Webpack / Turbopack it is enough for ~500+ MDX files for most sites. Lite’s tree is far smaller — stay on the sync bundler path.

Getting Started: [fumadocs-mdx.md](fumadocs-mdx.md). Next.js wire: [fumadocs-mdx-next.md](fumadocs-mdx-next.md). Images: [remark-image.md](remark-image.md). Alternatives Outside: [mdx-remote.md](mdx-remote.md) · [content-source.md](content-source.md) custom remote.

---

## Lite lock (configured)

| Topic | Lite |
|-------|------|
| Compile model | Sync precompile via `fumadocs-mdx` + Next `createMDX()` |
| Dev / build | Turbopack-capable Next app — stock bundler path |
| MDX scale (approx.) | Small `content/docs/**` set (≪ 500) — no performance reopen |
| Image optimization | Default `remarkImage` → static imports / sizes · UI `ImageZoom` — [remark-image.md](remark-image.md) |
| `docs.async: true` | **Outside baseline** |
| `docs.dynamic: true` | **Outside baseline** — [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) |
| `collections/dynamic` + `page.data.load()` | **Outside baseline** — [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) |
| Custom remote / on-demand source | **Outside baseline** — [content-source.md](content-source.md) · [mdx-remote.md](mdx-remote.md) |

```ts
// source.config.ts — no async / dynamic flags
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      extractLinkReferences: true,
      includeProcessedMarkdown: true,
    },
  },
});
```

```ts
// lib/source.ts — server entry, not collections/dynamic — fumadocs-mdx-entry.md
import { docs } from "collections/server";
```

Page body stays sync `page.data.body` / `page.data.toc` — not `await page.data.load()`.

---

## Overview (upstream)

| Claim | Lite reading |
|-------|----------------|
| Bundler plugin bottleneck | Accepted — Next owns optimization |
| ~500+ MDX sufficient for most sites | Lite well under that |
| Import client components in MDX | Allowed via bundler; prefer MDX registry — [ui-components.md](ui-components.md) |

---

## Image optimization

Default Remark Image resolves local/public images to static imports so Next Image can optimize:

```mdx
![Hello](./hello.png)
![Hello](/hello.png)
```

Lite: do not disable `useImport` or switch to URL-only images unless a named slice (Dynamic mode forces URL-only — Outside). Zoom: [remark-image.md](remark-image.md) · [ui-components.md](ui-components.md).

---

## Caveats (when scale grows)

Huge MDX trees → high memory in build/dev because bundlers compile/bundle every file. Upstream solutions: on-demand compile.

**Do not** cut over to those on Lite while the tree stays small — you lose build-time bundling (imports in MDX, image static imports, etc.) and must rewrite consumers (`load()`, search indexing, LLM text).

---

## Solutions — Outside baseline

### Remote Source

Custom Loader source that loads content on request (SSG-friendly, no pre-bundle). See [content-source.md](content-source.md) · upstream [Custom Source](https://fumadocs.dev/docs/integrations/content/custom). Trades build speed for loss of bundler optimizations.

### Lazy Loading ([Async](https://fumadocs.dev/docs/mdx/async))

| Mode | Upstream | Lite |
|------|----------|------|
| `async: true` | Async imports / server chunking | Outside — sync `page.data.body` |
| `dynamic: true` | On-demand compile · `collections/dynamic` · `load()` | Outside — [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) |
| Third-party search for massive indexes | Suggested with lazy modes | Lite keeps Orama `createFromSource` — [search-orama.md](search-orama.md) |

When a named Docs MDX-performance reopen lands, update this pack + [fumadocs-mdx.md](fumadocs-mdx.md) · [loader-source.md](loader-source.md) · wire tests + every `page.data.body` call site.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| `async: true` / `dynamic: true` on `defineDocs` | Changes page data contract |
| `collections/dynamic` · `page.data.load()` | Dynamic entry cutover — [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) |
| Remote custom source for “faster builds” | Dual pipeline · loses bundler opts |
| Premature lazy mode on a small tree | Complexity without need |

---

## Verify

```text
1. source.config.ts: defineDocs · no async: / dynamic: true
2. lib/source.ts: collections/server · not collections/dynamic
3. docs page: page.data.body · page.data.toc · no .load()
4. remark-image defaults + ImageZoom — remark-image.md
5. Wire test: Fumadocs MDX Performance lock
6. Spot-check content/docs file count stays well under hundreds before reopening lazy modes
```

Companion: [fumadocs-mdx.md](fumadocs-mdx.md) · [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) · [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [remark-image.md](remark-image.md) · [mdx-plugins.md](mdx-plugins.md) · [content-source.md](content-source.md) · [mdx-remote.md](mdx-remote.md) · [search-orama.md](search-orama.md) · [next.md](next.md).
