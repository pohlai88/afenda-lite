# Fumadocs UI configuration (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/ui.md` |
| Authority | **Scratch** — upstream [Fumadocs UI](https://fumadocs.dev/docs/ui) catalog · disk `@afenda/docs` |
| Status | **Active** — official docs UI: Radix + Themes=`neutral` + Search UI (stock) + Docs shell + stock MDX |
| Audience | Engineers configuring docs shell, theme, search, MDX UI |
| Updated | 2026-07-19 |

Fumadocs UI is the default theme package (`fumadocs-ui`) used by `@afenda/docs`. This chapter maps Lite’s **shipped** configuration. It is not Controlled DOC-001 authority and not a second product UI SSOT (`@afenda/ui-system` stays on the web app).

Detail companions: [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md). MDX authoring habits: [practices.md](practices.md).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Shipped** | Present on disk under `apps/docs` — document exact paths + knobs |
| **Outside baseline** | Intentionally not selected. Not open work. Add only with a named Docs slice |
| **Banned** | Standing ban — do not wire |

Do not invent "how we use it" prose for **Outside baseline** or **Banned** rows. Outside-baseline rows are not open backlog — named Docs slice only.

---

## Pack index

| Topic | File | Lite status |
|-------|------|-------------|
| Headless component library | This file | **Shipped** — Radix UI (`fumadocs-ui`, not Base UI alias) |
| Themes (colors · layout width · light/dark) | This file | **Shipped** — `neutral` + `preset` + OpenAPI · width `1400px` |
| RootProvider · DocsLayout · Navbar · Layout Links | [ui-layouts.md](ui-layouts.md) | **Shipped** — `tree` + sidebar · `tabs={false}` · `baseOptions()` |
| Components (full catalog) | [ui-components.md](ui-components.md) | **Shipped** — Accordion → Type Table + Banner · GithubInfo · Graph View |
| Search UI + Orama index | This file · [search-orama.md](search-orama.md) · [next.md](next.md) | **Shipped** — stock dialog + fetch `createFromSource` · `language: "english"` |
| Framework Mode (Next.js) | [next.md](next.md) | **Shipped** — createMDX · collections · source loader |
| UI translation strings | [i18n.md](i18n.md) | **Outside baseline** — EN stock chrome |
| Fumadocs CLI | [cli.md](cli.md) | **Active** — `cli.json` · pinned `@fumadocs/cli` · Graph View installed |
| Customize UI ladder | [customize-ui.md](customize-ui.md) | **Active** — props first · CSS tokens · `fd:customize` Outside baseline |
| next/og Metadata Image | [og-next.md](og-next.md) | **Shipped** — `fumadocs-ui/og` · neutral accents |

---

## Component library (Radix UI)

| Status | **Shipped** |
|--------|-------------|
| Upstream | [Component Library](https://fumadocs.dev/docs/ui/component-library) — Base UI default · Radix opt-in |
| Disk | `apps/docs/package.json` → `"fumadocs-ui": "^16.10.5"` (direct; resolves Radix build) |
| Wire test | `apps/docs/__tests__/docs-openapi-wire.test.ts` — rejects `@fumadocs/base-ui` alias |

Upstream ships two headless stacks. Lite locks **Radix UI** so docs chrome stays aligned with product `@afenda/ui-system` (Radix / `radix-ui` catalog).

| Knob | Lite value | Notes |
|------|------------|-------|
| Package | `fumadocs-ui` installed **directly** | npm description: "The Radix UI version of Fumadocs UI" |
| Base UI alias | **Banned** | Do **not** set `"fumadocs-ui": "npm:@fumadocs/base-ui@…"` or add `@base-ui/react` for docs |
| CLI `uiLibrary` | `"radix-ui"` in `cli.json` | **Required** — [cli.md](cli.md); never `"base-ui"` |

```json
{
  "dependencies": {
    "fumadocs-ui": "^16.10.5"
  }
}
```

**Failure mode:** accidental Base UI cutover via package alias **or** `cli.json` `"uiLibrary": "base-ui"` → different primitive APIs under the same `fumadocs-ui/*` import paths. Keep the direct dependency + `cli.json` Radix lock + wire test green.

---

## Themes

| Status | **Shipped** |
|--------|-------------|
| Upstream | [Themes](https://fumadocs.dev/docs/ui/theme) |
| Disk | `apps/docs/app/global.css` · `app/layout.tsx` (`RootProvider`) |
| Wire test | `docs-openapi-wire.test.ts` — locks `neutral.css` + `preset.css` |

Tailwind CSS **v4 only**. The Fumadocs preset includes colors, animations, utilities, and `prose` typography (forked Tailwind Typography — do not add `@tailwindcss/typography` without renaming its class).

### Setup (Lite)

```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";
@import "fumadocs-openapi/css/preset.css";

@source "../../../node_modules/fumadocs-ui/dist/**/*.{js,mjs}";
@source "../../../node_modules/fumadocs-openapi/dist/**/*.{js,mjs}";

:root {
  --fd-layout-width: 1400px;
}
```

| Knob | Lite value | Notes |
|------|------------|-------|
| Color theme | **`neutral`** | Locked — see list below |
| Layout preset | `fumadocs-ui/css/preset.css` | Required with Fumadocs UI |
| OpenAPI styles | `fumadocs-openapi/css/preset.css` | API operation pages |
| Tailwind `@source` | `fumadocs-ui` + `fumadocs-openapi` `dist` | Class scan for Tailwind 4 |
| Layout width | `--fd-layout-width: 1400px` | Docs content max width |
| Light / dark | Stock `RootProvider` (`next-themes`) | Default toggle — no custom theme provider |
| Preflight | Fumadocs preset | Border / text / background defaults change — expected |

**Failure mode:** unknown utility `-inset-s-*` → Tailwind / PostCSS below 4.3 — see [README.md](README.md) (`@afenda/docs` pins `^4.3.3`).

### Color themes — configure list

Import one color file plus `preset.css`:

```css
@import "fumadocs-ui/css/<theme>.css";
@import "fumadocs-ui/css/preset.css";
```

Color presets present in `fumadocs-ui/css/` (verified against installed package):

| Theme file | Lite |
|------------|------|
| **`neutral`** | **Shipped** — selected (`apps/docs/app/global.css`) |
| `black` | Outside baseline |
| `vitepress` | Outside baseline |
| `dusk` | Outside baseline |
| `catppuccin` | Outside baseline |
| `ocean` | Outside baseline |
| `purple` | Outside baseline |
| `solar` | Outside baseline |
| `emerald` | Outside baseline |
| `ruby` | Outside baseline |
| `aspen` | Outside baseline |
| `shadcn` | Outside baseline — adopts Shadcn CSS vars; do **not** wire to product `@afenda/ui-system` without a named slice |

Not color themes: `preset.css` (required), `preset-legacy.css`, `style.css`. Swap color file only under a named Docs slice and keep the wire test in sync. Custom `@theme { --color-fd-* }` overrides = outside baseline.

### Light / dark · RTL · typography

| Surface | Lite | Notes |
|---------|------|-------|
| Light / dark | **Shipped** | Included via `RootProvider` / `next-themes` — [ui-layouts.md](ui-layouts.md) |
| RTL (`dir="rtl"` on `body` + `RootProvider`) | Outside baseline | LTR English docs |
| `prose` / `prose-sm` | **Shipped** (via preset) | Used by Fumadocs MDX body; avoid conflicting `@tailwindcss/typography` |

---

## Search UI

| Status | **Shipped** |
|--------|-------------|
| Upstream | [Search UI](https://fumadocs.dev/docs/ui/search) · [Orama](https://fumadocs.dev/docs/search/orama) |
| Dialog / chrome | `apps/docs/app/layout.tsx` — stock `<RootProvider>` (no `search` prop) |
| Index API | `apps/docs/app/api/search/route.ts` — [search-orama.md](search-orama.md) |
| Wire test | `docs-openapi-wire.test.ts` — Orama + bare `RootProvider` |

Search UI is customized from [`RootProvider`](https://fumadocs.dev/docs/ui/layouts/root-provider). Lite keeps **defaults** (enabled dialog, preload, ⌘K / Ctrl+K). Orama engine / fetch vs static / tag filter: **[search-orama.md](search-orama.md)**.

### Dialog (`RootProvider`)

```tsx
// apps/docs/app/layout.tsx
import { RootProvider } from "fumadocs-ui/provider/next";

<html lang="en" suppressHydrationWarning>
  <body className="flex min-h-screen flex-col">
    <RootProvider>{children}</RootProvider>
  </body>
</html>
```

| `search` option | Default | Lite |
|-----------------|---------|------|
| `enabled` | `true` | **Shipped** — leave default (do not pass `search` prop) |
| `preload` | `true` | **Shipped** — default |
| `hotKey` | Meta/Ctrl + `K` | **Shipped** — default |
| `links` (SearchDialog empty state) | — | Outside baseline — not Layout Links (`baseOptions().links`) |
| `SearchDialog` | Stock dialog | Outside baseline — custom / Algolia / Typesense dialog |
| `options` | — | Outside baseline — extra dialog props |
| Custom UI (`fumadocs-ui/components/dialog/search` + `useDocsSearch`) | — | Outside baseline |
| Content renderer / `renderMarkdown` | Stock (`<mark />` highlights) | Outside baseline |

Disable (`enabled: false`), replace `SearchDialog`, or change `hotKey` only under a named Docs slice — then update the wire test.

### Index (`createFromSource`)

Full Orama map (fetch · static · replace dialog · tags): **[search-orama.md](search-orama.md)**.

```ts
// apps/docs/app/api/search/route.ts
export const { GET } = createFromSource(source, {
  language: "english",
});
```

Ops: [automation.md](automation.md). Empty dialog / 404 → missing route or stale `.source/`.

---

## Fumadocs CLI

Full guide: **[cli.md](cli.md)** — init · `add` · `customize` · `tree` · `cli.json` · scripts.

| Status | **Active** |
|--------|------------|
| Config | `apps/docs/cli.json` · `"uiLibrary": "radix-ui"` |
| Package | `@fumadocs/cli` · scripts `fd` / `fd:add` / `fd:add:silent` / `fd:customize` / `fd:tree` |
| Installed | Full Radix UI set under `components/` · Graph View · Feedback (Discussions) — [cli.md](cli.md) · [ui-components.md](ui-components.md) |

MDX wires local `@/components/*`. Package imports remain for `fumadocs-ui/mdx` defaults fallback, `DynamicCodeBlock`, layouts, and provider.

---

## Translations (UI chrome strings)

| Status | **Outside baseline** |
|--------|----------------------|
| Content locales | English-only — [i18n.md](i18n.md) |
| UI `RootProvider` translations | Not configured — stock English chrome |

---

## Ground-truth disk map (UI)

```text
apps/docs/
  cli.json                       # Fumadocs CLI — uiLibrary radix-ui ([cli.md](cli.md))
  app/layout.tsx                 # RootProvider (Themes light/dark + Search UI defaults)
  app/global.css                 # Themes: neutral + presets + --fd-layout-width
  app/docs/layout.tsx            # DocsLayout — pageTree · sidebar · tabs={false} · baseOptions
  app/docs/[[...slug]]/page.tsx  # DocsPage / Title / Description / Body
  app/api/search/route.ts        # Search index: createFromSource
  lib/layout.shared.tsx          # Navbar + Layout Links (title · /docs · transparentMode none · Guide/API · GithubInfo)
  components/mdx.tsx             # getMDXComponents registry
  source.config.ts               # providerImportSource → @/components/mdx
  content/docs/guide.mdx         # existing MDX samples (reference only)
```

---

## Hard stops

| Stop | Why |
|------|-----|
| Fumadocs UI as product design system | Product primitives stay `@afenda/ui-system` |
| Aliasing `fumadocs-ui` → `@fumadocs/base-ui` | Lite component library lock is **Radix** |
| `cli.json` `"uiLibrary": "base-ui"` | CLI must stay Radix — [cli.md](cli.md) |
| Swapping color theme off `neutral` without a named slice | Theme lock — wire test |
| Wiring `shadcn.css` to product ui-system tokens by accident | Separate design systems |
| Custom / disabled Search UI without a named slice | Search UI lock — stock `RootProvider` |
| Claiming outside-baseline layouts/components are live | Status legend |
| 8bitcn registry / ComponentPreview | **Banned** — [ui-components.md](ui-components.md) |
| Copying upstream `/docs/ui` MDX into `apps/docs/content` | Official docs content + Scratch config — not a second Fumadocs marketing site |

---

## Verify (docs-only)

```text
1. apps/docs/app/global.css matches Themes Setup (neutral + preset + openapi + --fd-layout-width: 1400px)
2. app/layout.tsx: Banner + bare RootProvider; app/api/search/route.ts uses createFromSource
3. Every Shipped claim in ui.md / ui-layouts.md / ui-components.md matches a real apps/docs path
4. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [README.md](README.md) · [practices.md](practices.md) · [automation.md](automation.md) · [i18n.md](i18n.md).
