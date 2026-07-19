# Fumadocs Core — Loader API (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/loader-api.md` |
| Authority | **Scratch** — upstream [Loader API](https://fumadocs.dev/docs/headless/source-api) · disk `@afenda/docs` |
| Status | **Active** — sync `loader()` · `baseUrl: "/docs"` · Fumadocs MDX source |
| Audience | Engineers changing how content becomes page tree / URLs / params |
| Updated | 2026-07-19 |

`loader()` turns a content source into a unified server interface: page slugs, page tree, URLs, and helpers (`getPage` · `getPages` · `generateParams`).

**Important:** server-side only · in-memory from the files your source passes · not a build-time magic or browser API.

Source interface (single / multi / static / dynamic): **[loader-source.md](loader-source.md)**. Product adapter (MDX vs CMS): [content-source.md](content-source.md). Plugins: [loader-plugins.md](loader-plugins.md). Slugs / meta: [page-conventions.md](page-conventions.md). Tree walks: [page-tree-utils.md](page-tree-utils.md). Framework shell: [next.md](next.md).

---

## Lite lock (configured)

| Option | Lite |
|--------|------|
| Call | `export const source = loader({ … })` in [`lib/source.ts`](../../apps/docs/lib/source.ts) |
| `baseUrl` | `"/docs"` |
| `source` | `docs.toFumadocsSource()` — [loader-source.md](loader-source.md) |
| `plugins` | `[openapi.loaderPlugin()]` only — [loader-plugins.md](loader-plugins.md) |
| Custom `url(slugs, locale)` | **Outside baseline** — stock from `baseUrl` |
| Custom `slugs(file)` | **Outside baseline** — file-path defaults |
| `icon(icon)` | **Outside baseline** — [page-conventions.md](page-conventions.md) |
| `i18n` | **Outside baseline** — [i18n.md](i18n.md) |
| `dynamicLoader` / `getSource()` | **Outside baseline** — [local-md.md](local-md.md) · [sanity.md](sanity.md) |
| Client serialize / `useFumadocsLoader` | **Outside baseline** — RSC + `source.pageTree` |

```ts
// apps/docs/lib/source.ts
import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { openapi } from "@/lib/openapi.server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
});
```

---

## Usage (upstream shape)

```ts
import { loader } from "fumadocs-core/source";
import { docs } from "collections/server";

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
});
```

Source adapter details: [content-source.md](content-source.md) · upstream [source](https://fumadocs.dev/docs/headless/source-api/source).

---

## URL · slugs · icons · i18n

| Knob | Upstream | Lite |
|------|----------|------|
| `baseUrl` | Override root path | **`"/docs"`** |
| `url(slugs, locale)` | Custom path builder | Outside — locale paths need [i18n.md](i18n.md) reopen |
| `slugs(file)` | Custom slug from file | Outside — keep file/meta conventions |
| `icon(icon)` | Map meta/frontmatter icon names → JSX | Outside — no Lucide map |
| `i18n` | Per-locale page trees | Outside — English-only |

---

## Output (what Lite calls)

| API | Lite use |
|-----|----------|
| `source.pageTree` | `DocsLayout` `tree={source.pageTree}` — **not** `getPageTree()` |
| `source.getPage(slugs)` | Docs page · OG · LLM `*.md` route |
| `source.getPages()` | `llms-full.txt` · OG `generateStaticParams` · graph |
| `source.generateParams()` | `generateStaticParams` on docs + LLM routes |
| `source.getPageByHref` | Link graph (`lib/build-graph.ts`) |
| `getPageTree(locale)` / `getPages(locale)` / `getLanguages()` | Outside — no i18n |
| `getNodePage` / `getNodeMeta` | Outside baseline — no custom tree walks |
| `serializePageTree` / `useFumadocsLoader` | Outside — non-RSC client loader path |

Current `fumadocs-core` on disk exposes the tree as **`source.pageTree`**. Do not switch layouts to `source.getPageTree()` unless a named slice re-locks wire tests + [page-tree-utils.md](page-tree-utils.md).

---

## Dynamic loader

Upstream `dynamicLoader()` + `invalidate()` / `revalidate()` for sources that change at runtime.

Lite keeps a **sync** `export const source = loader(…)`. Do not cut over to `dynamicLoader` / `await source.get()` without updating every consumer (layout, search, LLM, OG, graph) — see [local-md.md](local-md.md) · [sanity.md](sanity.md).

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| Browser / client `loader()` | Server-only API |
| Custom `url` / `slugs` / `icon` without slice | Breaks conventions · i18n · icons |
| `loader({ i18n })` | English-only lock |
| `dynamicLoader` · CMS `getSource()` | Async cutover |
| Hardcoded `tree={{…}}` | Diverges from loader tree |
| Client serialize layer | RSC path is enough |
| Second loader instance | Dual trees / search drift |

---

## Verify

```text
1. lib/source.ts: loader · baseUrl "/docs" · docs.toFumadocsSource() · openapi.loaderPlugin()
2. No url( · slugs( · icon( · i18n · dynamicLoader · serializePageTree
3. docs layout: tree={source.pageTree} · no getPageTree(
4. docs page: source.getPage · source.generateParams()
5. Wire test: Loader API lock
6. pnpm --filter @afenda/docs generate:source · test -- docs-openapi-wire
```

Companion: [loader-source.md](loader-source.md) · [content-source.md](content-source.md) · [loader-plugins.md](loader-plugins.md) · [page-conventions.md](page-conventions.md) · [page-tree-utils.md](page-tree-utils.md) · [i18n.md](i18n.md) · [next.md](next.md) · [openapi-server.md](openapi-server.md) · [search-orama.md](search-orama.md).
