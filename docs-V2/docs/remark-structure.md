# Fumadocs Core — Remark Structure (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-structure.md` |
| Authority | **Scratch** — upstream [Remark Structure](https://fumadocs.dev/docs/headless/mdx/structure) · disk `@afenda/docs` |
| Status | **Active** — Fumadocs MDX default extract · no `remarkStructureOptions` · Orama via `createFromSource` |
| Audience | Engineers tuning search/document structured extract (`structuredData`) |
| Updated | 2026-07-19 |

Upstream `remarkStructure` scans MDAST into headings + content blocks (`vfile.data.structuredData`) for search indexing. **Enabled by default on Fumadocs MDX** — configure via `mdxOptions.remarkStructureOptions` when needed; do **not** append `remarkStructure` to `remarkPlugins` on Lite.

Lite search consumes the compiled source through Orama — [search-orama.md](search-orama.md). Plugin index: [mdx-plugins.md](mdx-plugins.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Structure extract | **Fumadocs MDX default** `remarkStructure` (not listed in `source.config.ts`) |
| Options | **No** `remarkStructureOptions` — ship upstream defaults |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| Search consumer | [`app/api/search/route.ts`](../../apps/docs/app/api/search/route.ts) — `createFromSource(source, { language: "english" })` |
| Standalone `structure(raw)` helper | **Outside** until reopen (custom pipelines / non-MDX sources) |
| Custom `types` / `stringify` / `mdxTypes` / `exportAs` | **Outside** until named reopen |

OpenAPI op MDX may include generated `structuredData` frontmatter from `generateFiles` — that is OpenAPI output, not a Lite `remarkStructureOptions` override — [openapi.md](openapi.md).

Wire test enforces no options / plugin re-wire + Active Orama route.

---

## Upstream ladder (reference only)

### Fumadocs MDX (options only when reopening)

```ts
// Upstream option surface — NOT on Lite disk today
export default defineConfig({
  mdxOptions: {
    remarkStructureOptions: {
      // types, stringify, mdxTypes, exportAs, …
    },
  },
});
```

### Raw MDX compiler (not needed on Lite)

```ts
// Upstream — NOT Lite (already default in Fumadocs MDX)
import { remarkStructure } from "fumadocs-core/mdx-plugins";

await compile("...", { remarkPlugins: [remarkStructure] });
```

### Output shape

| Part | Fields |
|------|--------|
| Heading | `id` · `content` (Markdown text) |
| Content | `heading` (nullable) · `content` (Markdown text) |

A heading can own multiple content paragraphs.

### Standalone function (Outside on Lite)

```ts
// Upstream — NOT Lite day-to-day
import { structure } from "fumadocs-core/mdx-plugins";

structure(page.body.raw);
// structure(raw, [remarkMath], options) when custom remark plugins exist
```

---

## Why defaults (Lite)

| Approach | When |
|----------|------|
| Default `remarkStructure` + Orama `createFromSource` | **Lite** |
| `remarkStructureOptions` | Named Docs Remark Structure reopen (scan types · stringify · export name) |
| Manual `remarkStructure` in `remarkPlugins` | Never beside Fumadocs MDX defaults |
| `structure()` on raw strings | Custom/non-Loader sources only — Outside |

---

## When reopen is allowed

Explicit Docs Remark Structure reopen must cover:

1. Why default node `types` / stringify lose search quality
2. Impact on Orama index size / relevance — [search-orama.md](search-orama.md)
3. Interaction with OpenAPI generated `structuredData` and `includeProcessedMarkdown` — [remark-llms.md](remark-llms.md)
4. Whether `structure()` is needed outside the MDX compile path
5. Wire tests + [mdx-plugins.md](mdx-plugins.md) · this chapter

Until then: defaults only — no `remarkStructureOptions` on disk.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `remarkStructureOptions` | Unreviewed search extract behavior |
| Duplicate `remarkStructure` in `remarkPlugins` | Double extract / option drift |
| Dropping Orama `createFromSource` without search reopen | Breaks Active search — [search-orama.md](search-orama.md) |
| Treating structure as open backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: no remarkStructure · no remarkStructureOptions · remarkBlockId only
2. app/api/search/route.ts: createFromSource · language english
3. Wire test: docs-openapi-wire Remark Structure + Search UI
4. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [search-orama.md](search-orama.md) · [headings.md](headings.md) · [remark-llms.md](remark-llms.md) · [openapi.md](openapi.md) · [README.md](README.md).
