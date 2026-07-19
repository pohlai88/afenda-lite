# Fumadocs UI layouts (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/ui-layouts.md` |
| Authority | **Scratch** — [ui.md](ui.md) status legend · disk `@afenda/docs` |
| Audience | Engineers changing docs shell, nav, or page chrome |
| Updated | 2026-07-19 |

Upstream layouts live under `fumadocs-ui/layouts/*`. Lite ships the **Docs** shell only. Status tags follow [ui.md](ui.md).

---

## Shipped stack

```text
RootProvider (app/layout.tsx)
  └─ DocsLayout (app/docs/layout.tsx)  ← tree + baseOptions()
       └─ DocsPage + Title/Description/Body ([[...slug]]/page.tsx)
```

Home redirect: `app/page.tsx` → `/docs` (no `HomeLayout`).

---

## RootProvider

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/app/layout.tsx` |
| Import | `fumadocs-ui/provider/next` |

```tsx
import { RootProvider } from "fumadocs-ui/provider/next";

<html lang="en" suppressHydrationWarning>
  <body className="flex min-h-screen flex-col">
    <RootProvider>{children}</RootProvider>
  </body>
</html>
```

| Knob | Lite | Notes |
|------|------|-------|
| Framework provider | `provider/next` | Required for App Router |
| `search` | Default (enabled) | Custom dialog / disable = **Documented / not wired** — see [ui.md](ui.md) Search |
| `theme` / i18n props | Default | UI chrome translations = **Documented / not wired** — [i18n.md](i18n.md) |

---

## DocsLayout

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/app/docs/layout.tsx` |
| Import | `fumadocs-ui/layouts/docs` |

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function DocsRootLayout({ children }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
```

| Prop / concern | Lite | Notes |
|----------------|------|-------|
| `tree` | `source.pageTree` | From fumadocs-mdx loader — regenerate via `generate:source` |
| Shared options | `{...baseOptions()}` | See BaseLayoutProps below |
| Sidebar / folder meta | `content/docs/**/meta.json` | [content.md](content.md) |

---

## Page chrome (DocsPage)

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/app/docs/[[...slug]]/page.tsx` |
| Import | `fumadocs-ui/layouts/docs/page` |

| Export | Role in Lite |
|--------|----------------|
| `DocsPage` | Page shell; receives `toc={page.data.toc}` |
| `DocsTitle` | Renders `page.data.title` (frontmatter) |
| `DocsDescription` | Renders `page.data.description` |
| `DocsBody` | MDX body; wraps OpenAPI preload when `_openapi` present |

Also wired:

| Concern | Disk / API |
|---------|------------|
| Relative MDX links | `createRelativeLink(source, page)` from `fumadocs-ui/mdx` |
| MDX components | `getMDXComponents` — [ui-components.md](ui-components.md) |
| OpenAPI preload | `OpenAPIPreloadProvider` — [openapi.md](openapi.md) |
| Metadata | `generateMetadata` from frontmatter title / description |
| Static params | `source.generateParams()` |

Do not duplicate a giant H1 in MDX body — title comes from frontmatter + `DocsTitle` ([practices.md](practices.md)).

---

## BaseLayoutProps (`baseOptions`)

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/lib/layout.shared.tsx` |
| Type | `BaseLayoutProps` from `fumadocs-ui/layouts/shared` |

Lite knobs today:

| Field | Value |
|-------|-------|
| `nav.title` | `"Afenda-Lite Docs"` |
| `githubUrl` | `https://github.com/pohlai88/afenda-lite` |
| `links` | Guide → `/docs/guide` · API → `/docs/api` (`active: "nested-url"`, Lucide icons) |

```tsx
export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Afenda-Lite Docs" },
    githubUrl: "https://github.com/pohlai88/afenda-lite",
    links: [
      { icon: <BookOpen />, text: "Guide", url: "/docs/guide", active: "nested-url" },
      { icon: <Code2 />, text: "API", url: "/docs/api", active: "nested-url" },
    ],
  };
}
```

**Documented / not wired** (upstream `BaseLayoutProps` / nav extras — not configured in Lite):

| Surface | Typical use |
|---------|-------------|
| Custom `nav` children / logo slots | Brand mark beyond title string |
| Extra `links` modes | Menu / button / icon-only variants beyond current entries |
| Banner slot on layout | Site-wide announcement chrome — also see Banner component in [ui-components.md](ui-components.md) |

Change nav here; do not fork `DocsLayout` for title/link edits.

---

## Deferred layouts (Documented / not wired)

Do **not** wire without an explicit Docs / FE slice. Config shape only.

| Layout | Upstream import | Why Lite skips (Day-1) |
|--------|-----------------|------------------------|
| **HomeLayout** | `fumadocs-ui/layouts/home` | Root redirects to `/docs`; no marketing home |
| **Notebook** | `fumadocs-ui/layouts/notebook` | Alternate docs chrome — not selected |
| **Flux** | (upstream layout variant) | Alternate docs chrome — not selected |
| Layout **links** / **nav** deep recipes | Upstream `/docs/ui/layouts/links` · `nav` | Lite uses `baseOptions().links` only |
| Multi-layout sites | Mix Home + Docs trees | Single Docs tree under `/docs` |

When reopening HomeLayout: share the same `baseOptions()` for nav consistency; keep product secrets off the docs project ([README.md](README.md) Day-1 rules).

---

## Verify

```text
1. Test-Path apps/docs/app/layout.tsx · app/docs/layout.tsx · app/docs/[[...slug]]/page.tsx · lib/layout.shared.tsx
2. Grep: DocsLayout · RootProvider · DocsPage — only under apps/docs (no HomeLayout import)
3. After nav edits: pnpm --filter @afenda/docs typecheck · spot-check :3001
```

Companion: [ui.md](ui.md) · [ui-components.md](ui-components.md) · [content.md](content.md).
