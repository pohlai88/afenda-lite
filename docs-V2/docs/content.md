# Docs content tree (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/content.md` |
| Authority | **Scratch** — disk `apps/docs/content/docs` + `source.config.ts` |
| Audience | Engineers adding narrative pages or regenerating API MDX |
| Updated | 2026-07-19 |

---

## Layout (English-only)

```text
apps/docs/content/docs/
  index.mdx                 # Home — Callout + Cards (hand)
  guide.mdx                 # Maintainer guide — stock MDX surfaces (hand)
  meta.json                 # Root sidebar: index, guide, api
  api/
    index.mdx               # API section intro — Callout + Cards (hand)
    meta.json               # From generateFiles meta: true (ops + index)
    <generated-op>.mdx      # generateFiles — do not hand-edit forever
```

`source.config.ts` points `defineDocs({ dir: "content/docs" })` and `providerImportSource: "@/components/mdx"`. Loader `baseUrl: "/docs"`.

**Fumadocs UI configuration** (theme, layouts, MDX component status): [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md) — not this file.

---

## Hand vs generated

| Kind | Own | Edit how | Git |
|------|-----|----------|-----|
| Narrative MDX (`index.mdx`, `guide.mdx`, section intros) | Humans | Direct edit | Commit |
| OpenAPI operation MDX | `generate:openapi-docs` | Regenerate after YAML change | Commit regenerated output |
| `api/meta.json` (ops listing) | Generator | Regenerate | Commit |
| `.source/**` | `fumadocs-mdx` | `generate:source` | **Gitignore** |

**Lifecycle:** change OAS → `pnpm openapi:generate` + `check:openapi` → `generate:openapi-docs` → commit new/changed op MDX + meta. Do not leave generated ops stale relative to committed YAML.

Hand `api/index.mdx` is the narrative landing page; regenerating ops must **preserve** that file (generator clears other files under `api/` or writes only operation outputs + meta).

---

## Scripts

| Script | Role |
|--------|------|
| `generate:source` | `fumadocs-mdx` → `.source/` |
| `generate:openapi-docs` | `generateFiles({ input: openapi })` → EN operation MDX |
| `lint:links` | `next-validate-link` over content |
| `predev` / `prebuild` | Ensure source (+ OpenAPI pages on build) |

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
4. pnpm --filter @afenda/docs lint:links
5. pnpm --filter @afenda/docs build                   # SSG smoke
```

Companion: [practices.md](practices.md) · [ui.md](ui.md) · [openapi.md](openapi.md) · [automation.md](automation.md).
