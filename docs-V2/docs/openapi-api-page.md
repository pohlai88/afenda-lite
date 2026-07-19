# Fumadocs Framework Mode — createOpenAPIPage() (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/openapi-api-page.md` |
| Authority | **Scratch** — upstream [createOpenAPIPage()](https://fumadocs.dev/docs/integrations/openapi/api-page) · disk `@afenda/docs` |
| Status | **Active** — stock client page + preload context · default code usages |
| Audience | Engineers changing OpenAPI playground / code-sample UI |
| Updated | 2026-07-19 |

The component for rendering OpenAPI docs content. Server / generateFiles / YAML SSOT: [openapi.md](openapi.md). UI i18n: [i18n.md](i18n.md) (Outside baseline).

---

## Overview (Lite)

`<OpenAPIPage />` from `createOpenAPIPage()` is a **client** component. Lite keeps stock factory options and wires preload via React context (SSG-safe).

| Piece | Disk |
|-------|------|
| Factory | [`components/api-page.tsx`](../../apps/docs/components/api-page.tsx) — `'use client'` |
| Call | `createOpenAPIPage()` — **no** custom options |
| MDX export | `APIPage` (reads preload) · registered as `OpenAPIPage` in `mdx.tsx` |
| Preload | `OpenAPIPreloadProvider` + `page.tsx` `preloadOpenAPIPage` |

```tsx
'use client';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

const OpenAPIPage = createOpenAPIPage(); // default codeUsages = registerDefault(…)

export function APIPage(props) {
  const preloaded = useOpenApiPreload();
  return <OpenAPIPage {...props} preloaded={preloaded} />;
}
```

Upstream `fumadocs-openapi` UI base defaults:

```text
codeUsages = registerDefault(createCodeUsageGeneratorRegistry())
```

So curl / fetch / language tabs work without an explicit registry in Lite.

---

## Generate code usages

| Mode | Lite |
|------|------|
| Default generators (`registerDefault`) | **Shipped** — via `createOpenAPIPage()` default |
| Explicit `createCodeUsageGeneratorRegistry` + `registerDefault` in app code | Optional equivalent — not required |
| Custom `codeUsages.add(…)` generators | **Outside baseline** |
| `console.log` inside generators | Banned (upstream sample only) |
| OAS `x-codeSamples` on operations | Allowed in product OAS when a named API slice adds them — not hand-edited into generated MDX |

Do not pass a custom `codeUsages` option without a named Docs OpenAPI UX slice.

---

## Internationalization

Upstream extends `openapiTranslations()` on UI i18n packs.

| Lite | Rule |
|------|------|
| `openapiTranslations` / `fumadocs-openapi/i18n` | **Outside baseline** |
| Multi-locale OpenAPI chrome | Blocked with Docs i18n — [i18n.md](i18n.md) |

English stock OpenAPI UI strings only.

---

## Media adapters

Upstream `mediaAdapters` map custom content types for playground encode + codegen.

| Lite | Rule |
|------|------|
| Custom `mediaAdapters` on `createOpenAPIPage` | **Outside baseline** |
| Stock JSON / form adapters from library defaults | **Shipped** (library defaults) |

Do not override `application/json` (or other) adapters without a named slice.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| Custom `codeUsages` registry entries | Stock `registerDefault` is enough |
| Custom `mediaAdapters` | Library defaults |
| `openapiTranslations` / locale OpenAPI strings | English-only — [i18n.md](i18n.md) |
| Passing server `openapi` into `createOpenAPIPage` | v11+ client factory — preload via provider |
| Soft-success / stub generators | No shims |

---

## Disk map

```text
apps/docs/
  components/api-page.tsx          # createOpenAPIPage() · provider · APIPage
  components/mdx.tsx               # OpenAPIPage: APIPage
  app/docs/[[...slug]]/page.tsx    # preloadOpenAPIPage → OpenAPIPreloadProvider
```

---

## Verify

```text
1. api-page.tsx: 'use client' · createOpenAPIPage() · no codeUsages/mediaAdapters args
2. APIPage + OpenAPIPreloadProvider present
3. No fumadocs-openapi/i18n · openapiTranslations imports
4. No createCodeUsageGeneratorRegistry in apps/docs (defaults inside library)
5. Wire test: openapi-api-page lock
6. Spot-check /docs/api/getHealthLiveness — playground + usage tabs
```

Companion: [openapi.md](openapi.md) · [openapi-server.md](openapi-server.md) · [i18n.md](i18n.md) · [ui-components.md](ui-components.md).
