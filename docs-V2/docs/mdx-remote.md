# Fumadocs Framework Mode — MDX Remote (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/mdx-remote.md` |
| Authority | **Scratch** — upstream [MDX Remote](https://fumadocs.dev/docs/integrations/content/mdx-remote) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `@fumadocs/mdx-remote` · no `createCompiler` / `executeMdxSync` on-demand path |
| Audience | Engineers evaluating on-demand MDX compile vs build-time Fumadocs MDX |
| Updated | 2026-07-19 |

Upstream `@fumadocs/mdx-remote` compiles Markdown/MDX **on demand** (a Fumadocs-oriented `next-mdx-remote`). Lite locks **Fumadocs MDX** (`fumadocs-mdx` + bundler / type-gen) — [content-source.md](content-source.md).

Sibling Outside: [Local Markdown](local-md.md) (runtime local files) · CMS / custom — [content-source.md](content-source.md).

**Security:** upstream warns that passed MDX is trusted and allows code execution by default. Lite avoids an on-demand compile surface for untrusted strings.

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Content source | **Fumadocs MDX** — not MDX Remote |
| No `@fumadocs/mdx-remote` | `@afenda/docs` `package.json` |
| No `createCompiler` / `executeMdxSync` | Absent from `lib/**` · `app/**` · `components/**` |
| Page render | [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) — `page.data.body` from Loader · not `compiler.compile({ source })` |
| Content fetch | `source.getPage` — not parallel `my-content-source` + raw string compile |
| Config + Next MDX | [`source.config.ts`](../../apps/docs/source.config.ts) · [`next.config.mjs`](../../apps/docs/next.config.mjs) `createMDX()` **kept** |
| Images | Build-time / Next asset path via Fumadocs MDX — not runtime-only URL-only remote images |

Wire test enforces the absences above. Active path: [content-source.md](content-source.md) · [next.md](next.md).

---

## Why not MDX Remote (Lite)

| Upstream claim | Lite reason to stay on Fumadocs MDX |
|----------------|-------------------------------------|
| On-demand compile | Docs pages + OpenAPI MDX are committed / generated at build — [automation.md](automation.md) |
| No bundler | Lite **wants** `createMDX()` · `generate:source` · typed collections |
| No MDX imports/exports | Lite uses `providerImportSource` components — [markdown.md](markdown.md) |
| Runtime image optimization | Serverless `public/` removal story is a remote-compile concern; Lite serves built MDX |
| Trusted MDX execution | On-demand `compile({ source })` widens trust boundary vs git-reviewed `content/docs/**` |
| Non-RSC `skipRender` + `executeMdxSync` | Lite is Next.js App Router + RSC — [next.md](next.md) |

---

## Upstream ladder (reference only)

Do **not** paste these into Lite without a named Docs MDX Remote reopen + Scratch update + trust model.

### 1. Install

```bash
# Upstream — NOT Lite
pnpm add @fumadocs/mdx-remote
```

### 2. With RSC

```tsx
// Upstream — NOT Lite
import { createCompiler } from "@fumadocs/mdx-remote";
import { getPage } from "./my-content-source";

const compiler = createCompiler({ /* options */ });

const page = getPage(slug);
const { toc, body: MdxContent } = await compiler.compile({
  source: page.content,
});
```

### 3. Without RSC

```tsx
// Upstream — NOT Lite
const { compiled, frontmatter } = await compiler.compile({
  source: page.content,
  skipRender: true,
});
// client: executeMdxSync(compiled)
```

Upstream notes `frontmatter` from `compile()` is **not** validated — validate with Zod (or similar) if reopen lands.

### 4. Images

On serverless (e.g. Vercel), `public/` may be unavailable after build to a runtime compiler. Upstream: reference images by **URL**, not local `public` paths. Lite’s build-time MDX path avoids this remote-compile constraint.

---

## When reopen is allowed

Explicit Docs MDX Remote reopen must cover:

1. Why on-demand compile beats build-time Fumadocs MDX (remote CMS bodies · dynamic strings)
2. Trust model: who authors MDX · sandboxing · no untrusted `compile({ source })`
3. Coexistence with OpenAPI `generateFiles` MDX + `openapi.loaderPlugin` — or full cutover plan
4. Page tree / search / LLM still SSOT — [search-orama.md](search-orama.md) · [llms.md](llms.md)
5. Image URL strategy for serverless
6. Frontmatter Zod validation at compile boundary
7. Wire tests flipped + [content-source.md](content-source.md) · [content.md](content.md) · this chapter

Until then: Fumadocs MDX only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `@fumadocs/mdx-remote` install | Second compile pipeline beside `fumadocs-mdx` |
| `createCompiler` on docs page without reopen | On-demand execution surface · dual render paths |
| Parallel `my-content-source` + `compiler.compile` | Bypasses Loader · OpenAPI preload · Orama source |
| `executeMdxSync` / `skipRender` on App Router docs | Non-RSC path; Lite is RSC |
| Treating MDX Remote as open backlog | Outside baseline — named reopen only |

---

## Verify

```text
1. package.json: fumadocs-mdx present · @fumadocs/mdx-remote absent
2. No createCompiler · executeMdxSync under apps/docs lib/app/components
3. docs page: page.data.body · source.getPage (not compiler.compile)
4. source.config.ts + next.config createMDX kept
5. Wire test: docs-openapi-wire MDX Remote Outside baseline
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [content-source.md](content-source.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [local-md.md](local-md.md) · [content.md](content.md) · [next.md](next.md) · [markdown.md](markdown.md) · [README.md](README.md).
