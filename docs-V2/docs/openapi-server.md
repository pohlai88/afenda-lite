# Fumadocs Framework Mode — createOpenAPI() (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/openapi-server.md` |
| Authority | **Scratch** — upstream [createOpenAPI() / OpenAPI server](https://fumadocs.dev/docs/integrations/openapi/server) · disk `@afenda/docs` |
| Status | **Active** — SchemaRecord `input` (id → absolute path) · no playground proxy |
| Audience | Engineers changing the OpenAPI server instance or document id |
| Updated | 2026-07-19 |

Main Fumadocs OpenAPI config. **Server-only** — do not import `fumadocs-openapi/server` or `@/lib/openapi.server` into client components / browser bundles.

MDX generate: [openapi-generate-files.md](openapi-generate-files.md). UI page: [openapi-api-page.md](openapi-api-page.md). Product map: [openapi.md](openapi.md).

---

## Lite lock (configured)

| Option | Lite |
|--------|------|
| Document id SSOT | [`lib/openapi-document-id.ts`](../../apps/docs/lib/openapi-document-id.ts) — `OPENAPI_DOCUMENT_ID` + `OPENAPI_DOCUMENT_PATH` |
| Module | [`lib/openapi.server.ts`](../../apps/docs/lib/openapi.server.ts) |
| `input` | SchemaRecord — `{ [OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH }` |
| Document id | `../../docs-V2/api/OPEN-001-openapi.yaml` (MDX key; not cwd-resolved) |
| Load path | Absolute — `join(apps/docs package root, OPENAPI_DOCUMENT_ID)` from `openapi-document-id.ts` |
| Function / URL `input` | **Outside baseline** |
| `proxyUrl` | **Unset** |
| `createProxy` route | **Absent** — no `app/api/proxy` |
| Options typing | `satisfies OpenAPIOptions` |

```ts
// apps/docs/lib/openapi-document-id.ts
export const OPENAPI_DOCUMENT_ID =
  "../../docs-V2/api/OPEN-001-openapi.yaml" as const;
const docsAppDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OPENAPI_DOCUMENT_PATH = join(docsAppDir, OPENAPI_DOCUMENT_ID);

// apps/docs/lib/openapi.server.ts
import { createOpenAPI, type OpenAPIOptions } from "fumadocs-openapi/server";
import {
  OPENAPI_DOCUMENT_ID,
  OPENAPI_DOCUMENT_PATH,
} from "./openapi-document-id";

const openApiServerOptions = {
  input: {
    [OPENAPI_DOCUMENT_ID]: OPENAPI_DOCUMENT_PATH,
  },
} satisfies OpenAPIOptions;

export const openapi = createOpenAPI(openApiServerOptions);
```

If the absolute path does not resolve — **stop**. Do not copy YAML under `apps/docs/openapi/`, do not add a symlink shim, do not invent a second document id.

---

## `input`

Upstream accepts:

| Shape | Lite |
|-------|------|
| SchemaRecord (`id → absolute file path`) | **Shipped** — single docs-V2 YAML; cwd-independent |
| File paths (`string[]`) | Avoid — cwd-relative; use SchemaRecord |
| External URLs | Outside baseline — no network SSOT at build |
| Functions (`Record<id, async () => schema>`) | Outside baseline — no remote Scalar/registry fetch |

`generateFiles({ input: openapi })` and MDX `document=` / `_openapi.preload` must use the **same** id string as `OPENAPI_DOCUMENT_ID` (not the absolute path).

---

## Creating proxy (`createProxy` · `proxyUrl`)

Upstream proxy forwards playground `fetch` through a route handler to avoid browser CORS. It forwards headers/body (including cookies / `Authorization`).

| Piece | Lite |
|-------|------|
| `openapi.createProxy({ allowedOrigins })` | **Outside baseline** |
| `app/api/proxy/route.ts` (or equivalent) | **Absent** |
| `proxyUrl: '/api/proxy'` on `createOpenAPI` | **Unset** |

Do not enable a proxy without a named Docs OpenAPI playground-proxy slice that sets an explicit `allowedOrigins` allowlist. Never proxy unreliable/third-party hosts.

---

## Consumers (server-side only)

| Call site | Role |
|-----------|------|
| `scripts/generate-openapi-docs.mts` | `generateFiles({ input: openapi })` |
| `lib/source.ts` | `openapi.loaderPlugin()` |
| `app/docs/[[...slug]]/page.tsx` | `openapi.preloadOpenAPIPage(page)` |

Client UI uses `createOpenAPIPage()` + preload provider — **not** the `openapi` instance. See [openapi-api-page.md](openapi-api-page.md).

Type-only imports from `fumadocs-openapi/server` (e.g. `OpenAPIPageProps_Preloaded`) in `api-page.tsx` are allowed; do not call `createOpenAPI` or import `@/lib/openapi.server` on the client.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| Browser import of `openapi.server` | Bundle / server API leak |
| `input` as remote URL or async function map | Dual / unstable SSOT |
| YAML copy under `apps/docs/` | Dual SSOT |
| `proxyUrl` + `createProxy` | Playground proxy not opened |
| Second `createOpenAPI` instance | Document-id drift |
| AsyncAPI server beside OpenAPI | [asyncapi.md](asyncapi.md) |

---

## Verify

```text
1. openapi-document-id.ts: OPENAPI_DOCUMENT_ID + OPENAPI_DOCUMENT_PATH (module-absolute)
2. openapi.server.ts: SchemaRecord input · no proxyUrl
3. No app/api/proxy route · no createProxy call site
4. No client import of fumadocs-openapi/server or openapi.server
5. OPENAPI_DOCUMENT_ID shared with generated MDX · generator
6. Wire test: createOpenAPI SchemaRecord lock
7. Spot-check /docs/api after generate:openapi-docs
```

Companion: [openapi.md](openapi.md) · [openapi-generate-files.md](openapi-generate-files.md) · [openapi-api-page.md](openapi-api-page.md) · [automation.md](automation.md) · [`../api/README.md`](../api/README.md).
