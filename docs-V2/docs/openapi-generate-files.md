# Fumadocs Framework Mode — generateFiles() (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/openapi-generate-files.md` |
| Authority | **Scratch** — upstream [generateFiles()](https://fumadocs.dev/docs/integrations/openapi/generate-files) · disk `@afenda/docs` |
| Status | **Active** — `per: "operation"` · `meta: true` · hand index preserved |
| Audience | Engineers regenerating OpenAPI MDX or changing page layout |
| Updated | 2026-07-19 |

Generate MDX pages from the OpenAPI schema. Page **bodies** still render via `OpenAPIPage` / `APIPage` — the generator only arranges which operations each page mounts. Server + UI: [openapi.md](openapi.md) · [openapi-api-page.md](openapi-api-page.md). Page tree: [page-conventions.md](page-conventions.md).

---

## Lite lock (configured)

| Option | Lite |
|--------|------|
| `input` | `openapi` server instance (`OPENAPI_DOCUMENT_ID`) |
| `output` | `./content/docs/api` |
| `per` | `"operation"` |
| `groupBy` | Default (`none`) — flat files under `api/` |
| `meta` | `true` — then script normalizes title + `index` first |
| `addGeneratedComment` | `true` |
| `index` (generator cards) | **Off** — hand `api/index.mdx` preserved |
| `includeDescription` | **Off** |
| `imports` / `name` / `frontmatter` / `per: "custom"` | **Outside baseline** |
| Runner | `pnpm --filter @afenda/docs generate:openapi-docs` |

```ts
// apps/docs/scripts/generate-openapi-docs.mts
await generateFiles({
  input: openapi,
  output: "./content/docs/api",
  per: "operation",
  meta: true,
  addGeneratedComment: true,
});
// then: restore hand index.mdx · fix meta title/pages · delete orphan op MDX
```

`generateFiles` is loaded via `createRequire` (CJS) — fumadocs-openapi ESM + `xml-js` breaks under Node/tsx. Do not switch to ESM `import { generateFiles }` without a named slice that proves green.

---

## Usage

```ts
import { generateFiles } from "fumadocs-openapi";
import { openapi } from "@/lib/openapi.server";

void generateFiles({
  input: openapi,
  output: "./content/docs/api",
});
```

Lite always passes the **server instance**, never `input: ['./file.yaml']` alone (fumadocs-openapi v10+).

---

## `per`

| Mode | Content | Lite |
|------|---------|------|
| `operation` (default) | One page per operation | **Shipped** |
| `tag` | Ops sharing a tag → `{tag}.mdx` | Outside baseline |
| `file` | Ops in same schema file | Outside baseline (single YAML) |
| `custom` + `toPages` | Full custom builder | Outside baseline |

Operation = method + path (e.g. `/api/health/liveness` GET → `getHealthLiveness.mdx` via `operationId`).

---

## `groupBy`

Only meaningful with `per: "operation"`.

| Value | Output | Lite |
|-------|--------|------|
| `none` (default) | `{operationId}.mdx` | **Shipped** (implicit) |
| `tag` | `{tag}/{operationId}.mdx` | Outside baseline |
| `route` | `{path}/{method}.mdx` | Outside baseline |

Keep a flat `content/docs/api/*.mdx` tree until a named Docs OpenAPI grouping slice.

---

## `index`

Upstream can emit card-link index MDX. Lite **does not** use generator `index:` — narrative `content/docs/api/index.mdx` is hand-authored and **restored** after each generate.

---

## `meta`

| Lite | Detail |
|------|--------|
| `meta: true` | Generate/update `content/docs/api/meta.json` |
| Post-script | Force `title: "HTTP API"` · ensure `"index"` is first in `pages` · default/preserve `icon: "CodeXml"` (migrate legacy `Code2`) |
| Manual meta | Allowed for maximal flexibility — script still rewrites title/pages order · keeps Lucide `icon` |

`meta.folderStyle` / object form — Outside baseline (no tag/route folders).

---

## `imports` · `name` · `frontmatter`

| Option | Lite |
|--------|------|
| `imports` | Outside baseline — no `@/constants` in generated MDX |
| `name(output)` | Outside baseline — default operationId filenames |
| `frontmatter` | Outside baseline — stock `title` · `description` · `full` · `_openapi` |

Do not add custom frontmatter keys that fight [practices.md](practices.md) / OpenAPI preload.

---

## `addGeneratedComment`

| Value | Lite |
|-------|------|
| `true` | **Shipped** — default Fumadocs “do not edit” banner |
| Custom string / `false` | Outside baseline |

---

## Post-generate Lite steps (required)

After `generateFiles` returns, the script:

1. Restores hand `index.mdx` if it existed
2. Normalizes `meta.json` (`title`, `pages` with `index` first, Lucide `icon`)
3. Deletes orphan `*.mdx` not listed in `meta.pages`

This keeps api-now scope honest when operations leave the YAML.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| `per: "tag" \| "file" \| "custom"` | Flat operation pages |
| `groupBy: "tag" \| "route"` | Flat `api/` folder |
| Generator `index:` cards | Hand index narrative |
| `includeDescription: true` | Stability — [openapi.md](openapi.md) |
| Custom `imports` / `name` / `frontmatter` | Stock MDX shape |
| ESM `import { generateFiles }` under tsx | Use CJS `require` until proven |
| AsyncAPI `generateFiles` | [asyncapi.md](asyncapi.md) |

---

## Verify

```text
1. generate-openapi-docs.mts: input openapi · output ./content/docs/api · per operation · meta true · addGeneratedComment true
2. No groupBy · index: · includeDescription · imports · frontmatter · per custom
3. createRequire("fumadocs-openapi") for generateFiles
4. Hand index preserved · orphans deleted
5. Wire test: generateFiles lock
6. pnpm --filter @afenda/docs generate:openapi-docs · lint:links
```

Companion: [openapi.md](openapi.md) · [openapi-server.md](openapi-server.md) · [openapi-api-page.md](openapi-api-page.md) · [automation.md](automation.md) · [content.md](content.md) · [page-conventions.md](page-conventions.md).
