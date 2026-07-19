# Fumadocs Core — Remark Image (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-image.md` |
| Authority | **Scratch** — upstream [Remark Image](https://fumadocs.dev/docs/headless/mdx/remark-image) · disk `@afenda/docs` |
| Status | **Active** — Fumadocs MDX default size attrs · no option override · UI `img` → `ImageZoom` |
| Audience | Engineers adding MDX images / tuning Next.js Image size / import behavior |
| Updated | 2026-07-19 |

Upstream `remarkImage` adds `width` / `height` (and optional static imports) so frameworks can optimize images. **Included by default on Fumadocs MDX** — Lite does **not** re-declare it in `remarkPlugins`.

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring: [markdown.md](markdown.md). Zoom UI: [ui-components.md](ui-components.md). Bundler image path / lazy tradeoffs: [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Size attrs / imports | **Fumadocs MDX default** `remarkImage` (not listed in `source.config.ts`) |
| Options | **No** `[[remarkImage, …]]` override — ship upstream defaults (`useImport: true`, `placeholder: 'none'`, `onError: 'error'`, `external: true`) |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| UI | `img` → `MdxZoomImage` → [`ImageZoom`](../../apps/docs/components/image-zoom.tsx) (`fumadocs-core/framework` `Image`) |
| Public assets | [`apps/docs/public/`](../../apps/docs/public/) — reference as `/…` (e.g. `/docs-sample.svg`) |
| Custom `publicDir` / `useImport: false` / `placeholder: 'blur'` / `onError: 'hide'|'ignore'` | **Outside** until named reopen |

Wire test enforces no `remarkImage` re-wire + Active ImageZoom path.

---

## Upstream ladder (reference only)

### Raw MDX compiler (not needed on Lite)

```ts
// Upstream — NOT Lite (already default in Fumadocs MDX)
import { remarkImage } from "fumadocs-core/mdx-plugins";

await compile("...", { remarkPlugins: [remarkImage] });
```

### Options (reopen only)

| Option | Default (upstream) | Lite |
|--------|--------------------|------|
| `useImport` | `true` | Keep default |
| `placeholder` | `'none'` | Keep default (`'blur'` only with `useImport` + local) |
| `onError` | `'error'` | Keep default |
| `external` | `true` | Keep default |
| `publicDir` | app public root | Keep default — do not point at CDN without reopen |

### With imports (default)

```mdx
![Hello](/hello.png)
![Test](https://example.com/image.png)
```

Local public paths become static imports; external URLs get measured `width`/`height`.

### Without imports (Outside on Lite)

```ts
// Upstream — NOT Lite
remarkPlugins: [[remarkImage, { useImport: false }]];
```

Yields string `src` + size attrs — weaker Next.js placeholder story.

### Relative paths

With default `useImport`, `./hello.png` beside the MDX file works. With `useImport: false`, relative local paths do **not** land in the public asset graph — prefer `/file` under `public/`.

---

## Why defaults (Lite)

| Approach | When |
|----------|------|
| Default `remarkImage` + `ImageZoom` | **Lite** |
| Option override in `source.config.ts` | Named Docs Remark Image reopen |
| Duplicate `remarkImage` in `remarkPlugins` | Never beside Fumadocs MDX defaults |
| Dropping ImageZoom | Separate UI reopen — [ui-components.md](ui-components.md) |

---

## When reopen is allowed

Explicit Docs Remark Image reopen must cover:

1. Why defaults fail (`publicDir` CDN · `useImport: false` · blur placeholders · softer `onError`)
2. Impact on `ImageZoom` / `fumadocs-core/framework` `Image` and build-time fetch of external URLs
3. Content authoring rules for `/public` vs relative vs remote
4. Wire tests + [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · this chapter

Until then: defaults only — no `remarkImage` in `source.config.ts`.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `remarkImage` / options in config | Duplicate plugin / unreviewed size/import behavior |
| `useImport: false` without reopen | Breaks static-import / placeholder path |
| `onError: 'hide'|'ignore'` without reopen | Silent broken images in production docs |
| Treating image pipeline as open backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: no remarkImage · remarkBlockId only
2. mdx.tsx: img → MdxZoomImage · ImageZoom registered
3. image-zoom.tsx: fumadocs-core/framework Image + react-medium-image-zoom
4. Wire test: docs-openapi-wire Remark Image + MDX Plugins
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [rehype-code.md](rehype-code.md) · [README.md](README.md).
