# Fumadocs Core — Source (Loader input) (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/loader-source.md` |
| Authority | **Scratch** — upstream [Source](https://fumadocs.dev/docs/headless/source-api/source) · disk `@afenda/docs` |
| Status | **Active** — single `docs.toFumadocsSource()` |
| Audience | Engineers changing how content files enter `loader()` |
| Updated | 2026-07-19 |

The content loader accepts sources that implement the Loader `source` interface. Parent: [loader-api.md](loader-api.md). Which product adapter (MDX vs CMS): [content-source.md](content-source.md). Plugins: [loader-plugins.md](loader-plugins.md).

---

## Lite lock (configured)

| Shape | Lite |
|-------|------|
| Source count | **One** — Fumadocs MDX `docs` collection |
| Call | `source: docs.toFumadocsSource()` inside `loader({ … })` options |
| Multi-source record | **Outside baseline** |
| Custom `StaticSource` | **Outside baseline** |
| `DynamicSource` + `dynamicLoader` | **Outside baseline** — [local-md.md](local-md.md) · [sanity.md](sanity.md) |
| OpenAPI Virtual Files `staticSource` | **Outside baseline** — [openapi.md](openapi.md) |
| `page.type` branching | **Outside baseline** — single MDX page type |

```ts
// apps/docs/lib/source.ts
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
});
```

OpenAPI pages are **MDX files** under `content/docs/api/**` (generateFiles), not a second loader source keyed `openapi:`.

---

## Multiple sources (Outside baseline)

Upstream can pass a **record** of sources:

```ts
// Upstream — NOT Lite
export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: blog.toFumadocsSource(),
  },
  { baseUrl: "/docs" },
);

// then page.type === 'docs' | 'openapi'
```

Lite keeps a single collection so search, LLM, OG, graph, and OpenAPI preload share one page shape. Do not add a second collection / `page.type` matrix without a named Docs multi-source reopen.

---

## Static Source (Outside baseline)

Custom adapters return a `StaticSource` with in-memory `files` (pages + meta). Paths are **virtual** only (`file.mdx`, `content/file.mdx`) — not `./file.mdx` or absolute OS paths.

Lite does **not** hand-author `StaticSource` modules (`lib/my-content-source.ts` banned). Prefer Fumadocs MDX `toFumadocsSource()`; custom CMS reopen should still expose Loader-compatible sources — [content-source.md](content-source.md).

---

## Dynamic Source (Outside baseline)

`DynamicSource` with `async files()` + optional `configure(loader)` revalidation is only for [`dynamicLoader()`](https://fumadocs.dev/docs/headless/source-api#dynamic-loader).

Lite stays on sync `loader()` — see [loader-api.md](loader-api.md) · [local-md.md](local-md.md) · [sanity.md](sanity.md).

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| `loader({ docs, blog }, opts)` multi-source | Dual page types · search/LLM drift |
| Hand `StaticSource` / parallel getPage | Dual SSOT — [content-source.md](content-source.md) |
| `DynamicSource` without reopen | Async cutover of every consumer |
| OpenAPI as second source / Virtual Files | MDX Files lock — [openapi.md](openapi.md) |
| Absolute / `./` paths in custom sources | Upstream virtual-path rule |

---

## Verify

```text
1. lib/source.ts: source: docs.toFumadocsSource() — single property, not a record
2. No StaticSource · DynamicSource · createMySource · page.type ===
3. No loader( { docs:, … }, { baseUrl } ) two-arg multi-source form
4. Wire test: Loader Source lock
5. pnpm --filter @afenda/docs generate:source
```

Companion: [loader-api.md](loader-api.md) · [loader-plugins.md](loader-plugins.md) · [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [content-source.md](content-source.md) · [content-collections.md](content-collections.md) · [openapi.md](openapi.md) · [local-md.md](local-md.md) · [sanity.md](sanity.md).
