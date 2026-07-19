# Fumadocs Framework Mode — Access Control (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/access-control.md` |
| Authority | **Scratch** — upstream [Access Control](https://fumadocs.dev/docs/guides/access-control) · disk `@afenda/docs` |
| Status | **Outside baseline** — official docs stay **public**; no Loader filter / no permission frontmatter / no docs-side auth |
| Audience | Engineers evaluating gated docs content |
| Updated | 2026-07-19 |

Upstream shows filtering content via `loader()` + `update().files()`, a `createSource(permission)` factory, or page-level `notFound()` checks. Lite **documents** those patterns and **locks public access** until an explicit Docs access-control reopen.

Framework Mode shell: [next.md](next.md). Content tree: [content.md](content.md). Docs project rules: [README.md](README.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Single public `source` | [`apps/docs/lib/source.ts`](../../apps/docs/lib/source.ts) — `loader({ source: docs.toFumadocsSource(), plugins: [openapi.loaderPlugin()] })` |
| No `update().files` permission filter | Wire test rejects `update(` + `permission` gates on source |
| No `createSource` factory | One module-level `source` export |
| No `permission` frontmatter schema | [`source.config.ts`](../../apps/docs/source.config.ts) — default page schema only |
| No Neon Auth / product session on docs | [README.md](README.md) rule 1 — secrets stay on `@afenda/web` |

All narrative + generated OpenAPI MDX under `content/docs` is reachable at `/docs/**` for every visitor. Search index (`createFromSource`) indexes the same public `source`.

---

## Upstream patterns (reference only)

Do **not** paste these into Lite without a named Docs access-control reopen + Scratch update.

### Loader API (input-level filter)

```ts
// Upstream example — NOT Lite
import { docs } from "collections/server";
import { loader, update } from "fumadocs-core/source";

const filteredSource = update(docs.toFumadocsSource())
  .files((files) =>
    files.filter((file) => {
      if (file.type === "meta") return true;
      return file.data.permission === "public";
    }),
  )
  .build();

export const source = loader(filteredSource, { baseUrl: "/docs" });
```

Advantages (upstream): access limited at **input** — page tree, search, and getPage share the same filter.

### Factory `createSource(permission)`

Per-request loaders keyed by role. Requires caching for production and a trusted identity source. Lite forbids Neon Auth / product identity on the docs project without reopen.

### Framework-level (page `notFound`)

```tsx
// Upstream example — NOT Lite
if (page.data.permission !== user.permission) notFound();
```

Flexible, but you must also manage sidebar, search, and other surfaces yourself. Prefer Loader API if Lite ever opens gated content.

---

## When reopen is allowed

Explicit Docs access-control reopen must cover:

1. Frontmatter schema (`permission` or equivalent) in `source.config.ts`
2. Loader `update().files` filter (or factory) in `lib/source.ts`
3. Identity source that does **not** violate docs project rules (or an approved docs-only gate)
4. Search + OpenAPI plugin interaction (filtered source still loads public API pages correctly)
5. Scratch update here + wire tests for the new filter
6. Content migration for existing MDX (every page must declare access)

Until then: keep the public single-`source` lock.

---

## Banned / hard stops

| Stop | Why |
|------|-----|
| Neon Auth / `DATABASE_URL` on `@afenda/docs` for gating | Docs ≠ product runtime — [README.md](README.md) |
| Silent page-only `notFound` without filtering search/tree | Leaks titles/snippets via Orama / sidebar |
| Shipping `permission: public` filter with no frontmatter on existing pages | Would empty the site |
| Treating this chapter as open backlog | Outside baseline — named reopen only |

---

## Verify

```text
1. lib/source.ts exports one `source` from loader(docs.toFumadocsSource()) + openapi plugin
2. No update( / createSource / permission frontmatter gate in apps/docs lib|source.config
3. Wire test: docs-openapi-wire access-control lock
4. pnpm --filter @afenda/docs typecheck · test -- docs-openapi-wire
```

Companion: [next.md](next.md) · [content.md](content.md) · [README.md](README.md).
