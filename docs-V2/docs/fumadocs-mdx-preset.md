# Fumadocs MDX — MDX Presets (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-preset.md` |
| Authority | **Scratch** — upstream [MDX Presets](https://fumadocs.dev/docs/mdx/mdx) · disk `@afenda/docs` `source.config.ts` |
| Status | **Active** — default documentation preset · global `mdxOptions` · no `applyMdxPreset` / minimal / built-in option overrides |
| Audience | Engineers changing the MDX processor preset or built-in remark/rehype defaults |
| Updated | 2026-07-19 |

Fumadocs MDX ships **MDX presets** that wire documentation defaults (syntax highlighting, TOC, images, search extract). The **default preset** is enabled for global `mdxOptions` — [fumadocs-mdx-global.md](fumadocs-mdx-global.md). Plugin catalog: [mdx-plugins.md](mdx-plugins.md). Getting Started: [fumadocs-mdx.md](fumadocs-mdx.md).

Override shape inherits MDX [`ProcessorOptions`](https://mdxjs.com/packages/mdx/#processoroptions).

---

## Lite lock (configured)

| Topic | Lite |
|-------|------|
| Preset | **Default** documentation preset (omit `preset`) — not `'minimal'` |
| Scope | **Global** `defineConfig({ mdxOptions })` only |
| Collection `applyMdxPreset` | **Outside baseline** — no second `defineCollections` MDX stack |
| Explicit remark add | **`remarkBlockId`** only — [feedback.md](feedback.md) |
| Explicit rehype add | **None** — no `rehypePlugins` |
| Built-in option knobs | **None** — no `rehypeCodeOptions` · `remarkImageOptions` · `remarkHeadingOptions` |

```ts
// apps/docs/source.config.ts — default preset + one remark add
export default defineConfig({
  mdxOptions: {
    providerImportSource: "@/components/mdx",
    remarkPlugins: [[remarkBlockId, { addDataAttribute: "feedback" }]],
  },
});
```

Do **not** re-declare default remark/rehype plugins, call `applyMdxPreset`, or set `preset: 'minimal'` without a named Docs MDX-preset reopen + this chapter.

---

## Default preset (upstream → Lite)

### Remark plugins (built-in)

| Plugin | Role | Lite chapter |
|--------|------|--------------|
| Remark Image | Handle images | [remark-image.md](remark-image.md) — **Defaults** |
| Remark Heading | Extract TOC | [headings.md](headings.md) — **Defaults** |
| Remark Structure | Search indexes | [remark-structure.md](remark-structure.md) — **Defaults** · Orama [search-orama.md](search-orama.md) |

### Rehype plugins (built-in)

| Plugin | Role | Lite chapter |
|--------|------|--------------|
| Rehype Code | Syntax highlighting | [rehype-code.md](rehype-code.md) — **Defaults** |
| Rehype TOC | Export TOC | [headings.md](headings.md) · Loader [get-toc.md](get-toc.md) — **Defaults** |

### Explicit add (Lite)

| Plugin | Via | Why |
|--------|-----|-----|
| `remarkBlockId` | Global `remarkPlugins` array | Block Feedback — [feedback.md](feedback.md) |

---

## Adding plugins (upstream patterns)

Upstream allows an array **or** a function to control order:

```ts
// Global — Outside on Lite except remarkBlockId
mdxOptions: {
  remarkPlugins: [myPlugin],
  // or remarkPlugins: (v) => [myPlugin, ...v],
  rehypePlugins: (v) => [myPlugin, ...v],
}
```

```ts
// Collection — Outside on Lite (applyMdxPreset + defineCollections)
mdxOptions: applyMdxPreset({
  remarkPlugins: (v) => [myPlugin, ...v],
})
```

| Pattern | Lite |
|---------|------|
| Global array with `remarkBlockId` only | **Active** |
| Global `remarkPlugins: (v) => …` | Outside — array form is enough |
| Global `rehypePlugins` | Outside — [mdx-plugins.md](mdx-plugins.md) |
| Collection `applyMdxPreset` | Outside — one global preset |

---

## Customize built-in plugins

Upstream option bags on the default preset:

| Option | Lite |
|--------|------|
| `rehypeCodeOptions` | Outside — [rehype-code.md](rehype-code.md) |
| `remarkImageOptions` (e.g. `placeholder: 'blur'`) | Outside — [remark-image.md](remark-image.md) |
| `remarkHeadingOptions` | Outside — [headings.md](headings.md) |

Keep stock defaults; reopen the owning chapter when a knob is required.

---

## Outside baseline

| Knob | Why blocked |
|------|-------------|
| `preset: 'minimal'` | Drops documentation defaults Lite relies on — [fumadocs-mdx-global.md](fumadocs-mdx-global.md) |
| `applyMdxPreset` / per-collection `mdxOptions` | Dual preset stacks · [fumadocs-mdx.md](fumadocs-mdx.md) |
| Re-wire default remark/rehype into custom lists | Drift from Fumadocs MDX defaults |
| Extra `remarkPlugins` / any `rehypePlugins` | [mdx-plugins.md](mdx-plugins.md) reopen |
| `rehypeCodeOptions` · `remarkImageOptions` · `remarkHeadingOptions` | Owning default chapters |

---

## When reopen is allowed

Explicit Docs MDX-preset reopen must cover:

1. Why the default preset or a built-in option bag is insufficient
2. Global vs collection scope (`applyMdxPreset`) and impact on `defineDocs`
3. Order relative to `remarkBlockId` · TOC · Orama · LLM text · Graph View
4. Wire tests + this chapter + [mdx-plugins.md](mdx-plugins.md) / owning default chapters

Until then: default preset + `remarkBlockId` only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| `preset: 'minimal'` without reopen | Breaks TOC / Shiki / image / structure |
| Silent `applyMdxPreset` / collection MDX options | Second compile surface |
| Silent built-in option overrides | Unreviewed highlight / image / heading behavior |
| Treating preset as open plugin backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: default preset (no preset key) · mdxOptions.providerImportSource + remarkBlockId only
2. No applyMdxPreset · no rehypePlugins · no rehypeCodeOptions · remarkImageOptions · remarkHeadingOptions
3. Wire test: Fumadocs MDX Presets lock
4. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [fumadocs-mdx-global.md](fumadocs-mdx-global.md) · [fumadocs-mdx.md](fumadocs-mdx.md) · [mdx-plugins.md](mdx-plugins.md) · [headings.md](headings.md) · [rehype-code.md](rehype-code.md) · [remark-image.md](remark-image.md) · [remark-structure.md](remark-structure.md) · [get-toc.md](get-toc.md) · [feedback.md](feedback.md) · [README.md](README.md).
