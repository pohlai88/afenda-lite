# Fumadocs Framework Mode — Content Source (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/content-source.md` |
| Authority | **Scratch** — upstream [Content Source](https://fumadocs.dev/docs/integrations/content) · [Build Your Own](https://fumadocs.dev/docs/integrations/content/custom) · disk `@afenda/docs` |
| Status | **Active** — Fumadocs MDX via Loader API · CMS / custom / Local Markdown / MDX Remote Outside baseline |
| Audience | Engineers choosing or auditing how docs pages are authored and loaded |
| Updated | 2026-07-19 |

Upstream: Fumadocs can integrate **any** content source (CMS examples, [Local Markdown](https://fumadocs.dev/docs/integrations/content/local-md), [MDX Remote](https://fumadocs.dev/docs/integrations/content/mdx-remote), or a [custom adapter](https://fumadocs.dev/docs/integrations/content/custom)). Lite locks **Fumadocs MDX** on disk under `content/docs/**`, loaded through **Loader API** (`docs.toFumadocsSource()`).

`loader()` options / outputs: [loader-api.md](loader-api.md). Source interface (single MDX · no multi/static/dynamic): **[loader-source.md](loader-source.md)**. Tree / hand-vs-generated: [content.md](content.md). Slugs · meta: [page-conventions.md](page-conventions.md). Search: [search-orama.md](search-orama.md). Framework shell: [next.md](next.md). Outside: [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · [sanity.md](sanity.md) · [content-collections.md](content-collections.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Content source | **Fumadocs MDX** — `fumadocs-mdx` · `defineDocs({ dir: "content/docs" })` — [fumadocs-mdx.md](fumadocs-mdx.md) |
| Integration style | **Loader API** — not a hand-rolled low-level source |
| Loader input | [`lib/source.ts`](../../apps/docs/lib/source.ts) — `docs.toFumadocsSource()` + `openapi.loaderPlugin()` |
| Page tree | [`app/docs/layout.tsx`](../../apps/docs/app/docs/layout.tsx) — `tree={source.pageTree}` (not a hardcoded object) |
| Page content | [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) — `source.getPage` · MDX `body` · `page.data.toc` ([get-toc.md](get-toc.md)) |
| Pre-render | `generateStaticParams` from `source` (Next.js) |
| Search | Orama `createFromSource(source)` — [search-orama.md](search-orama.md) |
| Next integration | [`next.config.mjs`](../../apps/docs/next.config.mjs) — `createMDX()` |
| Collections | `tsconfig` `collections/*` → `./.source/*` · `generate:source` |
| No BaseHub / Sanity / Payload | Absent from `@afenda/docs` dependencies · Sanity chapter [sanity.md](sanity.md) |
| No `@fumadocs/local-md` | Outside baseline — [local-md.md](local-md.md) |
| No `@fumadocs/mdx-remote` | Outside baseline — [mdx-remote.md](mdx-remote.md) |
| No Content Collections | Outside baseline — [content-collections.md](content-collections.md) |
| No custom `my-content-source` | No parallel `getPage` / hardcoded tree modules |
| English file tree | [content.md](content.md) · i18n Outside baseline — [i18n.md](i18n.md) |

Wire test enforces MDX Loader path + CMS / Local Markdown / MDX Remote / low-level absences.

---

## Outside — Local Markdown · MDX Remote · Content Collections

| Package | Role | Scratch |
|---------|------|---------|
| [`@fumadocs/local-md`](https://fumadocs.dev/docs/integrations/content/local-md) | Runtime/bundleless local files (`localMd` + `dynamicLoader`) | [local-md.md](local-md.md) |
| [`@fumadocs/mdx-remote`](https://fumadocs.dev/docs/integrations/content/mdx-remote) | On-demand MDX compile (`createCompiler`) | [mdx-remote.md](mdx-remote.md) |
| [Content Collections](https://fumadocs.dev/docs/headless/content-collections) | `@content-collections/*` + `createMDXSource` | [content-collections.md](content-collections.md) |

Lite keeps build-time Fumadocs MDX (`source.config.ts` · `createMDX()` · sync `source` export).

---

## Outside — Sanity (official CMS)

Official Fumadocs Sanity integration (`@fumadocs/sanity` · CLI `fumadocs/sanity/base` · Portable Text · live preview): **[sanity.md](sanity.md)**.

Lite does **not** install Studio, `createSanitySource`, or draft-mode `getSource()`.

## Upstream — other CMS examples (reference)

| Example | Role |
|---------|------|
| [fumadocs-basehub](https://github.com/fuma-nama/fumadocs-basehub) | BaseHub |
| [fumadocs-sanity](https://github.com/fuma-nama/fumadocs-sanity) | Sanity example repo — see [sanity.md](sanity.md) |
| [fumadocs-payloadcms](https://github.com/MFarabi619/fumadocs-payloadcms) · [fumadocs-payload-template](https://github.com/bapspatil/fumadocs-payload-template) | Community Payload |

Do **not** paste these into Lite without a named Docs content-source / CMS reopen.

---

## Upstream — Build Your Own (reference only)

Two approaches ([custom](https://fumadocs.dev/docs/integrations/content/custom)):

### 1. Loader API (preferred when possible)

File-system-like `source` for adapters — [Loader API source](https://fumadocs.dev/docs/headless/source-api/source).

**Lite already uses this** for Fumadocs MDX (`docs.toFumadocsSource()`). A custom CMS reopen should prefer Loader API so page tree, search, OpenAPI plugin, and `generateStaticParams` stay on one `source` export.

### 2. Low-level API (Outside baseline)

More control; you own tree + fetch + render + search yourself.

#### Page tree

Hardcode or generate a [page tree](https://fumadocs.dev/docs/headless/page-tree); pass to `DocsLayout` `tree={…}`.

```tsx
// Upstream low-level — NOT Lite
<DocsLayout tree={{ /* hardcoded or generated */ }}>{children}</DocsLayout>
```

Lite: `tree={source.pageTree}` only — wire test rejects `tree={{`.

#### Page content

Resolve `slug` → content → render inside `DocsPage` / `DocsBody`. TOC: custom, CMS API, or [`getTableOfContents`](https://fumadocs.dev/docs/headless/utils/get-toc) (Markdown/MDX string) — Lite uses Loader TOC only — [get-toc.md](get-toc.md).

```tsx
// Upstream low-level — NOT Lite
import { getPage } from "./my-content-source";
const page = getPage(params.slug);
```

Lite: `source.getPage(params.slug)` + `page.data.body` / `page.data.toc` (not `getTableOfContents`).

#### Pre-rendering

Next.js: `generateStaticParams`. For remote sources, clone/cache locally at build time — do not N+1 hit GitHub/API per page (rate limits).

Lite: `source.generateParams()` (docs page + LLM routes).

#### Document search

MDX/Markdown: built-in Orama Search API is enough for most cases. Non-MDX remote: bring Orama Cloud / Algolia (or equivalent) — [search integrations](https://fumadocs.dev/docs/headless/search).

Lite: stock Orama fetch mode — [search-orama.md](search-orama.md). Custom Algolia/Cloud Outside baseline until search reopen.

---

## Why MDX + Loader (Lite)

| Need | Why |
|------|-----|
| OpenAPI op pages | Committed `generateFiles` MDX + `openapi.loaderPlugin()` — [openapi.md](openapi.md) |
| Docs project rules | No product DB / Neon Auth / CMS secrets — [README.md](README.md) |
| Reviewable SSOT | Git-diffable pages · CI `lint:links` / wire tests |
| One `source` | Tree · search · static params · Feedback/LLM share the same loader |

---

## When reopen is allowed (CMS / custom / Local Markdown / MDX Remote)

Explicit Docs content-source reopen must cover:

1. Chosen path: Sanity / other CMS **or** Local Markdown **or** MDX Remote **or** custom Loader API **or** (last resort) low-level API + license / ops ownership
2. Prefer Loader API over hardcoded trees / parallel `getPage` modules
3. Sanity: [sanity.md](sanity.md) · Local Markdown: [local-md.md](local-md.md) · MDX Remote: [mdx-remote.md](mdx-remote.md)
4. How OpenAPI generated pages coexist (MDX remain · hybrid · regenerate into CMS)
5. Env secrets stay off docs Neon / `DATABASE_URL` rules — or Approved exception (CMS tokens included)
6. Pre-render strategy (local clone vs remote) + rate-limit story
7. Search / LLM / Feedback / Graph View still keyed off `source` — update [search-orama.md](search-orama.md) · [llms.md](llms.md)
8. Preview / ISR / rebuild story documented in Scratch
9. Wire tests + update [content.md](content.md) · [sanity.md](sanity.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · this chapter

Until then: Fumadocs MDX + Loader only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent BaseHub / Sanity / Payload deps | Second publish SSOT · secrets · rebuild matrix — Sanity: [sanity.md](sanity.md) |
| Silent `@fumadocs/local-md` / `localMd` cutover | Second pipeline · async source · different page API — [local-md.md](local-md.md) |
| Silent `@fumadocs/mdx-remote` / `createCompiler` | On-demand execution · dual render — [mdx-remote.md](mdx-remote.md) |
| Silent Content Collections / `createMDXSource` | Second MDX pipeline · mdx-bundler — [content-collections.md](content-collections.md) |
| Hardcoded `DocsLayout` `tree={{…}}` | Diverges from `source.pageTree` · footer/nav drift |
| Parallel `my-content-source` / custom `getPage` without reopen | Dual fetch paths · OpenAPI preload breaks |
| Replacing `toFumadocsSource()` without reopen | Breaks OpenAPI plugin · page tree · search |
| Per-page remote GitHub/API fetches at build | Rate limits · flaky CI |
| Treating custom/CMS as open backlog | Outside baseline — named reopen only |
| Product DB as docs CMS | Docs ≠ product runtime — [README.md](README.md) |

---

## Verify

```text
1. source.config.ts: defineDocs dir content/docs · fumadocs-mdx
2. lib/source.ts: docs.toFumadocsSource() · openapi.loaderPlugin — loader options: loader-api.md
3. docs layout: tree={source.pageTree} · no tree={{
4. docs page: source.getPage · generateStaticParams from source
5. package.json: fumadocs-mdx · no CMS · no local-md · no mdx-remote · no my-content-source module
6. Wire test: docs-openapi-wire content-source + Loader API + CMS/Sanity + Local Markdown + MDX Remote locks
7. pnpm --filter @afenda/docs generate:source · test -- docs-openapi-wire
```

Companion: [fumadocs-mdx.md](fumadocs-mdx.md) · [loader-api.md](loader-api.md) · [loader-source.md](loader-source.md) · [content.md](content.md) · [get-toc.md](get-toc.md) · [sanity.md](sanity.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · [content-collections.md](content-collections.md) · [page-conventions.md](page-conventions.md) · [search-orama.md](search-orama.md) · [next.md](next.md) · [openapi.md](openapi.md) · [README.md](README.md).
