# Fumadocs Framework Mode — OpenAPI (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/openapi.md` |
| Authority | **Scratch** — upstream [OpenAPI](https://fumadocs.dev/docs/integrations/openapi) · `afenda-elite-api-contract` · disk `@afenda/docs` |
| Status | **Active** — MDX `generateFiles` consumer · docs-V2 YAML SSOT |
| Audience | Engineers changing api-now HTTP or the docs OpenAPI UI |
| Updated | 2026-07-19 |

Generating docs for the OpenAPI schema. Lite locks **MDX Files** generation (not Virtual Files). Machine SSOT: [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml). Automation: [automation.md](automation.md). AsyncAPI: [asyncapi.md](asyncapi.md) (Outside baseline).

---

## SSOT split

| Artifact | Owns | Must not |
|----------|------|----------|
| Zod schemas + handlers | `apps/web/modules/**` · `apps/web/app/api/**` | Live in MDX |
| Generated OAS | [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) | Hand-edit forever |
| Fumadocs consumer | `apps/docs` — `createOpenAPI` + `generateFiles` MDX | Own a second YAML |
| Spectral / drift gate | `pnpm check:openapi` | Skip after HTTP shape change |

Never invent contract-only REST in YAML. Never add Swagger under `apps/web`.

---

## Setup (configured)

| Upstream | Lite |
|----------|------|
| `fumadocs-openapi` | **Shipped** — **dependencies** (runtime UI + loader; not `devDependencies`) |
| `shiki` direct dep | Transitive via `fumadocs-openapi` / `fumadocs-core` — do not duplicate unless a named slice requires a pin |
| Styles `@import 'fumadocs-openapi/css/preset.css'` | **Shipped** — `app/global.css` (+ `@source` for OpenAPI dist) |

```bash
pnpm --filter @afenda/docs add fumadocs-openapi   # already present
```

Themes stay `neutral` — [ui.md](ui.md).

---

## Configure plugin (configured)

| Piece | Disk |
|-------|------|
| Server | [`lib/openapi.server.ts`](../../apps/docs/lib/openapi.server.ts) — `createOpenAPI` — [openapi-server.md](openapi-server.md) |
| UI | [`components/api-page.tsx`](../../apps/docs/components/api-page.tsx) — `createOpenAPIPage` + preload — [openapi-api-page.md](openapi-api-page.md) |
| Loader | [`lib/source.ts`](../../apps/docs/lib/source.ts) — `openapi.loaderPlugin()` — [loader-plugins.md](loader-plugins.md) |
| MDX registry | [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) — `OpenAPIPage: APIPage` |

### Document-id contract

**createOpenAPI() — Active.** Full server options (`input` · proxy): **[openapi-server.md](openapi-server.md)**.

**One string** shared by `createOpenAPI` SchemaRecord key, generated MDX `document=` / `_openapi.preload`, generator assert, and wire tests:

```text
../../docs-V2/api/OPEN-001-openapi.yaml
```

Load path is **absolute** (`OPENAPI_DOCUMENT_PATH` from [`openapi-document-id.ts`](../../apps/docs/lib/openapi-document-id.ts)) — cwd-independent. Export: `OPENAPI_DOCUMENT_ID` + `OPENAPI_DOCUMENT_PATH` + `openapi`. No `proxyUrl` / `createProxy` until a named playground-proxy slice.

### UI + preload (Lite delta)

Upstream samples pass `OpenAPIPage` with `await openapi.preloadOpenAPIPage(page)` into MDX components. Lite wraps the MDX tree in `OpenAPIPreloadProvider` so the client page reads preload from React context (avoids RSC→client function/prop breakage during SSG).

```tsx
// page.tsx (OpenAPI pages)
const openApiPage = pageHasOpenApiFrontmatter(page.data)
  ? await openapi.preloadOpenAPIPage(page)
  : undefined;

// … MDX body …
<OpenAPIPreloadProvider preloaded={openApiPage.preloaded}>
  {body}
</OpenAPIPreloadProvider>
```

`APIPage` in `api-page.tsx` = `createOpenAPIPage()` + context preload. Skipping the provider yields prerender errors (`bundled` / undefined preload).

Factory options (code usages · media adapters · OpenAPI i18n): **[openapi-api-page.md](openapi-api-page.md)**.

---

## Generate pages

**MDX Files — Active.** Full `generateFiles()` option map: **[openapi-generate-files.md](openapi-generate-files.md)**.

```ts
// scripts/generate-openapi-docs.mts
await generateFiles({
  input: openapi, // server instance — not a path string array
  output: "./content/docs/api",
  per: "operation",
  meta: true,
  addGeneratedComment: true,
});
```

```bash
pnpm --filter @afenda/docs generate:openapi-docs
```

### Virtual Files (`openapi.staticSource`) — **Outside baseline**

Upstream Loader-API path (`openapi: await openapi.staticSource({ baseDir: 'openapi' })` + `page.type === 'openapi'` render). Lite does **not** use Virtual Files:

| Why |
|-----|
| Checked-in operation MDX under `content/docs/api` is reviewable + lintable |
| `generate:openapi-docs` + `lint:links` already gate the tree |
| Avoids dual page types in `getLLMText` / page renderer |

Do not add `staticSource` or `page.type === 'openapi'` branches without a named Docs OpenAPI virtual-files reopen.

---

## Features (shipped by integration)

Official `fumadocs-openapi` supports (Lite consumes as-is):

* Endpoint information
* Interactive API playground
* Example request code (languages)
* Response samples + TypeScript definitions
* Request parameters / body from schemas

Demo locally: `pnpm --filter @afenda/docs dev` → `/docs/api`.

---

## Scope (api-now)

**In YAML / docs UI:** health liveness · readiness · declaration-draft GET/PUT/PATCH/POST.

**Excluded (on disk, not in YAML):** `/api/auth/*` · `/api/session/*` (redirect / plain-text bridges).

---

## After api-now HTTP / envelope change

```bash
pnpm openapi:generate
pnpm check:openapi
pnpm --filter @afenda/docs generate:openapi-docs
pnpm --filter @afenda/docs lint:links
pnpm --filter @afenda/docs test
pnpm --filter @afenda/docs build
```

---

## Disk map

```text
apps/docs/
  lib/openapi.server.ts
  lib/source.ts                 # openapi.loaderPlugin()
  components/api-page.tsx       # createOpenAPIPage + OpenAPIPreloadProvider + APIPage
  components/mdx.tsx            # OpenAPIPage: APIPage
  scripts/generate-openapi-docs.mts
  content/docs/api/**           # generated op MDX + hand index
  app/docs/[[...slug]]/page.tsx # preloadOpenAPIPage
  app/global.css                # fumadocs-openapi/css/preset.css
docs-V2/api/OPEN-001-openapi.yaml
```

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Second copy of YAML under `apps/docs/openapi/` | Dual SSOT |
| Hand-edit generated op MDX forever | Drift vs `generateFiles` |
| Product Swagger route | API contract ban |
| Contract-only ops without consumer | Invented catalogue |
| `generateFiles({ input: ['./x.yaml'] })` without server | Breaks fumadocs-openapi v10+ |
| `openapi.staticSource` / Virtual Files without reopen | Outside baseline |
| Silent AsyncAPI / `createAsyncAPI` beside OpenAPI | [asyncapi.md](asyncapi.md) |
| `proxyUrl` / `app/api/proxy` without named slice | [openapi-server.md](openapi-server.md) |
| Browser import of `openapi.server` | Server-only — [openapi-server.md](openapi-server.md) |

---

## Verify

```text
1. OPENAPI_DOCUMENT_ID shared across openapi.server · generated MDX · generator
2. createOpenAPI: file input only · no proxyUrl / createProxy — openapi-server.md
3. global.css imports fumadocs-openapi/css/preset.css
4. source: openapi.loaderPlugin() · no staticSource
5. page: preloadOpenAPIPage + OpenAPIPreloadProvider
6. generate-openapi-docs: generateFiles({ input: openapi }) · no includeDescription
7. Wire test: OpenAPI suite
8. Spot-check /docs/api · /docs/api/getHealthLiveness
```

Companion: [openapi-server.md](openapi-server.md) · [openapi-generate-files.md](openapi-generate-files.md) · [openapi-api-page.md](openapi-api-page.md) · [`../api/README.md`](../api/README.md) · [automation.md](automation.md) · [content.md](content.md) · [asyncapi.md](asyncapi.md) · [llms.md](llms.md) · skill `afenda-elite-api-contract/openapi.md`.
