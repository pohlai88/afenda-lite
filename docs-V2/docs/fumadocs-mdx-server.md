# Fumadocs MDX — Server Entry (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-server.md` |
| Authority | **Scratch** — upstream [Server Entry](https://fumadocs.dev/docs/mdx/entry/server) · disk `@afenda/docs` |
| Status | **Active** — `collections/server` + `loader()` + RSC `page.data.body` |
| Audience | Engineers reading collection outputs on the server |
| Updated | 2026-07-19 |

Upstream Server Entry exposes compiled collections for **server** environments. Lite uses it only through `loader()` — not raw collection walks in route files.

Overview of all entries: [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md). Next wire: [fumadocs-mdx-next.md](fumadocs-mdx-next.md). Loader: [loader-api.md](loader-api.md) · [loader-source.md](loader-source.md).

---

## Lite lock (configured)

| Upstream | Lite |
|----------|------|
| `import { docs } from "collections/server"` | [`apps/docs/lib/source.ts`](../../apps/docs/lib/source.ts) |
| `loader({ source: docs.toFumadocsSource() })` | **Shipped** — sole public `source` |
| Raw `console.log(docs)` in product routes | Avoid — debug only; pages use `source` |
| Separate `doc` collection + `toFumadocsSource(blogPosts, [])` | **Outside** — no blog collection — [loader-source.md](loader-source.md) |
| `source.getPage(slugs)` · `page.data.title` | **Shipped** |
| RSC render `page.data.body` + `getMDXComponents()` | **Shipped** — [`page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) |
| Client import of `collections/server` | **Forbidden** — server entry only |

```ts
// apps/docs/lib/source.ts
import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
});
```

```tsx
// apps/docs/app/docs/[[...slug]]/page.tsx (shape)
const page = source.getPage(params.slug);
const MDX = page.data.body;
return <MDX components={getMDXComponents({ … })} />;
```

---

## Upstream guidance (Lite follows)

1. Prefer `loader()` over reading the raw collection in every page.
2. On RSC, treat `page.data.body` as the MDX component; pass components via the `components` prop.
3. Frontmatter fields (`title`, `description`, …) live on `page.data`.

TOC: [get-toc.md](get-toc.md). MDX registry: [ui-components.md](ui-components.md).

---

## Outside baseline (this chapter)

| Pattern | Why |
|---------|-----|
| Second server loader from a `doc`-only collection | Multi-source — [loader-source.md](loader-source.md) |
| `toFumadocsSource` from `fumadocs-mdx/runtime/server` for a blog | No blog surface |
| Rendering via Browser / Dynamic entry instead | [fumadocs-mdx-browser.md](fumadocs-mdx-browser.md) · [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) |
| Importing `collections/server` from client components | Server-only |

---

## Verify

```text
1. lib/source.ts: from "collections/server" · docs.toFumadocsSource()
2. Docs page: source.getPage · page.data.body · getMDXComponents
3. No collections/browser · collections/dynamic under apps/docs product roots
4. Wire test: Fumadocs MDX Server Entry Active lock
```

Companion: [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [fumadocs-mdx-dynamic.md](fumadocs-mdx-dynamic.md) · [fumadocs-mdx-browser.md](fumadocs-mdx-browser.md) · [fumadocs-mdx-import.md](fumadocs-mdx-import.md) · [loader-api.md](loader-api.md) · [get-toc.md](get-toc.md) · [next.md](next.md).
