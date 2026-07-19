# Fumadocs UI components (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/ui-components.md` |
| Authority | **Scratch** — upstream [Components](https://fumadocs.dev/docs/ui/components) · [ui.md](ui.md) status legend · disk `@afenda/docs` |
| Status | **Active** — CLI-owned Radix UI components under `apps/docs/components` |
| Audience | Engineers writing narrative MDX or extending the MDX registry |
| Updated | 2026-07-19 |

This file is the **SSOT for which Fumadocs UI components are wired**. Markdown/MDX syntax: [markdown.md](markdown.md). Authoring habits: [practices.md](practices.md). Layout chrome: [ui-layouts.md](ui-layouts.md). CLI install: [cli.md](cli.md).

Disk: `apps/docs/components/*.tsx` (CLI) · `components/mdx.tsx` · `app/docs/[[...slug]]/page.tsx` · `app/layout.tsx` · `lib/layout.shared.tsx` · `source.config.ts`. Samples: `content/docs/guide.mdx`.

---

## Overview

| Concern | Disk |
|---------|------|
| Owned UI components | `components/{accordion,banner,callout,…}.tsx` via Fumadocs CLI (`uiLibrary: radix-ui`) |
| Default MDX + registry | `components/mdx.tsx` — imports local `@/components/*` |
| Relative Link | `a: createRelativeLink(source, page)` on page RSC |
| Inline TOC items | Page overrides `InlineTOC` with `page.data.toc` — [get-toc.md](get-toc.md) |
| Banner | `app/layout.tsx` → `@/components/banner` |
| GitHub Info | `lib/layout.shared.tsx` → `@/components/github-info` |
| Graph View | `components/graph-view.tsx` + `lib/build-graph.ts` + `extractLinkReferences` |
| Feedback | Page mount + `lib/github-feedback.ts` → GitHub Discussions |
| Auto Type Table | `fumadocs-typescript` + `lib/docs-typescript.ts` — detail [typescript.md](typescript.md) |
| Dynamic Code Block | `fumadocs-ui/components/dynamic-codeblock` (package — not in CLI registry) |

---

## Configured catalog (Shipped)

| Component | Wire | Source |
|-----------|------|--------|
| **Accordion** | MDX `Accordion` / `Accordions` | CLI → `components/accordion.tsx` + `ui/accordion.tsx` |
| **Auto Type Table** | MDX `AutoTypeTable` | Package `fumadocs-typescript/ui` — [typescript.md](typescript.md) |
| **Banner** | Root layout | CLI → `components/banner.tsx` · `id="afenda-lite-docs"` |
| **Callout** | MDX `Callout` (JSX only · no `:::tip`) | CLI → `components/callout.tsx` — [remark-admonition.md](remark-admonition.md) |
| **Card / Cards** | MDX `Card` / `Cards` | CLI → `components/card.tsx` |
| **Code Block** | MDX `pre` → `CodeBlock`/`Pre` | CLI → `components/codeblock.tsx` |
| **Code Block (Dynamic)** | MDX `DynamicCodeBlock` | Package `fumadocs-ui` |
| **Files** | MDX `Files` / `Folder` / `File` (JSX only · no `` ```files ``) | CLI → `components/files.tsx` — [remark-mdx-files.md](remark-mdx-files.md) |
| **GitHub Info** | Docs layout `links` custom item | CLI → `components/github-info.tsx` · **no token** |
| **Graph View** | MDX `GraphView` → `DocsGraphView` | CLI → `components/graph-view.tsx` |
| **Heading** | MDX `h1`–`h6` | CLI → `components/heading.tsx` |
| **Zoomable Image** | MDX `img` → `ImageZoom` | CLI → `components/image-zoom.tsx` + `app/image-zoom.css` · sizes via default Remark Image — [remark-image.md](remark-image.md) |
| **Inline TOC** | MDX `InlineTOC` | CLI → `components/inline-toc.tsx` |
| **Steps** | MDX `Steps` / `Step` (JSX only · no heading `[step]`) | CLI → `components/steps.tsx` — [remark-steps.md](remark-steps.md) |
| **Tabs** | MDX `Tabs` / `Tab` | CLI → `components/tabs.tsx` + `ui/tabs.tsx` |
| **Type Table** | MDX `TypeTable` | CLI → `components/type-table.tsx` |
| **Feedback** | Page `Feedback` + `FeedbackText` | CLI → `components/feedback/*` · actions `lib/github-feedback.ts` |
| Relative Link | `createRelativeLink` | Package `fumadocs-core` |
| OpenAPI | `APIPage` / `OpenAPIPage` | [openapi.md](openapi.md) · [openapi-api-page.md](openapi-api-page.md) |

Primitives pulled with CLI: `components/ui/{button,accordion,tabs,collapsible}.tsx` · `lib/cn.ts` (`cnfast`).

---

## Registry wire

```tsx
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Accordion, Accordions } from "@/components/accordion";
import { Callout } from "@/components/callout";
import { Card, Cards } from "@/components/card";
// …local CLI components…

export function getMDXComponents(components?) {
  return {
    ...defaultMdxComponents,
    Callout, Card, Cards,
    h1: (props) => <Heading as="h1" {...props} />,
    // …
    img: MdxZoomImage,
    pre: (props) => <CodeBlock {...props}><Pre>{props.children}</Pre></CodeBlock>,
    GraphView: DocsGraphView,
    ...components,
  };
}
```

---

## Graph View config

```ts
// source.config.ts
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: { extractLinkReferences: true },
  },
});
```

Deps: `react-force-graph-2d` · `d3-force` (CLI Graph View).

---

## Feedback (GitHub Discussions)

Full Framework Mode map (page · block · Discussions · ops): **[feedback.md](feedback.md)**.

| Piece | Disk |
|-------|------|
| UI | `components/feedback/client.tsx` · `schema.ts` |
| Actions | `lib/github-feedback.ts` |
| Mount | `[[...slug]]/page.tsx` — `FeedbackText` + `Feedback` |
| Block IDs | `remarkBlockId` + `addDataAttribute: "feedback"` |
| Ops | **Opened** — set `GITHUB_APP_*` after App install ([feedback.md](feedback.md)) |

---

## Banned (unchanged)

| Surface | Why |
|---------|-----|
| `ComponentPreview` · `CopyCommandButton` | 8bitcn / registry preview patterns |
| `@8bitcn/*` · paid shadcn registries | Explicit pack ban — [README.md](README.md) |
| Product `@afenda/ui-system` in docs MDX | Product design system ≠ docs shell |
| `GITHUB_TOKEN` / product secrets on docs | Docs project boundary — GithubInfo runs without token |

---

## Verify

```text
1. apps/docs/components/*.tsx present for catalog rows (CLI-owned)
2. mdx.tsx imports @/components/* (not fumadocs-ui/components/* for owned set)
3. Banner + GithubInfo use local components; global.css imports ./image-zoom.css
4. Feedback wire — [feedback.md](feedback.md)
5. pnpm --filter @afenda/docs typecheck · test -- docs-openapi-wire
6. Spot-check /docs/guide (UI present; live submit deferred until GitHub App ops open)
```

Companion: [typescript.md](typescript.md) · [feedback.md](feedback.md) · [cli.md](cli.md) · [practices.md](practices.md) · [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) · [openapi.md](openapi.md).
