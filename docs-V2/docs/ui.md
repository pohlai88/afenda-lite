# Fumadocs UI configuration (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/ui.md` |
| Authority | **Scratch** — upstream [Fumadocs UI](https://fumadocs.dev/docs/ui) catalog · disk `@afenda/docs` |
| Audience | Engineers configuring docs shell, theme, search, MDX UI |
| Updated | 2026-07-19 |

Fumadocs UI is the default theme package (`fumadocs-ui`) used by `@afenda/docs`. This chapter maps the **full upstream configuration surface** to Lite disk. It is not Controlled DOC-001 authority and not a second product UI SSOT (`@afenda/ui-system` stays on the web app).

Detail companions: [ui-layouts.md](ui-layouts.md) · [ui-components.md](ui-components.md). MDX authoring habits: [practices.md](practices.md).

---

## Status legend

Every surface in this pack uses one status:

| Status | Meaning |
|--------|---------|
| **Shipped** | Present on disk under `apps/docs` — document exact paths + knobs |
| **Documented / not wired** | Upstream capability; Lite does not use it yet — config shape only |
| **Out of scope** | Day-1 ban — do not wire without an explicit named slice |

Do not invent "how we use it" prose for **Documented / not wired** or **Out of scope** rows.

---

## Pack index

| Topic | File | Lite status (summary) |
|-------|------|------------------------|
| Theme / CSS presets | This file | **Shipped** — `neutral` + `preset` + OpenAPI preset |
| RootProvider · DocsLayout · page chrome · nav | [ui-layouts.md](ui-layouts.md) | Docs shell **Shipped**; Home / Notebook / Flux **not wired** |
| MDX + interactive components | [ui-components.md](ui-components.md) | Stock subset **Shipped**; Banner / ImageZoom / … **not wired** or banned |
| Search (Orama + dialog) | This file · [automation.md](automation.md) | **Shipped** — `createFromSource` |
| UI translation strings | [i18n.md](i18n.md) | **Documented / not wired** (EN-only Day-1) |
| Fumadocs CLI (local component install) | This file | **Documented / not wired** — package imports only |

---

## Theme / CSS

| Status | **Shipped** |
|--------|-------------|
| Disk | `apps/docs/app/global.css` |
| Package | `fumadocs-ui` (+ `fumadocs-openapi` preset for API pages) |

Lite imports:

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
| Color CSS | `fumadocs-ui/css/neutral.css` | Other upstream themes (e.g. `black`, `vitepress`, `ocean`) = **Documented / not wired** |
| Layout preset | `fumadocs-ui/css/preset.css` | Required with Fumadocs UI |
| OpenAPI styles | `fumadocs-openapi/css/preset.css` | API operation pages |
| Tailwind `@source` | `node_modules/fumadocs-ui` + `fumadocs-openapi` `dist` | Scans UI class names for Tailwind 4 |
| Layout width | `--fd-layout-width: 1400px` | Docs content max width token |

**Failure mode:** unknown utility `-inset-s-*` → Tailwind / PostCSS below 4.3 — see [README.md](README.md) failure table (`@afenda/docs` pins `^4.3.3`).

**Documented / not wired:** swapping theme CSS files, custom CSS-variable brand packs, dark-mode product branding beyond stock `neutral`.

---

## Search

| Status | **Shipped** |
|--------|-------------|
| Route | `apps/docs/app/api/search/route.ts` |
| API | `createFromSource` from `fumadocs-core/search/server` |
| Source | `lib/source.ts` loader |

```ts
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createFromSource(source);
```

| Knob | Lite | Notes |
|------|------|-------|
| Index | Built from `source` (MDX pages) | Run `generate:source` after content changes |
| Dialog | Stock Fumadocs UI search dialog | Wired via default `RootProvider` (no custom `search` prop) |
| Disable / replace dialog | — | **Documented / not wired** — upstream `RootProvider` `search={{ enabled, SearchDialog }}` |
| Algolia / Orama Cloud | — | **Documented / not wired** |

Ops detail: [automation.md](automation.md). Empty dialog / 404 → missing route or stale `.source/`.

---

## Fumadocs CLI

| Status | **Documented / not wired** |
|--------|----------------------------|
| Upstream | [Fumadocs CLI](https://fumadocs.dev/docs/cli) — install UI components as local source |

Lite Day-1 stance:

| Do | Don't |
|----|-------|
| Import from `fumadocs-ui/...` and `fumadocs-core/...` packages | Run CLI to copy components into `apps/docs` without a named slice |
| Extend `getMDXComponents` in `components/mdx.tsx` when adding stock UI | Treat CLI install as the default customization path |
| Keep registry / 8bitcn skills **Out of scope** | Invent a docs-app shadcn registry |

When a future slice needs local forks of UI components, reopen with an explicit Docs lane decision — not agent default.

---

## Translations (UI chrome strings)

| Status | **Documented / not wired** |
|--------|----------------------------|
| Content locales | English-only — [i18n.md](i18n.md) |
| UI `RootProvider` translations | Not configured — stock English chrome |

Do not add locale middleware or `content/docs/<lang>/` trees without the i18n checklist slice.

---

## Ground-truth disk map (UI)

```text
apps/docs/
  app/layout.tsx                 # RootProvider
  app/global.css                 # theme + presets + --fd-layout-width
  app/docs/layout.tsx            # DocsLayout + pageTree + baseOptions
  app/docs/[[...slug]]/page.tsx  # DocsPage / Title / Description / Body
  app/api/search/route.ts        # createFromSource
  lib/layout.shared.tsx          # BaseLayoutProps (nav · githubUrl · links)
  components/mdx.tsx             # getMDXComponents registry
  source.config.ts               # providerImportSource → @/components/mdx
  content/docs/guide.mdx         # existing MDX samples (reference only)
```

---

## Hard stops

| Stop | Why |
|------|-----|
| Fumadocs UI as product design system | Product primitives stay `@afenda/ui-system` |
| Claiming deferred layouts/components are live | Status legend — agents invent wiring |
| AutoTypeTable / Twoslash / 8bitcn registry | Day-1 **Out of scope** — [ui-components.md](ui-components.md) |
| Copying upstream `/docs/ui` MDX into `apps/docs/content` | Mirror ops + Scratch config, not a second Fumadocs marketing site |

---

## Verify (docs-only)

```text
1. Every Shipped claim in ui.md / ui-layouts.md / ui-components.md matches a real apps/docs path
2. practices.md points here for the component catalog (no conflicting dual tables)
3. README reading order includes ui → ui-layouts → ui-components
```

Companion: [README.md](README.md) · [practices.md](practices.md) · [automation.md](automation.md) · [i18n.md](i18n.md).
