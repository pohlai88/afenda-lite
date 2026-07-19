# Fumadocs Core — Get TOC (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/get-toc.md` |
| Authority | **Scratch** — upstream [Get TOC](https://fumadocs.dev/docs/headless/utils/get-toc) · [Headings / remark](https://fumadocs.dev/docs/headless/mdx/headings) · disk `@afenda/docs` |
| Status | **Active** — TOC from Fumadocs MDX Loader (`page.data.toc`) · manual `getTableOfContents` Outside for docs routes |
| Audience | Engineers wiring sidebar TOC / Inline TOC |
| Updated | 2026-07-19 |

Upstream `getTableOfContents(markdown)` parses a Markdown/MDX **string** into [`TOCItemType[]`](https://fumadocs.dev/docs/headless/mdx/headings#output). Lite docs pages do **not** call it — Fumadocs MDX already attaches `page.data.toc` at load time.

Content source lock: [content-source.md](content-source.md). UI: [ui-layouts.md](ui-layouts.md) `DocsPage` · [ui-components.md](ui-components.md) Inline TOC.

Upstream note: if using a CMS, prefer the CMS TOC API — not this string parser. Lite CMS path is Outside — [sanity.md](sanity.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| TOC source | **Loader** — `page.data.toc` from Fumadocs MDX |
| Docs page | [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) — `toc={page.data.toc}` |
| Inline TOC override | Same file — MDX `InlineTOC` forced to `items={page.data.toc}` |
| Item type | [`components/inline-toc.tsx`](../../apps/docs/components/inline-toc.tsx) — `import type { TOCItemType } from "fumadocs-core/toc"` (type only) |
| No `getTableOfContents` | Absent from `lib/**` · `app/**` · `components/**` · no `fumadocs-core/content/toc` imports |
| No string re-parse on route | Do not re-parse `page` body through Get TOC |

Wire test enforces Active `page.data.toc` + Get TOC absence.

---

## Why Loader TOC (not Get TOC)

| Approach | When |
|----------|------|
| `page.data.toc` | Fumadocs MDX / Loader — **Lite** |
| CMS TOC API | Sanity / other CMS reopen — [sanity.md](sanity.md) |
| `getTableOfContents(source)` | Custom low-level / raw Markdown string without Loader headings — Outside until content-source reopen |
| Remark headings plugin | Upstream MDX pipeline alternative — Lite relies on MDX defaults + Loader output |

Re-parsing MDX as a string on every request duplicates work the bundler/Loader already did and drifts from heading ids used in search / validate-links.

---

## Upstream ladder (reference only)

```ts
// Upstream — NOT Lite docs page path
import { getTableOfContents } from "fumadocs-core/content/toc";

const toc = getTableOfContents("## markdown content");
// → TOCItemType[]
```

Related: default extract is [remarkHeading](headings.md) (Fumadocs MDX built-in). Re-wiring `remarkHeading` / `rehypeToc` or string `getTableOfContents` is Outside until reopen.

---

## When reopen is allowed (manual Get TOC)

Explicit Docs Get TOC / custom-source reopen must cover:

1. Why Loader `page.data.toc` is insufficient (non-MDX body · custom pipeline)
2. Content-source path that owns the Markdown string — [content-source.md](content-source.md)
3. Heading id parity with Inline TOC · search · [validate-links.md](validate-links.md)
4. CMS: use CMS TOC API instead when applicable
5. Wire tests updated + this chapter

Until then: `page.data.toc` only on docs routes.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| `getTableOfContents` on `[[...slug]]` without reopen | Dual TOC sources · id drift |
| Import `fumadocs-core/content/toc` without reopen | Custom-source smell beside Active Loader |
| Ignoring CMS TOC when on CMS | Upstream guidance — Lite CMS Outside anyway |
| Treating Get TOC as open backlog | Outside for docs routes — named reopen only |

---

## Verify

```text
1. docs page: toc={page.data.toc} · items={page.data.toc}
2. No getTableOfContents · no fumadocs-core/content/toc under apps/docs lib/app/components
3. inline-toc.tsx: TOCItemType from fumadocs-core/toc (type) only
4. Wire test: docs-openapi-wire Get TOC Active lock
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [headings.md](headings.md) · [content-source.md](content-source.md) · [markdown.md](markdown.md) · [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md) · [validate-links.md](validate-links.md) · [README.md](README.md).
