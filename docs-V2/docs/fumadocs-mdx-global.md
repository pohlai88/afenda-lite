# Fumadocs MDX — Global Options (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-global.md` |
| Authority | **Scratch** — upstream [Global Options](https://fumadocs.dev/docs/mdx/global) · disk `@afenda/docs` `source.config.ts` |
| Status | **Active** — default MDX compiler · `mdxOptions` preset · Sätteri / workspaces / build-cache Outside |
| Audience | Engineers changing shared Fumadocs MDX `defineConfig` knobs |
| Updated | 2026-07-19 |

Shared options for Fumadocs MDX live on `defineConfig` in [`source.config.ts`](../../apps/docs/source.config.ts). Collection shape stays on `defineDocs` — [fumadocs-mdx.md](fumadocs-mdx.md). Plugin inventory: [mdx-plugins.md](mdx-plugins.md). Default preset details: [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md).

---

## Lite lock (configured)

| Option | Lite |
|--------|------|
| Entry | `export default defineConfig({ … })` |
| `compiler` | **Default `'mdx'`** (omit) — not `"satteri"` |
| `mdxOptions` | **Active** — default MDX preset + `providerImportSource` + `remarkBlockId` |
| `mdxOptions.preset` | **Default** (full preset) — not `'minimal'` |
| `satteriOptions` | **Outside baseline** |
| `plugins` | **Active singleton** — `lastModified()` for RSS dates — [rss.md](rss.md) |
| `workspaces` | **Outside baseline** — single docs app config |
| `experimentalBuildCache` | **Outside baseline** |

```ts
// apps/docs/source.config.ts (global shape)
import { remarkBlockId } from "fumadocs-core/mdx-plugins/remark-block-id";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      extractLinkReferences: true,
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    providerImportSource: "@/components/mdx",
    remarkPlugins: [[remarkBlockId, { addDataAttribute: "feedback" }]],
  },
});
```

Do **not** set `compiler`, `satteriOptions`, `workspaces`, `experimentalBuildCache`, or **extra** top-level plugins beyond `lastModified()` without a named Docs MDX-global reopen + this chapter update.

---

## Upstream map → Lite

| Option | Upstream role | Lite |
|--------|---------------|------|
| `plugins` | Optional Fumadocs MDX plugin list | **Shipped** — `lastModified()` only — [rss.md](rss.md) |
| `compiler` | Default compiler for files **without** a collection (`"mdx"` \| `"satteri"`) | Omit → `'mdx'` · collections use default MDX |
| `mdxOptions` | Global MDX preset for `doc` collections on the MDX compiler | **Shipped** — [mdx-plugins.md](mdx-plugins.md) |
| `satteriOptions` | Global Sätteri options when `compiler: "satteri"` | Outside — no `@fumadocs/satteri` |
| `workspaces` | Multi-root workspace configs | Outside — one `apps/docs` tree |
| `experimentalBuildCache` | Experimental build cache path | Outside — stock Next / Turbopack path |

Collections choose their own compiler via collection-level `compiler` when needed. Lite keeps the docs collection on the default MDX path — no per-collection compiler override.

---

## MDX Options (global)

Customize the default MDX preset via `mdxOptions` — full map: [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md). Upstream allows remark/rehype arrays or functions (`rehypePlugins: (v) => […]`).

| Pattern | Lite |
|---------|------|
| `providerImportSource: "@/components/mdx"` | **Active** |
| `remarkPlugins: [[remarkBlockId, …]]` | **Active** singleton — [feedback.md](feedback.md) |
| Extra remark/rehype (KaTeX, math, …) | Outside — [mdx-plugins.md](mdx-plugins.md) |
| `preset: 'minimal'` | Outside — drop built-in headings / Rehype Code / image / structure defaults |
| Async `mdxOptions: async () => ({ … })` | Outside — sync object only |

Plugin order and Outside catalog: [mdx-plugins.md](mdx-plugins.md). Defaults chapters: [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [headings.md](headings.md) · [rehype-code.md](rehype-code.md) · [remark-image.md](remark-image.md) · [remark-structure.md](remark-structure.md).

---

## Outside baseline

| Knob | Why blocked |
|------|-------------|
| `compiler: "satteri"` / `satteriOptions` | Second compile stack · `@fumadocs/satteri` absent — [remark-ts2js.md](remark-ts2js.md) |
| `mdxOptions.preset: 'minimal'` | Strips Fumadocs MDX defaults Lite relies on |
| Extra top-level `plugins` beyond `lastModified()` | Unreviewed plugin surface — RSS twin stays Active |
| `workspaces` | Multi-config drift · monorepo docs stay single-app |
| `experimentalBuildCache` | Experimental · stock bundler enough — [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) |
| Per-collection `mdxOptions` / `compiler` override | One global preset — [fumadocs-mdx.md](fumadocs-mdx.md) |
| Silent extra `remarkPlugins` / `rehypePlugins` | [mdx-plugins.md](mdx-plugins.md) reopen only |

---

## When reopen is allowed

Explicit Docs MDX-global reopen must cover:

1. Which `defineConfig` option and why defaults fail
2. Impact on `remarkBlockId`, `includeProcessedMarkdown`, Graph View, Orama, LLM text
3. Package adds (`@fumadocs/satteri`, math/KaTeX, cache dirs)
4. Wire tests + this chapter + [mdx-plugins.md](mdx-plugins.md) / [fumadocs-mdx.md](fumadocs-mdx.md)

Until then: Active shape above only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Switching to Sätteri without reopen | Dual compilers · package + consumer rewrite |
| `preset: 'minimal'` without reopen | Breaks default TOC / Shiki / image / structure |
| `workspaces` / build-cache without reopen | Config surface Lite does not operate |
| Treating Global Options as open plugin backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: defineConfig({ plugins: [lastModified()], mdxOptions }) — no compiler · satteriOptions · workspaces · experimentalBuildCache
2. mdxOptions: providerImportSource + remarkBlockId only — no preset: 'minimal'
3. No @fumadocs/satteri in package.json
4. Wire test: Fumadocs MDX Global Options lock
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [fumadocs-mdx.md](fumadocs-mdx.md) · [fumadocs-mdx-next.md](fumadocs-mdx-next.md) · [fumadocs-mdx-preset.md](fumadocs-mdx-preset.md) · [mdx-plugins.md](mdx-plugins.md) · [rss.md](rss.md) · [feedback.md](feedback.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [remark-ts2js.md](remark-ts2js.md) · [README.md](README.md).
