# Fumadocs UI layouts (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/ui-layouts.md` |
| Authority | **Scratch** — [ui.md](ui.md) status legend · disk `@afenda/docs` |
| Status | **Active** — official Docs shell (Navbar · Layout Links · sidebar) |
| Audience | Engineers changing docs shell, nav, or page chrome |
| Updated | 2026-07-19 |

Upstream layouts live under `fumadocs-ui/layouts/*`. Lite ships the **Docs** shell only. Status tags follow [ui.md](ui.md).

Navigation overview (Layout Links vs sidebar · versioning lock): [navigation.md](navigation.md).

Customize ladder (props → CSS → CLI fork): [customize-ui.md](customize-ui.md) — do not `fd:customize` without a named Docs slice.

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

Do **not** pass `search={{…}}` in baseline — stock Search UI + Orama fetch route. Dialog props: [ui.md](ui.md) Search UI. Engine: [search-orama.md](search-orama.md).

| Knob | Lite | Notes |
|------|------|-------|
| Framework provider | `provider/next` | Required for App Router |
| Light / dark (`next-themes`) | Default (enabled) | Stock theme switch — [ui.md](ui.md) Themes |
| Search UI | Default (enabled · preload · ⌘K/Ctrl+K) | No `search` prop — [ui.md](ui.md) Search UI |
| Banner (sibling above provider) | `app/layout.tsx` | [ui-components.md](ui-components.md) Banner |
| `theme` / i18n props | Default | UI chrome translations = outside baseline — [i18n.md](i18n.md) |
| `dir` RTL | Not set (LTR) | Outside baseline — [ui.md](ui.md) Themes |

---

## DocsLayout

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/app/docs/layout.tsx` |
| Import | `fumadocs-ui/layouts/docs` |
| Upstream | [Docs Layout](https://www.fumadocs.dev/docs/ui/layouts/docs) |

Documentation shell: sidebar + **mobile-only** navbar/header. Shared `nav` / `links` / `githubUrl` come from `baseOptions()` — see Navbar · Layout Links below.

### Shipped config

```tsx
// apps/docs/app/docs/layout.tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function DocsRootLayout({ children }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions()}
      sidebar={{
        enabled: true,
        collapsible: true,
        prefetch: false,
      }}
      tabs={false}
    >
      {children}
    </DocsLayout>
  );
}
```

### Props (layout)

| Prop | Lite | Notes |
|------|------|-------|
| `tree` | `source.pageTree` | Required — from `loader()` in `lib/source.ts` (not a hardcoded tree) |
| `nav` / `links` / `githubUrl` | via `{...baseOptions()}` | Do not re-declare on this file |
| `sidebar` | `{ enabled, collapsible, prefetch }` | See Sidebar below |
| `tabs` | `false` | Layout Tabs off — Guide/API are Layout Links, not root-folder tabs |
| `tabMode` | Not set | Outside baseline (`"top"` \| `"auto"`) |
| `themeSwitch` | Default | Stock light/dark control |
| `searchToggle` | Default | Stock search control — [ui.md](ui.md) Search UI |
| `containerProps` | Not set | Outside baseline |
| `slots` | Not set | Outside baseline |
| `i18n` | Not set | Deprecated upstream · outside baseline — [i18n.md](i18n.md) |

### Sidebar

| Status | **Shipped** |
|--------|-------------|
| Items | Rendered from `tree` ← file tree + `content/docs/**/meta.json` |

| Option | Default (upstream) | Lite |
|--------|--------------------|------|
| `enabled` | — | `true` |
| `collapsible` | `true` | `true` — desktop collapse supported |
| `prefetch` | Framework default | `false` — fewer prefetch hits on host platforms |
| `defaultOpenLevel` | `0` | Default — folders closed until opened |
| `banner` | — | Outside baseline (root `Banner` is separate — [ui-components.md](ui-components.md)) |
| `footer` | — | Outside baseline |
| `components` | — | Outside baseline (custom Separator / tree renderers) |
| `component` | — | Deprecated — outside baseline |

Sidebar labels / order: edit `content/docs/meta.json` and folder `meta.json` — [page-conventions.md](page-conventions.md) · [content.md](content.md). After edits: `pnpm --filter @afenda/docs generate:source`.

Do **not** hardcode `tree={{ name, children }}` — always use `source.pageTree` so OpenAPI-generated ops stay in sync.

### Layout Tabs

| Status | **Outside baseline** (`tabs={false}`) |
|--------|----------------------------------------|

Upstream Layout Tabs are folders with tab-like behaviour (dropdown unless an item is active), usually via `"root": true` in folder `meta.json` or an explicit `tabs={[…]}` array. Decoration via `tabs={{ transform }}`.

Lite disables them: primary sections are **Guide** and **API** Layout Links. Do not mark folders `"root": true` or pass a `tabs` array without a named Docs slice (then remove `tabs={false}` and update this pack).

### Layout system (CSS grid)

Fumadocs positions sidebar / header / TOC / main with `#nd-docs-layout` CSS variables (`--fd-sidebar-width`, `--fd-layout-width`, `--fd-docs-row-*`, …). Lite sets `--fd-layout-width: 1400px` in `app/global.css` — [ui.md](ui.md) Themes. Do not invent parallel layout CSS that fights those variables. Do not add invasive `#nd-*` / deep `data-*` child overrides — [customize-ui.md](customize-ui.md).

---

## Page chrome (DocsPage)

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/app/docs/[[...slug]]/page.tsx` |
| Import | `fumadocs-ui/layouts/docs/page` |

| Export | Role in Lite |
|--------|----------------|
| `DocsPage` | Page shell; receives `toc={page.data.toc}` — [get-toc.md](get-toc.md) |
| `DocsTitle` | Renders `page.data.title` (frontmatter) |
| `DocsDescription` | Renders `page.data.description` |
| `DocsBody` | MDX body; wraps OpenAPI preload when `_openapi` present |

Also wired:

| Concern | Disk / API |
|---------|------------|
| Relative MDX links | `a: createRelativeLink(source, page)` — **Shipped** — [ui-components.md](ui-components.md) Relative Link |
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

| Field | Value |
|-------|-------|
| `nav` | See Navbar |
| `githubUrl` | `https://github.com/pohlai88/afenda-lite` |
| `links` | Guide · API · custom `GithubInfo` (see Layout Links) |

`DocsLayout` spreads `{...baseOptions()}` — do **not** fork `nav` / `links` on the layout. Change header + links only in `layout.shared.tsx`. Banner lives on root layout — [ui-components.md](ui-components.md).

---

## Navbar

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/lib/layout.shared.tsx` → `baseOptions().nav` |
| Upstream | [Navbar](https://www.fumadocs.dev/docs/ui/layouts/nav) |

Header / navbar options under `BaseLayoutProps.nav`.

### Shipped config

```tsx
nav: {
  title: "Afenda-Lite Docs",
  url: "/docs",
  transparentMode: "none",
},
```

| Option | Type | Lite | Notes |
|--------|------|------|-------|
| `enabled` | `boolean` | Default (`true`) | Do not set `false` — stock header stays on |
| `title` | `ReactNode` \| FC | `"Afenda-Lite Docs"` | Brand string in the header |
| `url` | `string` | `"/docs"` | Title click target (upstream default `'/'`; Lite points at docs root) |
| `transparentMode` | `"always"` \| `"top"` \| `"none"` | `"none"` | Opaque header for Docs shell |
| `component` | `ReactNode` | Not set | Deprecated replace-navbar path — outside baseline |

### Transparent mode

| Mode | Description | Lite |
|------|-------------|------|
| `always` | Always transparent background | Outside baseline |
| `top` | Transparent only at page top | Outside baseline (Home / marketing) |
| `none` | Opaque background (upstream default) | **Shipped** — explicit |

Do not override `nav.transparentMode` on `DocsLayout` — keep it in `baseOptions()`.

### Replace navbar — Outside baseline

Setting `nav.component` swaps the entire header. Upstream also requires overriding `--fd-nav-height` in CSS to match the custom height:

```css
:root {
  --fd-nav-height: 80px !important;
}
```

Lite keeps the stock Fumadocs navbar. Do not set `nav.component` or `--fd-nav-height` without a named Docs slice.

### Where to set `nav`

| Surface | Lite |
|---------|------|
| `baseOptions().nav` | **Shipped** — single SSOT |
| `DocsLayout` `nav={{…}}` override | Do not — forks from `baseOptions` |
| `HomeLayout` transparent / custom nav | Outside baseline (no HomeLayout) |

---

## Layout Links

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/lib/layout.shared.tsx` → `baseOptions().links` + `githubUrl` |
| Upstream | [Layout Links](https://www.fumadocs.dev/docs/ui/layouts/links) |

Fumadocs adds navbar / sidebar nav items via the `links` prop on any layout that accepts `BaseLayoutProps`. Lite configures them once in `baseOptions()` and spreads into `DocsLayout`.

### Shipped config

```tsx
// apps/docs/lib/layout.shared.tsx
import { GithubInfo } from "fumadocs-ui/components/github-info";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BookOpen, CodeXml } from "lucide-react";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Afenda-Lite Docs",
      url: "/docs",
      transparentMode: "none",
    },
    githubUrl: "https://github.com/pohlai88/afenda-lite",
    links: [
      {
        icon: <BookOpen aria-hidden />,
        text: "Guide",
        url: "/docs/guide",
        active: "nested-url",
        secondary: false,
      },
      {
        icon: <CodeXml aria-hidden />,
        text: "API",
        url: "/docs/api",
        active: "nested-url",
        secondary: false,
      },
      {
        type: "custom",
        secondary: true,
        children: <GithubInfo owner="pohlai88" repo="afenda-lite" />,
      },
    ],
  };
}
```

| Item | Kind | Notes |
|------|------|-------|
| Guide | Link item | `/docs/guide` · `active: "nested-url"` |
| API | Link item | `/docs/api` · `active: "nested-url"` |
| `GithubInfo` | Custom item | Stars card · `secondary: true` · no token — [ui-components.md](ui-components.md) |
| Repo icon | `githubUrl` shortcut | Icon button to `pohlai88/afenda-lite` |

### Item types (upstream catalog)

#### Link item — **Shipped** (Guide · API)

Navigate to a URL (internal or external).

| Field | Lite |
|-------|------|
| `text` | Required label |
| `url` | Required href |
| `icon` | Lucide (`BookOpen` / `CodeXml`) |
| `secondary` | `false` — primary navbar treatment |
| `active` | See Active mode |

#### Active mode — **Shipped** (`nested-url`)

| Mode | When marked active | Lite |
|------|--------------------|------|
| `url` | Exact URL only | — |
| `nested-url` | URL and child pages (e.g. `/docs/api/…`) | **Shipped** on Guide + API |
| `none` | Never active | — |

#### Icon item — Outside baseline

Same as link item, shown as an icon button (`type: "icon"` + `label` for `aria-label`). Secondary by default. Lite uses `githubUrl` for the repo icon instead of a hand-rolled icon item.

#### Custom item — **Shipped** (`GithubInfo`)

```tsx
{
  type: "custom",
  secondary: true,
  children: <GithubInfo owner="pohlai88" repo="afenda-lite" />,
}
```

#### GitHub URL — **Shipped**

Shortcut that adds a GitHub repository icon link:

```tsx
githubUrl: "https://github.com/pohlai88/afenda-lite",
```

Coexists with the custom `GithubInfo` card (icon vs stars). Do not put a `GITHUB_TOKEN` on the docs app.

#### Normal menu — Outside baseline

`type: "menu"` with nested link items (`text` · `description` · `url`). Lite keeps Guide / API as flat link items for a short primary nav — do not collapse them into a menu without a named Docs slice.

#### Navigation menu (Home Layout) — Outside baseline

Animated `NavbarMenu` / `NavbarMenuTrigger` / `NavbarMenuContent` / `NavbarMenuLink` from `fumadocs-ui/layouts/home/navbar`. Requires `HomeLayout`. Lite has no HomeLayout (root → `/docs`).

### Where to set `links`

| Surface | Lite |
|---------|------|
| `baseOptions().links` | **Shipped** — single SSOT |
| `DocsLayout` `links={…}` override | Do not — would fork from `baseOptions` |
| `HomeLayout` `links={…}` | Outside baseline (no HomeLayout) |

---

## Outside baseline layouts

Not selected. Named Docs / FE slice required to add — not a backlog.

| Layout | Upstream import | Why Lite skips |
|--------|-----------------|----------------|
| **HomeLayout** | `fumadocs-ui/layouts/home` | Root redirects to `/docs`; no marketing home |
| **Notebook** | `fumadocs-ui/layouts/notebook` | Alternate docs chrome — not selected |
| **Flux** | (upstream layout variant) | Alternate docs chrome — not selected |
| Home **Navigation Menu** | `layouts/home/navbar` | Needs HomeLayout |
| Layout Links: `type: "icon"` / `type: "menu"` | Upstream item types | Flat Guide/API + `githubUrl` cover Lite |
| DocsLayout Layout Tabs / `tabMode` / root folders | Tab dropdown over root folders | `tabs={false}` |
| `sidebar.banner` · `footer` · `components` | Sidebar chrome / custom tree renderers | Stock sidebar |
| `nav.component` / `--fd-nav-height` | Replace stock navbar | Stock header only |
| `transparentMode: "top"` \| `"always"` | Marketing / Home chrome | Docs uses `"none"` |
| Custom `title` node / logo FC | Brand mark beyond title string | Title string only |
| Multi-layout sites | Mix Home + Docs trees | Single Docs tree under `/docs` |

If HomeLayout is ever opened: share the same `baseOptions()` for nav consistency; keep product secrets off the docs project ([README.md](README.md) docs project rules).

---

## Verify

```text
1. Test-Path apps/docs/app/layout.tsx · app/docs/layout.tsx · app/docs/[[...slug]]/page.tsx · lib/layout.shared.tsx
2. Grep: DocsLayout · RootProvider · DocsPage — only under apps/docs (no HomeLayout · NavbarMenu import)
3. Grep docs/layout: source.pageTree · sidebar.enabled · collapsible · prefetch: false · tabs={false}
4. Grep layout.shared: nav title · url: "/docs" · transparentMode: "none" · githubUrl · Guide/API links · GithubInfo
5. Grep: no nav.component · no --fd-nav-height · no hardcoded tree={{ in apps/docs
6. After layout edits: pnpm --filter @afenda/docs typecheck · wire test · spot-check :3001
```

Companion: [ui.md](ui.md) · [ui-components.md](ui-components.md) · [content.md](content.md).
