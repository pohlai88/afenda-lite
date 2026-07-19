# Fumadocs Framework Mode — Local Markdown (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/local-md.md` |
| Authority | **Scratch** — upstream [Local Markdown](https://fumadocs.dev/docs/integrations/content/local-md) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `@fumadocs/local-md` · no `localMd` / `dynamicLoader` / `getSource()` cutover |
| Audience | Engineers comparing runtime local Markdown to build-time Fumadocs MDX |
| Updated | 2026-07-19 |

Upstream `@fumadocs/local-md` is a **bundleless** (runtime) content source for local Markdown/MDX. Lite locks **Fumadocs MDX** (`fumadocs-mdx` + type-gen / bundler path) — [content-source.md](content-source.md).

Sibling Outside options: CMS / custom low-level — [content-source.md](content-source.md). On-demand compile: [mdx-remote.md](mdx-remote.md) (also Outside).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Content source | **Fumadocs MDX** — not Local Markdown |
| No `@fumadocs/local-md` | `@afenda/docs` `package.json` |
| Loader | [`lib/source.ts`](../../apps/docs/lib/source.ts) — sync `export const source = loader({ source: docs.toFumadocsSource(), … })` |
| No `localMd` / `dynamicLoader` / `getSource` | Absent from `lib/**` · `app/**` |
| No `local-md dev` wrapper | [`package.json`](../../apps/docs/package.json) `dev` = `next dev --port 3001` (after `predev` → `generate:source`) |
| Config + Next MDX | [`source.config.ts`](../../apps/docs/source.config.ts) · [`next.config.mjs`](../../apps/docs/next.config.mjs) `createMDX()` **kept** |
| Page render | `page.data.body` · `page.data.toc` — not `page.data.load()` / `render()` |
| Layout tree | `tree={source.pageTree}` — not `await getSource()` + `getPageTree()` |

Wire test enforces the absences above. Active path: [content-source.md](content-source.md) · [next.md](next.md).

---

## Why not Local Markdown (Lite)

| Upstream claim | Lite reason to stay on Fumadocs MDX |
|----------------|-------------------------------------|
| No type-gen / bundler | Lite **wants** `generate:source` · `createMDX()` · OpenAPI MDX pages |
| Bundleless runtime | Docs build already pre-generates `.source/` + OpenAPI MDX — build-time path is the SSOT |
| No build-time image optimization | Lite keeps MDX image pipeline when content needs it |
| No MDX imports/exports | Lite MDX uses shared components via `providerImportSource` — [markdown.md](markdown.md) · [ui-components.md](ui-components.md) |
| `dynamicLoader` + `getSource()` | Breaks sync `source` consumers (search, LLM, OG, layout) unless every call site goes async |
| Hot-reload `local-md dev` | Extra process; Lite uses `predev` → `fumadocs-mdx` |

---

## Upstream ladder (reference only)

Do **not** paste these into Lite without a named Docs Local Markdown reopen + Scratch update + consumer audit.

### 1. Install

```bash
# Upstream — NOT Lite
pnpm add @fumadocs/local-md shiki
```

`shiki` is externalized by the bundler in upstream setups.

### 2. `localMd` + `dynamicLoader`

```ts
// Upstream — NOT Lite
import { dynamicLoader } from "fumadocs-core/source/dynamic";
import { localMd } from "@fumadocs/local-md";

const docs = localMd({ dir: "content/docs" });
const docsLoader = dynamicLoader(docs.dynamicSource(), { baseUrl: "/docs" });

export async function getSource() {
  return docsLoader.get();
}
```

Optional schemas: `frontmatterSchema` / `metaSchema` from `fumadocs-core/source/schema`.

### 3. Layout / page consumers

```tsx
// Upstream — NOT Lite
const docs = await getSource();
return <DocsLayout tree={docs.getPageTree()}>{children}</DocsLayout>;
```

Page data shape differs: custom frontmatter under `page.data.frontmatter.*`; compiled body via `await page.data.load()` then `render(mdxComponents)` — not `page.data.body`.

### 4. Hot reload

```json
// Upstream — NOT Lite
{ "scripts": { "dev": "local-md dev -- npm next dev" } }
```

```ts
// Upstream — NOT Lite
if (process.env.NODE_ENV === "development") {
  void docs.devServer();
}
```

### 5. One-shot snapshot (`staticSource`)

Upstream can use `loader(await docs.staticSource(), …)` without revalidation. Still a Local Markdown cutover — not Lite.

### 6. Without RSC

Upstream sends serialized AST via server payload and renders with `rendererFromSerialized` + `useFumadocsLoader` (e.g. TanStack Start). Lite is Next.js App Router + RSC — [next.md](next.md).

---

## Migration from Fumadocs MDX (upstream)

Upstream “After” removes `source.config.ts`, `createMDX()`, and `collections/server`, then switches every `source` reference to `await getSource()`.

**Lite must not run that migration** without reopen. OpenAPI `loaderPlugin`, Orama `createFromSource(source)`, LLM helpers, OG routes, and wire tests all assume the sync Fumadocs MDX `source` export.

---

## When reopen is allowed

Explicit Docs Local Markdown reopen must cover:

1. Why runtime Local Markdown beats build-time Fumadocs MDX for Lite (image opt · MDX imports · OpenAPI generateFiles)
2. Cutover plan: remove or keep `source.config.ts` / `createMDX()` / `generate:source`
3. Async `getSource()` audit for layout · page · search · LLM · OG · Feedback · Graph View
4. Page API migration (`body`/`toc`/`getText` → `load()`/`render`/`content`/`frontmatter`)
5. Dev story (`local-md dev` vs Turbo / `predev`) documented in [automation.md](automation.md)
6. Search index still correct for runtime-compiled pages — [search-orama.md](search-orama.md)
7. Wire tests flipped + [content-source.md](content-source.md) · [content.md](content.md) · [next.md](next.md) updated

Until then: Fumadocs MDX only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `@fumadocs/local-md` install | Second content pipeline beside `fumadocs-mdx` |
| Replace `toFumadocsSource()` with `localMd` without reopen | Breaks OpenAPI plugin · page types · search · static params |
| Dual loaders (MDX + Local Markdown) | Dual trees · dual page APIs |
| Drop `createMDX` / `source.config.ts` without reopen | Removes Active type-gen path |
| Client `rendererFromSerialized` on docs App Router | RSC path already renders MDX server-side |
| Treating Local Markdown as open backlog | Outside baseline — named reopen only |

---

## Verify

```text
1. package.json: fumadocs-mdx present · @fumadocs/local-md absent
2. lib/source.ts: docs.toFumadocsSource() · export const source = loader(
3. No localMd( · dynamicLoader · getSource · rendererFromSerialized under apps/docs
4. package.json scripts.dev: next dev (not local-md dev --)
5. source.config.ts + next.config createMDX kept
6. Wire test: docs-openapi-wire Local Markdown Outside baseline
7. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [content-source.md](content-source.md) · [content.md](content.md) · [next.md](next.md) · [markdown.md](markdown.md) · [search-orama.md](search-orama.md) · [README.md](README.md).
