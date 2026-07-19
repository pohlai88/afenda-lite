# Fumadocs Framework Mode — Page Slugs & Page Tree (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/page-conventions.md` |
| Authority | **Scratch** — upstream [Page Conventions](https://fumadocs.dev/docs/page-conventions) · disk `apps/docs/content/docs` + `loader()` |
| Status | **Active** — Fumadocs MDX + `loader()` · English tree · Layout Tabs off |
| Audience | Engineers adding pages or editing `meta.json` |
| Updated | 2026-07-19 |

Applies only to content sources using `loader()` (Lite: Fumadocs MDX — [content-source.md](content-source.md) · [loader-api.md](loader-api.md)). Routing is Next.js App Router (`/docs/[[...slug]]`); slugs and sidebar come from the content directory via [`lib/source.ts`](../../apps/docs/lib/source.ts).

Content lifecycle: [content.md](content.md). Frontmatter habits: [practices.md](practices.md). Navigation overview: [navigation.md](navigation.md). Tabs / sidebar chrome: [ui-layouts.md](ui-layouts.md). Locales: [i18n.md](i18n.md). Tree walk helpers: [page-tree-utils.md](page-tree-utils.md).

---

## Lite tree (configured)

```text
apps/docs/content/docs/
  meta.json                 # pages: index, guide, api
  index.mdx                 # slugs [] → /docs
  guide.mdx                 # slugs ['guide'] → /docs/guide
  api/
    meta.json               # title "HTTP API" · pages from generateFiles
    index.mdx               # slugs ['api'] → /docs/api
    <op>.mdx                # slugs ['api', '<op>'] → /docs/api/<op>
```

| Concern | Lite |
|---------|------|
| Content dir | `defineDocs({ dir: "content/docs" })` |
| Loader | `baseUrl: "/docs"` · `source.pageTree` → DocsLayout |
| Sidebar order | Explicit `meta.json` `pages` (not alphabetical-only) |
| Layout Tabs / `"root": true` | **Off** — `tabs={false}` · Guide/API are Layout Links |
| Folder groups `(name)` | Outside baseline — not used |
| Frontmatter `icon` + loader `icon` handler | Outside baseline — not wired |
| i18n `dot` / `dir` parsers | Outside baseline — [i18n.md](i18n.md) |

---

## File → slugs

| Path (under `content/docs`) | Slugs | URL |
|-----------------------------|-------|-----|
| `index.mdx` | `[]` | `/docs` |
| `guide.mdx` | `['guide']` | `/docs/guide` |
| `api/index.mdx` | `['api']` | `/docs/api` |
| `api/getHealthLiveness.mdx` | `['api', 'getHealthLiveness']` | `/docs/api/getHealthLiveness` |

Rules (upstream): `dir/page.mdx` → `['dir','page']` · `dir/index.mdx` → `['dir']`.

---

## Frontmatter (page info)

Required on every MDX page — [practices.md](practices.md):

| Field | Lite |
|-------|------|
| `title` | **Required** — DocsTitle + tree label |
| `description` | **Required** — metadata + cards |
| `icon` | Outside baseline — no loader icon map |
| `full` | Optional — OpenAPI generator may set |
| `_openapi` | Generated API pages only |

Do not extend frontmatter schema for access/icons without a named Docs slice.

---

## Meta (`meta.json`)

### Root (`content/docs/meta.json`)

```json
{
  "pages": ["index", "guide", "api"]
}
```

Configured: explicit order · all three sections listed · no separators/links/`...` rest syntax unless a named slice needs them.

### API folder (`content/docs/api/meta.json`)

Owned by `generate:openapi-docs` (`meta: true`): `title: "HTTP API"` + `pages` listing `index` then operation slugs. Do not hand-maintain op order across regenerations — [openapi.md](openapi.md) · [content.md](content.md).

### Supported upstream knobs (Lite usage)

| Knob | Lite |
|------|------|
| `pages` | **Shipped** — required for stable sidebar |
| `title` | **Shipped** on `api/` · optional elsewhere |
| `defaultOpen` / `collapsible` | Default upstream — unused in Lite meta |
| `pagesIndex` | Default (`index` file) — unused override |
| `"root": true` | **Forbidden** in baseline (Layout Tabs) |
| Separator / Link / Rest / Extract / Except in `pages` | Outside baseline |

**No duplicated URL** in the tree (upstream rule). Do not list the same page twice.

---

## Folder group & root folder

| Pattern | Lite |
|---------|------|
| `(group-name)/` slug-neutral folders | Outside baseline — not present |
| Root folder `"root": true` | Outside baseline — conflicts with `tabs={false}` |

Primary nav sections are **Guide** and **API** Layout Links in `lib/layout.shared.tsx`, not root folders — [ui-layouts.md](ui-layouts.md).

---

## Icons

**Active:** stock **`lucideIconsPlugin()`** on the docs loader — [loader-plugins.md](loader-plugins.md).

| Surface | Example |
|---------|---------|
| Page frontmatter | `icon: BookOpen` on [`guide.mdx`](../../apps/docs/content/docs/guide.mdx) |
| Folder `meta.json` | `"icon": "CodeXml"` on [`api/meta.json`](../../apps/docs/content/docs/api/meta.json) |

Use Lucide export names (PascalCase). Layout Links Lucide JSX in `baseOptions()` is unrelated to content-tree icons. Do **not** add a raw `loader({ icon })` handler beside the plugin.

---

## i18n routing

Outside baseline — English-only content root. No `*.cn.mdx` / `content/docs/en/` trees · no `app/[lang]` · no `defineI18n` — full Next.js Framework Mode ladder + reopen checklist: [i18n.md](i18n.md).

---

## Add a page (checklist)

```text
1. Add content/docs/<slug>.mdx with title + description
2. Append "<slug>" to the owning meta.json pages array
3. pnpm --filter @afenda/docs generate:source
4. pnpm --filter @afenda/docs lint:links
5. Verify /docs/<slug> · sidebar order · no duplicate URLs
```

OpenAPI ops: regenerate via `generate:openapi-docs` (updates `api/meta.json`).

---

## Hard stops

| Stop | Why |
|------|-----|
| `"root": true` without removing `tabs={false}` | Dual nav models — [ui-layouts.md](ui-layouts.md) |
| Page missing from `pages` when `pages` is set | Invisible in sidebar |
| Duplicate page URL in tree | Active-item resolution breaks |
| Hand-editing `api/meta.json` op list long-term | Generator wipe — [content.md](content.md) |
| i18n file layout without Docs i18n reopen | [i18n.md](i18n.md) |

---

## Verify

```text
1. content/docs/meta.json pages = index, guide, api
2. No meta.json contains "root": true
3. No (paren) folder groups under content/docs
4. lib/source.ts has no icon: handler
5. Wire test: page-conventions lock
6. pnpm --filter @afenda/docs generate:source · lint:links
```

Companion: [content.md](content.md) · [loader-api.md](loader-api.md) · [loader-plugins.md](loader-plugins.md) · [page-tree-utils.md](page-tree-utils.md) · [practices.md](practices.md) · [ui-layouts.md](ui-layouts.md) · [next.md](next.md) · [openapi.md](openapi.md).
