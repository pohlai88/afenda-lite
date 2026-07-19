# Fumadocs Core — Headings (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/headings.md` |
| Authority | **Scratch** — upstream [Headings](https://fumadocs.dev/docs/headless/mdx/headings) · disk `@afenda/docs` |
| Status | **Active** — Fumadocs MDX default `remarkHeading` · TOC via Loader `page.data.toc` · no explicit `rehypeToc` |
| Audience | Engineers tuning heading ids / TOC extract |
| Updated | 2026-07-19 |

Upstream `remarkHeading` assigns heading ids and (by default) extracts TOC into `vfile.data.toc` as `TOCItemType[]`. **Included by default on Fumadocs MDX** — Lite does **not** re-declare it in `remarkPlugins`.

Optional `rehypeToc` exports TOC with JSX titles (needs MDX.js). Lite does **not** add it — page chrome uses Loader `page.data.toc`.

Plugin index: [mdx-plugins.md](mdx-plugins.md). Consuming TOC in UI: [get-toc.md](get-toc.md). Authoring markers: [markdown.md](markdown.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Heading ids + TOC extract | **Fumadocs MDX default** `remarkHeading` (not listed in `source.config.ts`) |
| Page TOC | [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) — `toc={page.data.toc}` · Inline TOC override |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| No `generateToc: false` | Do not disable default TOC extract |
| No `rehypeToc` | Absent from `rehypePlugins` (none declared) |
| No duplicate `remarkHeading` | Do not add beside defaults |
| Custom ids in prose | `[#slug]` · `[!toc]` · `[toc]` available via defaults — [markdown.md](markdown.md) |

Wire test enforces no explicit heading/TOC plugin re-wire + Active `page.data.toc`.

---

## Upstream ladder (reference only)

### Remark Heading

```ts
// Upstream raw MDX compiler — NOT needed on Lite (already default in Fumadocs MDX)
import { remarkHeading } from "fumadocs-core/mdx-plugins";

await compile("...", { remarkPlugins: [remarkHeading] });
```

Disable TOC extract (Upstream — NOT Lite):

```ts
remarkPlugins: [[remarkHeading, { generateToc: false }]];
```

### Custom ids

```md
# heading [#slug]
```

### Output (`TOCItemType`)

| Field | Role |
|-------|------|
| `title` | `ReactNode` |
| `url` | Anchor href (e.g. `#hello-code`) |
| `depth` | Heading level |
| `_step` | Optional — from remark-steps (Outside on Lite) |

### Rehype TOC

```ts
// Upstream — NOT Lite
import { rehypeToc } from "fumadocs-core/mdx-plugins";
rehypePlugins: [rehypeToc];
```

Exports `toc` with JSX in titles (e.g. `` Hello `<code>` ``). Lite keeps remark-extract TOC via Loader instead.

---

## Why defaults (Lite)

| Approach | When |
|----------|------|
| Default `remarkHeading` + `page.data.toc` | **Lite** |
| Explicit `remarkHeading` in `source.config.ts` | Only if reopening to change options (`generateToc`) |
| `rehypeToc` | JSX-in-TOC titles — Outside until named reopen |
| `getTableOfContents` string parse | Custom sources — [get-toc.md](get-toc.md) |
| remark-steps `_step` on TOC items | Outside — use `<Steps>` — [remark-steps.md](remark-steps.md) |

---

## When reopen is allowed

Explicit Docs Headings reopen must cover:

1. Why default extract is insufficient (`generateToc: false` · `rehypeToc` JSX titles)
2. Parity with Inline TOC · Orama · [validate-links.md](validate-links.md) hashes
3. Order with `remarkBlockId` — [feedback.md](feedback.md)
4. Wire tests + [mdx-plugins.md](mdx-plugins.md) · [get-toc.md](get-toc.md) · this chapter

Until then: defaults + Loader TOC only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Re-adding `remarkHeading` without reopen | Duplicate plugin / option drift |
| `generateToc: false` without reopen | Breaks `page.data.toc` / sidebar TOC |
| Silent `rehypeToc` | Second TOC export path |
| Treating Headings as open backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: no remarkHeading · no rehypeToc · no generateToc
2. remarkPlugins: remarkBlockId only
3. docs page: toc={page.data.toc} · items={page.data.toc}
4. Wire test: docs-openapi-wire Headings + Get TOC + MDX Plugins
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [get-toc.md](get-toc.md) · [markdown.md](markdown.md) · [validate-links.md](validate-links.md) · [README.md](README.md).
