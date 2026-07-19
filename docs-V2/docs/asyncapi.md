# Fumadocs Framework Mode — AsyncAPI (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/asyncapi.md` |
| Authority | **Scratch** — upstream [AsyncAPI](https://fumadocs.dev/docs/integrations/asyncapi) · [`createAsyncAPI()`](https://fumadocs.dev/docs/integrations/asyncapi/server) · [`createAsyncAPIPage()`](https://fumadocs.dev/docs/integrations/asyncapi/api-page) · [`generateFiles()`](https://fumadocs.dev/docs/integrations/asyncapi/generate-files) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `@fumadocs/asyncapi` · no `createAsyncAPI` server · no AsyncAPI schema / generator |
| Audience | Engineers evaluating event/message API docs beside OpenAPI |
| Updated | 2026-07-19 |

Upstream documents AsyncAPI schemas with `@fumadocs/asyncapi` (`createAsyncAPI`, client `createAsyncAPIPage` → `<AsyncAPIPage />`, MDX `generateFiles` or Loader `staticSource`). Lite ships **OpenAPI HTTP only** via `fumadocs-openapi` — [openapi.md](openapi.md).

Official docs surface today: narrative guide + **REST** api-now pages. There is no product AsyncAPI machine SSOT under `docs-V2/api/`.

Framework Mode shell: [next.md](next.md). HTTP API consumer: [openapi.md](openapi.md). i18n (also Outside baseline): [i18n.md](i18n.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| No `@fumadocs/asyncapi` | `@afenda/docs` `package.json` |
| No AsyncAPI server module | `lib/asyncapi.ts` / `lib/asyncapi.server.ts` **absent** — no `createAsyncAPI` |
| HTTP server twin (Active) | [`lib/openapi.server.ts`](../../apps/docs/lib/openapi.server.ts) — `createOpenAPI` only (server-side) |
| No AsyncAPI UI module | No `components/asyncapi-page.tsx` · no `createAsyncAPIPage` |
| No AsyncAPI schema file | No `asyncapi.yaml` under `apps/docs` or `docs-V2/api/` |
| No AsyncAPI CSS preset | [`app/global.css`](../../apps/docs/app/global.css) — OpenAPI preset only |
| Loader plugins | [`lib/source.ts`](../../apps/docs/lib/source.ts) — `openapi.loaderPlugin()` only |
| HTTP API page component | [`components/api-page.tsx`](../../apps/docs/components/api-page.tsx) — `createOpenAPIPage` + `OpenAPIPreloadProvider` **only** |
| MDX registry | No `AsyncAPIPage` — OpenAPI `APIPage` / `OpenAPIPage` only |
| No AsyncAPI i18n pack | No `asyncapiTranslations` · English-only — [i18n.md](i18n.md) |
| No AsyncAPI generator script | Only [`scripts/generate-openapi-docs.mts`](../../apps/docs/scripts/generate-openapi-docs.mts) (`fumadocs-openapi`) |
| Generated content | `content/docs/api/**` with `_openapi` frontmatter — no `_asyncapi` pages |

Wire test enforces the absences above. Active HTTP generator: [openapi.md](openapi.md) · [automation.md](automation.md).

---

## Upstream ladder (reference only)

Do **not** paste these into Lite without a named Docs AsyncAPI reopen + Scratch update + machine schema SSOT.

### 1. Packages · styles

```bash
# Upstream — NOT Lite
pnpm add @fumadocs/asyncapi shiki
```

```css
/* Upstream — NOT Lite */
@import "@fumadocs/asyncapi/css/preset.css";
```

### 2. Server · UI · loader plugin

Server instance: see [`createAsyncAPI()`](#createasyncapi-reference-only) below. UI + loader remain reference-only until reopen.

```tsx
// Separate UI module — NOT Lite (never overwrite OpenAPI api-page.tsx)
"use client";
import { createAsyncAPIPage } from "@fumadocs/asyncapi/ui";
export const AsyncAPIPage = createAsyncAPIPage();
```

```ts
// loader plugins — NOT Lite beside openapi without reopen plan
plugins: [openapi.loaderPlugin() /* , asyncapiPlugin() */],
```

### 3. Generate pages

| Mode | Upstream |
|------|----------|
| **MDX files** | `@fumadocs/asyncapi` `generateFiles({ input: asyncapi, … })` — see below · still renders via `<AsyncAPIPage />` |
| **Virtual / Loader** | `asyncapi.staticSource({ baseDir })` + `asyncapi.loaderPlugin()` — changes page types (`page.type === "asyncapi"`) |

Virtual mode requires updating every `source` consumer (page renderer, LLM text helpers — [llms.md](llms.md)).

### 4. Features (upstream)

Send/receive ops · channels · messages · replies · payloads/headers · security · examples · bindings/traits.

Demo: [Fumadocs AsyncAPI example](https://github.com/fuma-nama/fumadocs/blob/dev/examples/asyncapi).

---

## `createAsyncAPI()` (reference only)

Upstream: server-side AsyncAPI config instance — [createAsyncAPI()](https://fumadocs.dev/docs/integrations/asyncapi/server). **Must not** be imported in browser / client components.

Lite has **no** call site. HTTP twin: `createOpenAPI` in [`lib/openapi.server.ts`](../../apps/docs/lib/openapi.server.ts) with document id `../../docs-V2/api/OPEN-001-openapi.yaml`.

On reopen: add e.g. `lib/asyncapi.server.ts` (server-only) with a single document-id string shared by `createAsyncAPI`, generator, and MDX preload — mirror the OpenAPI contract in [openapi.md](openapi.md). Do **not** put AsyncAPI YAML under `apps/docs/` as a second SSOT copy.

### `input`

Schemas to load:

| Form | Example |
|------|---------|
| File paths | `input: ["./streetlights.yaml"]` or Scratch-relative path under `docs-V2/api/` |
| External URLs | path/URL strings per upstream |
| Functions | `input: { [id]: async () => string }` — fetch/return schema text |

```ts
// Upstream basic — NOT Lite
import { createAsyncAPI } from "@fumadocs/asyncapi/server";

export const asyncapi = createAsyncAPI({
  input: ["./streetlights.yaml"],
});
```

```ts
// Upstream functions — NOT Lite
export const asyncapi = createAsyncAPI({
  input: {
    galaxy: async () => {
      const res = await fetch("https://example.com/asyncapi.yaml");
      return res.text();
    },
  },
});
```

Lite reopen default: **file path** to a committed Scratch machine file (not a live remote fetch as SSOT) unless an Approved ops slice says otherwise.

### `disableCache`

```ts
// Upstream — NOT Lite
export const asyncapi = createAsyncAPI({
  input: ["./asyncapi.yaml"],
  disableCache: true, // useful when schemas change often in local dev
});
```

Production / CI: leave cache enabled unless reopen docs a reason.

---

## `createAsyncAPIPage()` (reference only)

Upstream: client factory for rendering AsyncAPI page bodies — [createAsyncAPIPage()](https://fumadocs.dev/docs/integrations/asyncapi/api-page). Lite has **no** call site; HTTP uses `createOpenAPIPage` in `components/api-page.tsx`.

On reopen, put this in a **dedicated** file (e.g. `components/asyncapi-page.tsx`), not in the OpenAPI module.

### Overview

```tsx
// Upstream — NOT Lite
"use client";
import { createAsyncAPIPage } from "@fumadocs/asyncapi/ui";

export const AsyncAPIPage = createAsyncAPIPage({
  // config
});
```

### Custom layout

```tsx
// Upstream — NOT Lite
export const AsyncAPIPage = createAsyncAPIPage({
  content: {
    renderOperationLayout(slots) {
      return (
        <div className="flex flex-col gap-6">
          {slots.header}
          {slots.description}
          {slots.channel}
          {slots.messages}
          {slots.messageExamples}
        </div>
      );
    },
  },
});
```

### Schema UI

```tsx
// Upstream — NOT Lite
export const AsyncAPIPage = createAsyncAPIPage({
  schemaUI: {
    showExample: true,
    render(options, ctx) {
      return ctx.SchemaUI(options);
    },
  },
});
```

### Internationalization

Requires UI-level i18n first — Lite i18n is Outside baseline — [i18n.md](i18n.md).

```tsx
// Upstream — NOT Lite
import { asyncapiTranslations } from "@fumadocs/asyncapi/i18n";

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .extend(asyncapiTranslations())
  .add({
    cn: {
      displayName: "Chinese",
      "Messages(operation page)": "消息",
    },
  });
```

### Syntax highlighting

AsyncAPI pages use Shiki. Optional `shiki` / `shikiOptions` on the factory (themes, `defaultShikiFactory` from `fumadocs-core/highlight/shiki/full`).

### Custom components

Override `components.Heading` / `components.CodeBlock` on the factory when stock chrome is insufficient.

---

## `generateFiles()` (reference only)

Upstream: writes MDX shells that arrange which AsyncAPI operations each page renders — body still comes from `<AsyncAPIPage />` — [generateFiles()](https://fumadocs.dev/docs/integrations/asyncapi/generate-files).

Lite has **no** AsyncAPI generator. HTTP uses `fumadocs-openapi` `generateFiles` in `scripts/generate-openapi-docs.mts` (`per: "operation"`, `meta: true`, preserves hand `api/index.mdx`).

Do **not** call `@fumadocs/asyncapi` `generateFiles` from the OpenAPI script or write into `content/docs/api/` (OpenAPI SSOT tree).

### Usage

```ts
// Upstream — NOT Lite
import { generateFiles } from "@fumadocs/asyncapi";
import { asyncapi } from "@/lib/asyncapi";

void generateFiles({
  input: asyncapi,
  output: "./content/docs", // pick a dedicated tree on reopen — not content/docs/api
});
```

### `per` (default `operation`)

Operation = AsyncAPI op + action (e.g. `receiveLightMeasurement:receive`).

| mode | content | file path |
|------|---------|-----------|
| `tag` | ops with same tag | `{tag_name}.mdx` |
| `file` | ops in same schema file | `{file_name}.mdx` |
| `operation` | each operation | `{operationId}.mdx` |
| `custom` | `toPages(builder)` | N/A |

Tag pages: schema `tags[].x-displayName` controls title.

`custom` uses `builder.extract()` / `fromExtractedOperation` / `builder.create(OperationOutput)`.

### `groupBy` (`per: "operation"` only)

| value | output |
|-------|--------|
| `tag` | `{tag}/{operationId}.mdx` |
| `channel` | `{channel_address}/{operationId}.mdx` |
| `none` (default) | `{operationId}.mdx` |

### `index` · `meta` · `imports` · `name` · `frontmatter` · `addGeneratedComment`

| Option | Role |
|--------|------|
| `index` | Card index MDX (`url.baseUrl` / `contentDir` · `items[].path` / `only` / description) |
| `meta` | Auto `meta.json` (`true` or `{ folderStyle: "separator" }`) — or hand-write — [page-conventions.md](page-conventions.md) |
| `imports` | Extra imports on every generated MDX |
| `name` | Filename fn or `{ algorithm: "v1" \| "v2" }` (`v2` = operation id) |
| `frontmatter` | Defaults include `title` · `description` · `full: true` · **`_asyncapi`** (internal) |
| `addGeneratedComment` | `true` / custom string / `false` |

Lite OpenAPI pages use **`_openapi`** — never `_asyncapi` until reopen.

Optional upstream: `includeDescription: true` (ensure op descriptions are valid MDX).

---

## When reopen is allowed

Explicit Docs AsyncAPI reopen must cover:

1. Product/event schema SSOT path (Scratch under `docs-V2/api/` or Approved elsewhere — **not** a second OpenAPI YAML · **not** a copy under `apps/docs/`)
2. `@fumadocs/asyncapi` + CSS preset + `@source` for the package dist
3. Server-only `createAsyncAPI` module (`lib/asyncapi.server.ts`) with one document-id string · **never** import from client components
4. Dedicated UI file with `createAsyncAPIPage` (keep OpenAPI `api-page.tsx` intact)
5. Decide layout / schemaUI / Shiki / component overrides; document defaults in this chapter
6. Choose MDX `generateFiles` **or** `staticSource` — if MDX: dedicated script + output tree **outside** `content/docs/api/` · lock `per` / `groupBy` / `meta` / frontmatter
7. Page RSC preload for `_asyncapi` pages · update LLM helpers — [llms.md](llms.md)
8. If locales reopen: `asyncapiTranslations` + [i18n.md](i18n.md) ladder together
9. Content tree / `meta.json` / sidebar labels for async vs HTTP
10. Wire tests + flip this chapter Status to Active
11. Docs project rules still hold — no Neon / product secrets — [README.md](README.md)

Until then: OpenAPI-only lock.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `@fumadocs/asyncapi` install | Scope + dual page-type matrix without SSOT |
| `createAsyncAPI` in a `"use client"` module | Server-only — upstream forbids browser reference |
| Overwriting `openapi.server.ts` with AsyncAPI | Breaks HTTP document-id / `createOpenAPI` |
| Overwriting `api-page.tsx` with `createAsyncAPIPage` | Breaks OpenAPI preload / `APIPage` |
| AsyncAPI `generateFiles` into `content/docs/api/` | Collides with OpenAPI op pages / `_openapi` |
| Mixing `@fumadocs/asyncapi` into `generate-openapi-docs.mts` | Dual package / dual frontmatter in one script |
| `asyncapiTranslations` without i18n reopen | Couples two Outside-baseline surfaces |
| Inventing `asyncapi.yaml` with no product consumer | Catalogue without ship surface |
| Treating AsyncAPI as OpenAPI replacement | Different protocol surface — [openapi.md](openapi.md) stays HTTP |

---

## Verify

```text
1. No @fumadocs/asyncapi · no lib/asyncapi.ts · no lib/asyncapi.server.ts · no createAsyncAPI
2. lib/openapi.server.ts: createOpenAPI only · OPENAPI_DOCUMENT_ID under docs-V2/api
3. No generate-asyncapi* script · generate-openapi-docs.mts imports fumadocs-openapi only
4. content/docs/api: _openapi pages only · no _asyncapi
5. No components/asyncapi-page.tsx · api-page.tsx: createOpenAPIPage only
6. Wire test: docs-openapi-wire AsyncAPI lock
7. pnpm --filter @afenda/docs typecheck · test -- docs-openapi-wire
```

Companion: [openapi.md](openapi.md) · [i18n.md](i18n.md) · [automation.md](automation.md) · [llms.md](llms.md) · [README.md](README.md).
