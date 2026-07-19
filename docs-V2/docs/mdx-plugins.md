# Fumadocs Core — MDX Plugins (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/mdx-plugins.md` |
| Authority | **Scratch** — upstream [MDX Plugins](https://fumadocs.dev/docs/headless/mdx) · disk `@afenda/docs` `source.config.ts` |
| Status | **Active** — Fumadocs MDX defaults + explicit `remarkBlockId` · extra remark/rehype adds Outside |
| Audience | Engineers adding or auditing remark/rehype plugins for docs MDX |
| Updated | 2026-07-19 |

Upstream indexes useful remark & rehype plugins under [Headless → MDX](https://fumadocs.dev/docs/headless/mdx). Lite wires plugins only through [`source.config.ts`](../../apps/docs/source.config.ts) (`defineConfig` → `mdxOptions`). Global Options: [fumadocs-mdx-global.md](fumadocs-mdx-global.md). Default preset: [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md).

Fumadocs MDX Getting Started: [fumadocs-mdx.md](fumadocs-mdx.md). Authoring syntax: [markdown.md](markdown.md). Feedback block IDs: [feedback.md](feedback.md). TypeScript remark path: [typescript.md](typescript.md). LLM text postprocess: [llms.md](llms.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Config | [`source.config.ts`](../../apps/docs/source.config.ts) — `defineConfig({ plugins: [lastModified()], mdxOptions })` — [fumadocs-mdx-global.md](fumadocs-mdx-global.md) · [rss.md](rss.md) |
| Explicit remark | **`remarkBlockId`** only — `addDataAttribute: "feedback"` |
| Provider | `providerImportSource: "@/components/mdx"` |
| Docs postprocess | `extractLinkReferences: true` · `includeProcessedMarkdown: true` (boolean · internal remarkLLMs) — [remark-llms.md](remark-llms.md) |
| Defaults | Fumadocs MDX **default preset** (headings / Rehype Code / Remark Image / Remark Structure / remark-npm, etc.) — **not** re-declared — [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [headings.md](headings.md) · [rehype-code.md](rehype-code.md) · [remark-image.md](remark-image.md) · [remark-structure.md](remark-structure.md) |
| No `fumadocs-docgen` / `remarkInstall` | Absent — deprecated Package Install — [package-install.md](package-install.md) · use default remark-npm or JSX `<Tabs>` |
| No extra custom remark/rehype | No `remark-steps`, AutoTypeTable remark, admonition remark, ts2js, mdx-files, custom rehype list |

Wire test enforces the Active `remarkBlockId` singleton + Outside plugins absent.

---

## Upstream catalog → Lite

| Upstream page | Role | Lite |
|---------------|------|------|
| [Headings](https://fumadocs.dev/docs/headless/mdx/headings) | TOC / heading ids (`remarkHeading`) | **Defaults** — chapter [headings.md](headings.md) · UI [get-toc.md](get-toc.md) |
| [Rehype Code](https://fumadocs.dev/docs/headless/mdx/rehype-code) | Shiki highlight | **Defaults** — chapter [rehype-code.md](rehype-code.md) · authoring [markdown.md](markdown.md) |
| [remark-npm](https://fumadocs.dev/docs/headless/mdx/remark-npm) | Package-manager code tabs | **Defaults** (Fumadocs MDX) — prefer `pnpm` in prose |
| [Package Install](https://fumadocs.dev/docs/headless/mdx/install) (`remarkInstall` / `fumadocs-docgen`) | `package-install` fences | **Outside · Deprecated** — [package-install.md](package-install.md) |
| [remark-admonition](https://fumadocs.dev/docs/headless/mdx/remark-admonition) | `:::note` callouts | **Outside** — chapter [remark-admonition.md](remark-admonition.md) · use `<Callout>` |
| [remark-image](https://fumadocs.dev/docs/headless/mdx/remark-image) | Image size / imports | **Defaults** — chapter [remark-image.md](remark-image.md) · UI ImageZoom |
| [remark-steps](https://fumadocs.dev/docs/headless/mdx/remark-steps) | Heading `[step]` / numbered steps | **Outside** — chapter [remark-steps.md](remark-steps.md) · use `<Steps>` / `<Step>` |
| [remark-ts2js](https://fumadocs.dev/docs/headless/mdx/remark-ts2js) | TS→JS dual tabs (`ts2js` meta) | **Outside** — chapter [remark-ts2js.md](remark-ts2js.md) · hand `<Tabs>` |
| [remark-mdx-files](https://fumadocs.dev/docs/headless/mdx/remark-mdx-files) | `` ```files `` → Files JSX | **Outside** — chapter [remark-mdx-files.md](remark-mdx-files.md) · use `<Files>` |
| [remark-llms](https://fumadocs.dev/docs/headless/mdx/remark-llms) | Processed Markdown export | **Active** via `includeProcessedMarkdown: true` — [remark-llms.md](remark-llms.md) · routes [llms.md](llms.md) |
| [Structure](https://fumadocs.dev/docs/headless/mdx/structure) | Search / document extract | **Defaults** — chapter [remark-structure.md](remark-structure.md) · Orama [search-orama.md](search-orama.md) |
| Auto Type Table remark | `fumadocs-typescript` | **Outside** — UI only — [typescript.md](typescript.md) |
| `remark-block-id` | Stable block ids | **Active** — [feedback.md](feedback.md) |

---

## Active config (disk)

```ts
// apps/docs/source.config.ts (shape)
import { remarkBlockId } from "fumadocs-core/mdx-plugins/remark-block-id";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      extractLinkReferences: true,
      includeProcessedMarkdown: true,
    },
  },
  meta: { schema: metaSchema },
});

export default defineConfig({
  plugins: [lastModified()], // RSS dates — not a remark plugin — rss.md
  mdxOptions: {
    providerImportSource: "@/components/mdx",
    remarkPlugins: [[remarkBlockId, { addDataAttribute: "feedback" }]],
  },
});
```

Do **not** append **remark/rehype** plugins without a named Docs MDX-plugins reopen + Scratch update. Top-level `lastModified()` is Active for RSS — [rss.md](rss.md).

---

## Outside baseline (extra plugins)

Do not add without reopen:

| Add | Why blocked |
|-----|-------------|
| `remarkInstall` / `fumadocs-docgen` | Second install-tab pipeline beside defaults |
| `remarkSteps` / heading `[step]` | Prefer JSX `<Steps>` — [remark-steps.md](remark-steps.md) |
| `remarkAutoTypeTable` | Dual TypeTable extract paths — [typescript.md](typescript.md) |
| `remarkCodeTabOptions.parseMdx: true` | MDX-in-tab-labels complexity — [markdown.md](markdown.md) |
| `mdxOptions.preset: 'minimal'` | Strips default preset Lite relies on — [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [fumadocs-mdx-global.md](fumadocs-mdx-global.md) |
| `applyMdxPreset` / collection `mdxOptions` | Dual preset stacks — [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) |
| Custom `rehypePlugins` / `rehypeCodeOptions` | Drift from Fumadocs MDX defaults — [rehype-code.md](rehype-code.md) |
| `remarkImageOptions` / `remarkHeadingOptions` | Drift from defaults — [remark-image.md](remark-image.md) · [headings.md](headings.md) |
| `remarkImage` option override (`useImport` · `publicDir` · …) | Drift from defaults — [remark-image.md](remark-image.md) |
| `remarkStructureOptions` / manual `remarkStructure` | Drift from defaults — [remark-structure.md](remark-structure.md) |
| Admonition (`remark-directive` + `remarkDirectiveAdmonition`) | Prefer JSX `<Callout>` — [remark-admonition.md](remark-admonition.md) |
| `includeProcessedMarkdown` as `LLMsOptions` / `mdxAsPlaceholder` / manual `remarkLLMs` | Boolean `true` only — [remark-llms.md](remark-llms.md) |
| `remarkMdxFiles` / `` ```files `` fences | Prefer JSX `<Files>` — [remark-mdx-files.md](remark-mdx-files.md) |
| `remarkTypeScriptToJavaScript` / `oxc-transform` / Satteri `remarkTs2js` | Prefer hand Tabs — [remark-ts2js.md](remark-ts2js.md) |

---

## When reopen is allowed

Explicit Docs MDX-plugins reopen must cover:

1. Which upstream plugin and why defaults / JSX are insufficient
2. Order relative to `remarkBlockId` (feedback IDs must stay stable)
3. Impact on `includeProcessedMarkdown` / Graph View link extract / Orama
4. MDX component registry updates — [ui-components.md](ui-components.md) · [markdown.md](markdown.md)
5. Wire tests + this chapter

Until then: `remarkBlockId` only as explicit add.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent extra `remarkPlugins` / `rehypePlugins` | Unreviewed compile pipeline |
| Dropping `remarkBlockId` | Breaks block Feedback — [feedback.md](feedback.md) |
| Dual Steps / Callout / TypeTable remark+JSX | Authoring drift |
| Treating plugin zoo as open backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: remarkPlugins = [[remarkBlockId, …]] only
2. providerImportSource + extractLinkReferences + includeProcessedMarkdown
3. No fumadocs-docgen · remarkInstall · remark-directive · remarkDirectiveAdmonition · remarkImage override · manual remarkLLMs · remark-steps · remarkAutoTypeTable · rehypeCodeOptions in config
4. includeProcessedMarkdown: true (boolean) — not LLMsOptions object
5. Wire test: docs-openapi-wire MDX Plugins · Remark LLMs · Rehype Code · Remark Image · Headings · Remark Admonition locks
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [fumadocs-mdx.md](fumadocs-mdx.md) · [fumadocs-mdx-global.md](fumadocs-mdx-global.md) · [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [headings.md](headings.md) · [rehype-code.md](rehype-code.md) · [remark-image.md](remark-image.md) · [remark-structure.md](remark-structure.md) · [remark-llms.md](remark-llms.md) · [remark-mdx-files.md](remark-mdx-files.md) · [remark-steps.md](remark-steps.md) · [remark-ts2js.md](remark-ts2js.md) · [remark-admonition.md](remark-admonition.md) · [package-install.md](package-install.md) · [markdown.md](markdown.md) · [feedback.md](feedback.md) · [typescript.md](typescript.md) · [llms.md](llms.md) · [search-orama.md](search-orama.md) · [get-toc.md](get-toc.md) · [ui-components.md](ui-components.md) · [README.md](README.md).
