# Docs content tree (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/content.md` |
| Authority | **Scratch** — disk `apps/docs/content/docs` + `source.config.ts` |
| Audience | Engineers adding narrative pages or regenerating API MDX |
| Updated | 2026-07-19 |

**Content source (Fumadocs MDX vs CMS / Local Markdown / MDX Remote):** [content-source.md](content-source.md) · [sanity.md](sanity.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) (Outside).

**Page slugs · page tree · meta.json conventions:** [page-conventions.md](page-conventions.md) (SSOT).

---

## Layout (English-only)

```text
apps/docs/content/docs/
  index.mdx                 # Home — Callout + Cards (hand)
  guide.mdx                 # Maintainer guide — stock MDX surfaces (hand)
  meta.json                 # Root sidebar: index, guide, api, packages
  api/
    index.mdx               # API section intro — Callout + Cards (hand)
    meta.json               # From generateFiles meta: true (ops + index)
    <generated-op>.mdx      # generateFiles — do not hand-edit forever
  packages/
    index.mdx               # Packages section intro — Callout + Cards (hand)
    meta.json               # From generate:package-docs
    <pkg-slug>.mdx          # generate:package-docs — do not hand-edit
```

`source.config.ts` points `defineDocs({ dir: "content/docs" })` and `providerImportSource: "@/components/mdx"`. Loader `baseUrl: "/docs"` + `docs.toFumadocsSource()` — **not** BaseHub / Sanity / Payload — [content-source.md](content-source.md). Sidebar items come from this tree via `DocsLayout` `tree={source.pageTree}` — [ui-layouts.md](ui-layouts.md) DocsLayout.

Do **not** mark folders `"root": true` for Layout Tabs — Lite sets `tabs={false}` (Guide/API are Layout Links).

Do **not** add `permission` (or other access) frontmatter for gated Loader filters — public docs lock until reopen — [access-control.md](access-control.md).

**Fumadocs UI configuration** (theme, layouts, MDX component status): [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md) — not this file.

---

## Hand vs generated

| Kind | Own | Edit how | Git |
|------|-----|----------|-----|
| Narrative MDX (`index.mdx`, `guide.mdx`, section intros) | Humans | Direct edit | Commit |
| OpenAPI operation MDX | `generate:openapi-docs` | Regenerate after YAML change | Commit regenerated output |
| `api/meta.json` (ops listing) | Generator | Regenerate | Commit |
| Package pages (`packages/<slug>.mdx`) | `generate:package-docs` | Regenerate after package README / exports change | Commit regenerated output |
| `packages/meta.json` | Generator | Regenerate | Commit |
| `.source/**` | `fumadocs-mdx` | `generate:source` | **Gitignore** |

**Lifecycle:** change OAS → `pnpm openapi:generate` + `check:openapi` → `generate:openapi-docs` → commit new/changed op MDX + meta. Do not leave generated ops stale relative to committed YAML.

Package lifecycle: change `packages/*/package.json` or `README.md` → `generate:package-docs` → commit new/changed package MDX + meta. Outbound repo-relative README links are rewritten to GitHub blob URLs so `lint:links` stays green.

Hand `api/index.mdx` and `packages/index.mdx` are narrative landing pages; regenerators must **preserve** those files.

---

## Scripts

| Script | Role |
|--------|------|
| `generate:source` | `fumadocs-mdx` → `.source/` |
| `generate:openapi-docs` | `generateFiles({ input: openapi })` → EN operation MDX |
| `generate:package-docs` | `packages/*` → `content/docs/packages/<slug>.mdx` + meta |
| `lint:links` | `next-validate-link` over content — [validate-links.md](validate-links.md) |
| `predev` / `prebuild` | Ensure source (+ OpenAPI + package pages on build) |

See [automation.md](automation.md).

---

## Add a narrative page

```text
1. Add content/docs/<slug>.mdx with title + description
2. Append slug to content/docs/meta.json (or folder meta.json)
3. pnpm --filter @afenda/docs generate:source
4. pnpm --filter @afenda/docs lint:links
5. Verify /docs/<slug> on :3001
```

---

## Common pitfalls

| Pitfall | Result |
|---------|--------|
| Forget `meta.json` | Page builds but missing from sidebar |
| Edit generated op MDX by hand | Next `generate:openapi-docs` wipes the edit |
| Commit `.source/` | Noise + machine-local paths |

---

## Verify

```text
1. Test-Path apps/docs/content/docs/index.mdx
2. pnpm --filter @afenda/docs generate:source
3. pnpm --filter @afenda/docs generate:openapi-docs   # when OAS changed
4. pnpm --filter @afenda/docs generate:package-docs   # when packages/* changed
5. pnpm --filter @afenda/docs lint:links
6. pnpm --filter @afenda/docs build                   # SSG smoke
```

Companion: [page-conventions.md](page-conventions.md) · [practices.md](practices.md) · [ui.md](ui.md) · [openapi.md](openapi.md) · [automation.md](automation.md).
