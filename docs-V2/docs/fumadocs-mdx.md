# Fumadocs MDX — Getting Started (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx.md` |
| Authority | **Scratch** — upstream [Fumadocs MDX](https://fumadocs.dev/docs/mdx) · disk `@afenda/docs` |
| Status | **Active** — official content source · `defineDocs` · Next.js |
| Audience | Engineers configuring collections / MDX compile for the docs app |
| Updated | 2026-07-19 |

Fumadocs MDX transforms content into type-safe data (similar role to Content Collections, but **not** that package — [content-collections.md](content-collections.md)). It is a content processing layer for React frameworks, not a full CMS.

Lite uses it as the **only** docs content source under `content/docs/**`. Product adapter map: [content-source.md](content-source.md). Framework shell: [next.md](next.md). Plugins: [mdx-plugins.md](mdx-plugins.md). Loader: [loader-source.md](loader-source.md). Performance / lazy modes: **[fumadocs-mdx-performance.md](fumadocs-mdx-performance.md)**.

---

## Lite lock (configured)

| Topic | Lite |
|-------|------|
| Package | `fumadocs-mdx` on `@afenda/docs` |
| Config | [`source.config.ts`](../../apps/docs/source.config.ts) |
| Collection shape | **`defineDocs`** (`docs` + `meta` combo) — not separate `defineCollections` for the docs tree |
| Dir | `content/docs` |
| Framework install | **Next.js** — [fumadocs-mdx-next.md](fumadocs-mdx-next.md) · `createMDX()` in `next.config.mjs` |
| Vite | **Outside baseline** |
| Runtime Loader (Node.js) | **Active** inventory — [fumadocs-mdx-node.md](fumadocs-mdx-node.md) |
| Access | `collections/server` → `docs.toFumadocsSource()` — [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [fumadocs-mdx-server.md](fumadocs-mdx-server.md) · [loader-source.md](loader-source.md) |
| Generate | `pnpm --filter @afenda/docs generate:source` → `.source/` (gitignored) |
| Performance | Sync bundler · no `async`/`dynamic` — [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · Dynamic Outside [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) |

```ts
// apps/docs/source.config.ts
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      extractLinkReferences: true,
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    providerImportSource: "@/components/mdx",
    remarkPlugins: [[remarkBlockId, { addDataAttribute: "feedback" }]],
  },
});
```

---

## What is a Collection?

| Type | Role | Lite |
|------|------|------|
| `doc` | Compile Markdown/MDX → RSC + TOC, etc. | Via `defineDocs` → `docs` options |
| `meta` | YAML/JSON → data arrays (`meta.json`) | Via `defineDocs` → `meta` options (defaults) |
| `docs` (`defineDocs`) | Combo of `meta` + `doc` for Fumadocs | **Shipped** |

Do **not** replace `defineDocs` with only `defineCollections({ type: 'doc' })` for the official docs tree — page tree + Loader need the docs combo. Extra collections (e.g. blog) require a named Docs multi-collection reopen — [loader-source.md](loader-source.md).

Accessing collection outputs: [loader-api.md](loader-api.md) · upstream [Accessing Collections](https://fumadocs.dev/docs/mdx/entry).

---

## Installation (Lite = Next.js)

| Upstream target | Lite |
|-----------------|------|
| [Next.js](https://fumadocs.dev/docs/mdx/next) | **Active** — [fumadocs-mdx-next.md](fumadocs-mdx-next.md) · UI shell [next.md](next.md) |
| [Vite](https://fumadocs.dev/docs/mdx/vite) | Outside baseline |
| [Runtime Loader](https://fumadocs.dev/docs/mdx/loader) · [Node.js](https://fumadocs.dev/docs/mdx/loader/node) | Active inventory — [fumadocs-mdx-node.md](fumadocs-mdx-node.md) |

---

## Built-in properties (FAQ)

Upstream exports from MDX files by default:

| Property | Lite consumer |
|----------|---------------|
| `frontmatter` | Page title/description via Loader page data / Docs UI |
| `toc` | `page.data.toc` — [get-toc.md](get-toc.md) · [headings.md](headings.md) |
| `structuredData` | Orama search via `createFromSource` — [search-orama.md](search-orama.md) |
| `extractedReferences` | Graph View when `extractLinkReferences: true` — [ui-components.md](ui-components.md) |

Authoring / frontmatter habits: [practices.md](practices.md) · [markdown.md](markdown.md).

---

## Customize frontmatter · MDX compiler

| Knob | Lite |
|------|------|
| Collection `schema` | **Shipped** — stock `pageSchema` / `metaSchema` from `fumadocs-core/source/schema` (no custom Zod extend) — [practices.md](practices.md) |
| Global `defineConfig` | **Shipped** — [fumadocs-mdx-global.md](fumadocs-mdx-global.md) |
| Global `mdxOptions` | **Shipped** via `defineConfig` — [mdx-plugins.md](mdx-plugins.md) · [fumadocs-mdx-global.md](fumadocs-mdx-global.md) |
| Per-collection `mdxOptions` | Outside baseline — keep one global preset |
| Default MDX preset | **Shipped** stock defaults — [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [headings.md](headings.md) · [rehype-code.md](rehype-code.md) · [remark-image.md](remark-image.md) |
| `applyMdxPreset` / collection `mdxOptions` | Outside — [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) |
| `compiler: "satteri"` / `preset: 'minimal'` / workspaces / build-cache | Outside — [fumadocs-mdx-global.md](fumadocs-mdx-global.md) |

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| Vite install | Docs app is Next.js only |
| Node Runtime Loader | Active inventory alongside Next — [fumadocs-mdx-node.md](fumadocs-mdx-node.md) |
| `defineCollections` instead of `defineDocs` for docs | Breaks Fumadocs page tree combo |
| Content Collections cutover | [content-collections.md](content-collections.md) |
| Local Markdown / MDX Remote | [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) |
| Custom Zod `.extend()` on page/meta schemas without reopen | Stock schemas only — [practices.md](practices.md) |
| Second `defineDocs` tree (blog) without reopen | Multi-source — [loader-source.md](loader-source.md) |

---

## Verify

```text
1. package.json: fumadocs-mdx · fumadocs-core · @types/mdx
2. source.config.ts: defineDocs dir content/docs · pageSchema + metaSchema · defineConfig mdxOptions
3. No defineCollections as sole docs collection · no Vite MDX entry
4. next.config.mjs: createMDX from fumadocs-mdx/next
5. lib/source.ts: docs.toFumadocsSource()
6. Wire test: Fumadocs MDX Getting Started lock
7. pnpm --filter @afenda/docs generate:source
```

Companion: [fumadocs-mdx-next.md](fumadocs-mdx-next.md) · [fumadocs-mdx-global.md](fumadocs-mdx-global.md) · [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [fumadocs-mdx-node.md](fumadocs-mdx-node.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [next.md](next.md) · [content-source.md](content-source.md) · [content.md](content.md) · [mdx-plugins.md](mdx-plugins.md) · [loader-source.md](loader-source.md) · [content-collections.md](content-collections.md) · [practices.md](practices.md) · [markdown.md](markdown.md).
