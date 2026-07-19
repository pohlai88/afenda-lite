# Fumadocs Core — Loader Plugins (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/loader-plugins.md` |
| Authority | **Scratch** — upstream [Loader Plugins](https://fumadocs.dev/docs/headless/source-api/plugins) · disk `@afenda/docs` |
| Status | **Active** — `lucideIconsPlugin` + `openapi.loaderPlugin` |
| Audience | Engineers extending `loader()` output or adding icon / tree transforms |
| Updated | 2026-07-19 |

Loader plugins customize `loader()` output (storage · page tree · integrations). Parent API: [loader-api.md](loader-api.md). OpenAPI server: [openapi-server.md](openapi-server.md). Icons / meta: [page-conventions.md](page-conventions.md).

---

## Lite lock (configured)

| Plugin | Lite |
|--------|------|
| `lucideIconsPlugin()` | **Shipped** — frontmatter / meta `icon:` → Lucide |
| `openapi.loaderPlugin()` | **Shipped** |
| Custom `LoaderPlugin` / `typedPlugin` | **Outside baseline** |
| `transformStorage` | **Outside baseline** |
| `transformPageTree` | **Outside baseline** |
| AsyncAPI `loaderPlugin` | **Outside baseline** — [asyncapi.md](asyncapi.md) |

```ts
// apps/docs/lib/source.ts
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
});
```

Author `icon:` with Lucide export names that exist on `lucide-react`’s `icons` map (e.g. `BookOpen`, `CodeXml`) — [page-conventions.md](page-conventions.md) · [practices.md](practices.md). Layout Links Lucide JSX in `baseOptions()` is separate from content-tree icons. Do **not** use retired aliases such as `Code2` (named export may still exist; `lucideIconsPlugin` looks up `icons[name]` only).

---

## Built-in — Lucide Icons (Active)

```ts
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";

loader({
  plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
});
```

Shipped examples: `guide.mdx` → `icon: BookOpen` · `content/docs/api/meta.json` → `"icon": "CodeXml"` (preserved across `generate:openapi-docs`; legacy `Code2` is rewritten to `CodeXml`).

---

## Creating plugins (reference)

| Style | When |
|-------|------|
| `plugins: ({ typedPlugin }) => [typedPlugin({ … })]` | Tight types + content-source custom props |
| `LoaderPlugin` factory | Reusable across loaders |

Hooks upstream documents:

| Hook | Role |
|------|------|
| `transformStorage` | Virtual FS ops before processing |
| `transformPageTree.file` / folder hooks | Rename nodes · attach props · JSX names |

Do **not** add hand-rolled plugins that rewrite OpenAPI page types or filter files for access control — use [access-control.md](access-control.md) reopen for gated trees.

---

## Outside baseline (summary)

| Pattern | Why |
|---------|-----|
| Extra plugins beyond Lucide + OpenAPI | Wire-test lock |
| `transformPageTree` display-name JSX | Stock titles from frontmatter / meta |
| `transformStorage` file surgery | Dual SSOT vs `content/docs` + generateFiles |
| Second OpenAPI / AsyncAPI plugin | Document-id / type drift |
| `plugins` factory with silent extras | Unreviewed loader surface |

---

## Verify

```text
1. lib/source.ts: plugins: [lucideIconsPlugin(), openapi.loaderPlugin()]
2. No transformStorage · transformPageTree · typedPlugin · asyncapi.loaderPlugin
3. Wire test: Loader Plugins lock
4. Spot-check /docs sidebar icons after generate:source
```

Companion: [loader-api.md](loader-api.md) · [loader-source.md](loader-source.md) · [page-conventions.md](page-conventions.md) · [practices.md](practices.md) · [openapi.md](openapi.md) · [openapi-server.md](openapi-server.md) · [asyncapi.md](asyncapi.md) · [access-control.md](access-control.md).
