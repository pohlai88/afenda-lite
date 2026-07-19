# Fumadocs Core — Content Collections (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/content-collections.md` |
| Authority | **Scratch** — upstream [Content Collections](https://fumadocs.dev/docs/headless/content-collections) · [content-collections.dev](https://www.content-collections.dev) · disk `@afenda/docs` |
| Status | **Outside baseline** — Fumadocs MDX only · no `@content-collections/*` / `@fumadocs/content-collections` |
| Audience | Engineers comparing Content Collections to Fumadocs MDX |
| Updated | 2026-07-19 |

[Content Collections](https://www.content-collections.dev) transforms content into type-safe data collections. Fumadocs can wire it via `@fumadocs/content-collections` (`createMDXSource` · `transformMDX`).

Lite locks **Fumadocs MDX** (`fumadocs-mdx` · `docs.toFumadocsSource()`) — [fumadocs-mdx.md](fumadocs-mdx.md) · [content-source.md](content-source.md) · [loader-source.md](loader-source.md).

**Name collision:** Lite’s `import { docs } from "collections/server"` is the **fumadocs-mdx** generated `.source/` map (`tsconfig` `collections/*` → `./.source/*`). It is **not** the Content Collections package `content-collections` / `allDocs` / `allMetas` API.

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Content pipeline | **Fumadocs MDX** — `source.config.ts` · `createMDX()` · `generate:source` |
| Loader input | `docs.toFumadocsSource()` — not `createMDXSource(allDocs, allMetas)` |
| No `@content-collections/core` · `@content-collections/mdx` | Absent from `@afenda/docs` deps |
| No `@fumadocs/content-collections` | Absent |
| No `content-collections.ts` | Absent under `apps/docs` |
| Page body | `page.data.body` as Fumadocs MDX component — not `<MDXContent code={…} />` from `@content-collections/mdx/react` |

Active path: [next.md](next.md) · [loader-api.md](loader-api.md). Sibling Outside: [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · [sanity.md](sanity.md).

---

## Upstream setup (reference only)

```ts
// content-collections.ts — NOT Lite
import { defineCollection, defineConfig } from "@content-collections/core";
import { transformMDX } from "@fumadocs/content-collections/configuration";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";

const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  schema: pageSchema,
  transform: transformMDX,
});

const metas = defineCollection({
  name: "meta",
  directory: "content/docs",
  include: "**/meta.json",
  parser: "json",
  schema: metaSchema,
});

export default defineConfig({
  collections: [docs, metas],
});
```

```ts
// lib/source.ts — NOT Lite
import { allDocs, allMetas } from "content-collections";
import { createMDXSource } from "@fumadocs/content-collections";

export const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(allDocs, allMetas),
});
```

Lite instead:

```ts
import { docs } from "collections/server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
});
```

---

## Why not Content Collections (Lite)

| Upstream | Lite |
|----------|------|
| Separate Content Collections + mdx-bundler pipeline | One `fumadocs-mdx` pipeline already owns OpenAPI MDX + search + LLM |
| `MDXContent` + `code={page.data.body}` | Stock Fumadocs MDX `body` component |
| Dual config (`content-collections.ts` + Next) | Single `source.config.ts` + `createMDX()` |
| Import components via bundler `cwd` | Components via `providerImportSource` / MDX registry — [ui-components.md](ui-components.md) |

---

## When reopen is allowed

Explicit Docs Content Collections reopen must cover:

1. Migrate off `fumadocs-mdx` `defineDocs` / `createMDX` **or** prove dual-pipeline coexistence
2. `createMDXSource` + OpenAPI `generateFiles` MDX + `openapi.loaderPlugin` still green
3. Orama / LLM / OG / Feedback / graph still keyed off one `source`
4. Deps: `@content-collections/*` · `@fumadocs/content-collections` · config file location
5. Wire tests + update [content-source.md](content-source.md) · [loader-source.md](loader-source.md) · this chapter

Until then: do **not** install Content Collections packages or add `content-collections.ts`.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| `@content-collections/*` / `@fumadocs/content-collections` | Second MDX pipeline |
| `createMDXSource` / `allDocs` / `allMetas` | Replaces `toFumadocsSource()` |
| `content-collections.ts` | Dual config SSOT |
| `<MDXContent code={page.data.body} />` | Different body contract |
| Treating `collections/server` as Content Collections | Wrong package — fumadocs-mdx `.source/` only |

---

## Verify

```text
1. package.json: fumadocs-mdx · no @content-collections/* · no @fumadocs/content-collections
2. No content-collections.ts under apps/docs
3. lib/source.ts: collections/server · docs.toFumadocsSource() · no createMDXSource
4. No MDXContent from @content-collections/mdx/react
5. Wire test: Content Collections Outside lock
```

Companion: [content-source.md](content-source.md) · [loader-source.md](loader-source.md) · [next.md](next.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · [sanity.md](sanity.md).
