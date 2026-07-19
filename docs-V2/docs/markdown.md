# Fumadocs Framework Mode — Markdown / MDX (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/markdown.md` |
| Authority | **Scratch** — upstream [Markdown](https://fumadocs.dev/docs/markdown) · disk `@afenda/docs` |
| Status | **Active** — MDX + GFM · CLI MDX registry · relative links |
| Audience | Engineers writing narrative MDX |
| Updated | 2026-07-19 |

How to write documents on Lite. Component catalog status: [ui-components.md](ui-components.md). Authoring habits / anti-patterns: [practices.md](practices.md). Page tree: [page-conventions.md](page-conventions.md).

Reference samples: `apps/docs/content/docs/guide.mdx` · `index.mdx`.

---

## Format lock

| Topic | Lite |
|-------|------|
| Format | **MDX** under `content/docs/**` — content source lock [content-source.md](content-source.md) |
| GFM | Supported (Fumadocs MDX defaults) |
| Registry | [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) via `providerImportSource` |
| Custom remark | `remarkBlockId` (feedback) only — [`source.config.ts`](../../apps/docs/source.config.ts) · plugin index [mdx-plugins.md](mdx-plugins.md) · [feedback.md](feedback.md) |
| Table of contents | Loader `page.data.toc` — [get-toc.md](get-toc.md) (not manual `getTableOfContents`) |
| Custom / CMS / Local Markdown / MDX Remote | Outside baseline — [content-source.md](content-source.md) · [sanity.md](sanity.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) |

---

## Frontmatter

```mdx
---
title: This is a document
description: One-line purpose for sidebar + metadata.
---
```

| Field | Lite |
|-------|------|
| `title` | **Required** — DocsTitle / page `h1` chrome · do not duplicate `# Heading` in body |
| `description` | **Required** — [practices.md](practices.md) |
| Extra schema fields | Only when a named slice extends `defineDocs` schema |

---

## Links (configured)

| Kind | Behavior |
|------|----------|
| Internal (relative MDX / in-tree) | `createRelativeLink(source, page)` on the docs page RSC — [ui-components.md](ui-components.md) |
| External | Default `rel="noreferrer noopener" target="_blank"` (Fumadocs) |

Prefer relative links between docs pages so moves stay correct after `generate:source`.

---

## Shipped MDX surfaces

Use components from `getMDXComponents` — full table in [ui-components.md](ui-components.md).

| Surface | Lite usage |
|---------|------------|
| **Cards** | `<Cards>` / `<Card href title>` — home + section intros |
| **Callouts** | `<Callout>` JSX only · types `info` (default) · `warn`/`warning` · `error` · `success` · `idea` — Docusaurus `:::` Outside — [remark-admonition.md](remark-admonition.md) |
| **Steps** | JSX `<Steps>` / `<Step>` only — heading `[step]` Outside — [remark-steps.md](remark-steps.md) |
| **Tabs** | `<Tabs>` / `<Tab>` JSX |
| **Files** | JSX `<Files>` / `<Folder>` / `<File>` only — `` ```files `` fence plugin Outside — [remark-mdx-files.md](remark-mdx-files.md) |
| **Accordions** | `<Accordion>` / `<Accordions>` |
| **Headings** | CLI `Heading` for `h1`–`h6` · auto anchors |
| **Code** | CLI `CodeBlock`/`Pre` on `pre` · titles · Shiki transformers from Fumadocs defaults |
| **Images** | Markdown `![alt](/file)` · default Remark Image sizes · `img` → `ImageZoom` — [remark-image.md](remark-image.md) |
| **Inline TOC** | `<InlineTOC>` with page TOC override |
| **OpenAPI** | `APIPage` / `OpenAPIPage` on generated pages |

### Callout example

```mdx
<Callout title="Title" type="warn">
  Hello World
</Callout>
```

### Cards example

```mdx
<Cards>
  <Card href="/docs/guide" title="Maintainer guide">
    Pipeline and MDX surfaces.
  </Card>
</Cards>
```

### Steps example (Lite)

```mdx
<Steps>
<Step>

### Install

…

</Step>
</Steps>
```

---

## Headings & TOC

| Feature | Lite |
|---------|------|
| Auto anchor from heading text | **Shipped** (default `remarkHeading`) — [headings.md](headings.md) |
| Custom anchor `[#slug]` | Available (defaults) — [headings.md](headings.md) |
| Hide from TOC `[!toc]` | Available (defaults) |
| TOC-only heading `[toc]` | Available (defaults) — use sparingly |

Page chrome already renders frontmatter `title` as the page title — avoid a second body `h1`.

---

## Code blocks

| Feature | Lite |
|---------|------|
| Syntax highlight (Rehype Code / Shiki) | **Shipped** — defaults · [rehype-code.md](rehype-code.md) · CLI CodeBlock |
| `title="…"` on fence | **Shipped** — [rehype-code.md](rehype-code.md) |
| Language icon on fence | **Shipped** (default meta → CodeBlock) |
| `lineNumbers` / `lineNumbers=N` | Available (defaults) |
| Shiki transformers (`[!code highlight]` · word · diff · focus) | Available (defaults) |
| Fence `tab="…"` / `tab-group` | Available (defaults) |
| Inline `{:lang}` highlight | **Outside baseline** — no `inline: 'tailing-curly-colon'` — [rehype-code.md](rehype-code.md) |
| Custom `rehypeCodeOptions` (themes · filterMeta · icon) | **Outside baseline** until reopen — [rehype-code.md](rehype-code.md) |
| `remarkCodeTabOptions.parseMdx: true` (MDX in tab labels) | **Outside baseline** — not set in `source.config.ts` |
| Twoslash | Outside baseline — not wired |
| Fence `ts2js` meta (auto TS→JS tabs) | **Outside baseline** — [remark-ts2js.md](remark-ts2js.md) · hand `<Tabs>` |
| ```npm package-manager tabs | Available when default `remark-npm` is active (Fumadocs MDX) — prefer `pnpm` · deprecated `fumadocs-docgen` Outside — [package-install.md](package-install.md) |

---

## Include

Fumadocs MDX `<include>./other.mdx</include>` is available. Use for shared fragments; keep paths relative to the MDX file. Do not include product secrets or Living `docs/` bodies.

---

## Outside baseline (do not add without named slice)

| Pattern | Why |
|---------|-----|
| `getPageTreePeers` / “Further Reading” auto-cards | Not mounted on Lite pages |
| Heading `### Title [step]` / numbered steps via `remarkSteps` | JSX `<Steps>` only — [remark-steps.md](remark-steps.md) |
| Docusaurus `:::tip` / `remark-directive` admonitions | JSX `<Callout>` only — [remark-admonition.md](remark-admonition.md) |
| `` ```files `` / `remarkMdxFiles` | JSX `<Files>` only — [remark-mdx-files.md](remark-mdx-files.md) |
| Custom Remark Image options (`useImport` · `publicDir` · blur) | Defaults only — [remark-image.md](remark-image.md) |
| `remarkCodeTabOptions.parseMdx: true` | Not configured |
| Inline `{:lang}` / custom Rehype Code options | Defaults only — [rehype-code.md](rehype-code.md) |
| Fence `ts2js` / `fumadocs-docgen` + `oxc-transform` | Hand Tabs only — [remark-ts2js.md](remark-ts2js.md) |
| Twoslash / type-hover playgrounds | Not wired |
| Headless CMS / non-MDX renderer | MDX-only content source |
| Product `@afenda/ui-system` in MDX | Banned — [ui-components.md](ui-components.md) |
| `ComponentPreview` / `@8bitcn/*` | Banned |

---

## Configured disk

```text
apps/docs/
  source.config.ts           # providerImportSource · remarkBlockId
  components/mdx.tsx         # getMDXComponents registry
  app/docs/[[...slug]]/page.tsx  # createRelativeLink · Feedback · OpenAPI
  content/docs/**/*.mdx      # narrative + generated API
```

---

## Verify

```text
1. practices: every MDX has title + description
2. mdx.tsx registers Callout, Card/Cards, Steps/Step, CodeBlock, Heading, …
3. page.tsx uses createRelativeLink for `a`
4. source.config.ts: no remarkCodeTabOptions.parseMdx
5. Wire test: markdown lock
6. Spot-check /docs/guide (:3001)
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [practices.md](practices.md) · [ui-components.md](ui-components.md) · [page-conventions.md](page-conventions.md) · [content.md](content.md).
