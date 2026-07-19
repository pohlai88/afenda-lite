# Fumadocs MDX practices (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/practices.md` |
| Authority | **Scratch** — vendor `fumadocs-mdx-structure` (structure only) + disk `apps/docs/content/docs` |
| Audience | Engineers writing narrative docs MDX |
| Updated | 2026-07-19 |

**MDX syntax & defaults (Markdown guide):** [markdown.md](markdown.md).

Lite adapts **structure** from `fumadocs-mdx-structure`. Do **not** copy 8bitcn imports, `ComponentPreview`, or `@8bitcn/*` install commands into this app.

---

## Frontmatter (required)

Every page under `apps/docs/content/docs/**/*.mdx`:

```mdx
---
title: Short page title
description: One-line purpose for sidebar + metadata.
---
```

| Field | Rule |
|-------|------|
| `title` | Required · human title · drives DocsTitle · stock `pageSchema` |
| `description` | Required in Lite authoring · `generateMetadata` + cards (schema allows omit — still write it) |
| `icon` | Optional Lucide name · sidebar via `lucideIconsPlugin` — [loader-plugins.md](loader-plugins.md) · [page-conventions.md](page-conventions.md) |
| `full` | Optional · `true` for OpenAPI operation pages (generator sets this) |
| `_openapi` | Generated API pages only — [openapi.md](openapi.md) · [openapi-generate-files.md](openapi-generate-files.md) |

Validation: stock `pageSchema` / `metaSchema` on `defineDocs` — [fumadocs-mdx.md](fumadocs-mdx.md). Do **not** `.extend()` without a named schema reopen.

Missing `title` / `description` breaks metadata and confuses the sidebar.

---

## Page body habits

| Do | Don't |
|----|-------|
| One H1 via frontmatter `title` (Fumadocs page chrome) | Duplicate giant H1 in body that fights the layout |
| Short sections · one job each | Dashboard-style card grids in docs prose |
| Link to Scratch packs with relative repo paths when needed | Claim MDX is Controlled DOC-001 SSOT |
| Use Fumadocs UI MDX components from `getMDXComponents` | Import product `@afenda/ui-system` into docs MDX without an explicit slice |
| ` ```tsx ` for TypeScript examples | Invent install registries (`@8bitcn`, paid shadcn registries) |
| Prefer links over pasting API tables | Duplicate OpenAPI — use generated API pages |

Default MDX components: `apps/docs/components/mdx.tsx` (wraps `fumadocs-ui/mdx` + stock UI + `APIPage` / `OpenAPIPage`). Relative `./file.mdx` links: `createRelativeLink` on the page RSC — [ui-components.md](ui-components.md). `source.config.ts` sets `providerImportSource: "@/components/mdx"`.

---

## Native Fumadocs MDX (allowed)

Use stock components registered in `getMDXComponents` — **without** 8bitcn / registry installs.

**SSOT for the full catalog + status tags:** [ui-components.md](ui-components.md) (Shipped · Outside baseline · Banned). Layout / Themes (`neutral`) / Search UI: [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md).

Shipped shortlist: `Callout` · `Cards`/`Card` · `Tabs`/`Tab` · `Steps`/`Step` · `Files`/`Folder`/`File` · `Accordions`/`Accordion` · `TypeTable` · defaults from `fumadocs-ui/mdx` (incl. code blocks) · `APIPage`/`OpenAPIPage`.

**Do not use:** `ComponentPreview`, `CopyCommandButton`, `@8bitcn/*`, or product `@afenda/ui-system` in docs MDX — see Banned in [ui-components.md](ui-components.md).

Reference surface: `apps/docs/content/docs/guide.mdx`.

---

## Navigation

Sidebar order = `meta.json` `pages` arrays (folder + root). Keep names matching file slugs (no extension).

Full conventions (slugs · folder groups · root folders · icons · `pages` syntax): **[page-conventions.md](page-conventions.md)**.

```json
{
  "pages": ["index", "guide", "api"]
}
```

After adding a page: update the nearest `meta.json`, then `pnpm --filter @afenda/docs generate:source` and `lint:links` ([validate-links.md](validate-links.md)).

`api/meta.json` is owned by `generateFiles` (`meta: true`) — do not hand-maintain op slugs there across regenerations. Do not set `"root": true` (Layout Tabs off).

---

## Anti-patterns

| Anti-pattern | Why it hurts |
|--------------|--------------|
| Tutorial “hello world” filler | Noise for maintainers |
| Embedding secrets / env values | Docs project rules forbid product secrets |
| Deep links into Collapse / deleted `docs/api` Living paths | Index ghosts · wrong SSOT |
| Boolean-prop explosion in custom MDX components | Prefer explicit variants / composition |

---

## Component / registry skills — N/A

| Vendor skill | Lite stance |
|--------------|-------------|
| `fumadocs-component-docs` | N/A — 8bit preview / install patterns |
| `fumadocs-registry-integration` | N/A — no docs-app shadcn registry |

Product UI primitives stay on `@afenda/ui-system` + ADR-010 — document them in product docs when needed, not via 8bitcn registry entries.

---

## Verify

```text
1. Every content/docs/**/*.mdx has title + description frontmatter
2. pnpm --filter @afenda/docs generate:source
3. pnpm --filter @afenda/docs lint:links
4. pnpm --filter @afenda/docs typecheck
5. Spot-check /docs in browser (:3001) after content edits
```

Companion: [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [ui.md](ui.md) · [content.md](content.md) · [README.md](README.md) · [automation.md](automation.md).
