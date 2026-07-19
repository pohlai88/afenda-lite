# Fumadocs Framework Mode — Sanity (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/sanity.md` |
| Authority | **Scratch** — upstream [Sanity](https://fumadocs.dev/docs/integrations/content/sanity) · example [fumadocs-sanity](https://github.com/fuma-nama/fumadocs-sanity) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `@fumadocs/sanity` · no Sanity studio/client · no Portable Text docs path |
| Audience | Engineers evaluating CMS-hosted docs vs git MDX |
| Updated | 2026-07-19 |

Upstream official integration: CLI presets (`fumadocs/sanity/base`) + `@fumadocs/sanity` (`createSanitySource` + `dynamicLoader` / `getSource()`), with live preview via draft mode. Lite locks **Fumadocs MDX** under `content/docs/**` — [content-source.md](content-source.md).

Sibling Outside CMS/adapters: BaseHub / Payload (reference only in content-source) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md).

Docs project rules: no product Neon / `DATABASE_URL` on `@afenda/docs` — CMS project tokens would be a second secret class; reopen must document env ownership — [README.md](README.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Content source | **Fumadocs MDX** — not Sanity CMS |
| No `@fumadocs/sanity` · `sanity` · `next-sanity` · `fumadocs-sanity` | `@afenda/docs` `package.json` |
| No `@portabletext/react` docs renderer | Absent |
| No Sanity tree | No `sanity/**` · `lib/sanity/**` · `components/sanity.ts` · `schemaTypes/**` |
| Loader | [`lib/source.ts`](../../apps/docs/lib/source.ts) — sync `docs.toFumadocsSource()` · not `createSanitySource` |
| Page render | `page.data.body` / `page.data.toc` — not Portable Text `page.data.load()` + `CustomPortableText` |
| No CLI Sanity preset | No `fd:add` / scripts installing `fumadocs/sanity/*` |
| OpenAPI | Remains committed MDX `generateFiles` — [openapi.md](openapi.md) |

Wire test enforces the absences above. Active path: [content-source.md](content-source.md) · [next.md](next.md).

---

## Why not Sanity (Lite)

| Upstream claim | Lite reason to stay on Fumadocs MDX |
|----------------|-------------------------------------|
| Live preview · draft mode | Official docs are git-reviewed SSOT · CI `lint:links` / wire tests |
| Studio-authored docs | Second publish SSOT · editor ops · project tokens |
| `createSanitySource` + `getSource()` | Async source cutover breaks sync Orama / LLM / OG / OpenAPI consumers |
| Portable Text body | Diverges from MDX components / OpenAPI `APIPage` MDX registry |
| CLI `fumadocs/sanity/base` types | Pulls Studio schema + React Portable Text stack into docs app |

---

## Upstream ladder (reference only)

Do **not** paste these into Lite without a named Docs Sanity reopen + Scratch update + secret/ops plan.

### 1. Assume Sanity project exists

Configure per [Sanity getting started](https://www.sanity.io/docs/getting-started) (studio, client, env) — **not** Lite baseline.

### 2. Data types (CLI)

```bash
# Upstream — NOT Lite
pnpm dlx @fumadocs/cli add fumadocs/sanity/base
```

Register schema types (`docsType`, `blockContent`, callout/card blocks) and Portable Text wrappers (`baseBlocks` / `baseMarks` / `baseComponents` → `CustomPortableText`).

### 3. Content loader

```bash
# Upstream — NOT Lite
pnpm add @fumadocs/sanity
```

```ts
// Upstream — NOT Lite (Next.js live preview)
import { dynamicLoader } from "fumadocs-core/source/dynamic";
import { createSanitySource } from "@fumadocs/sanity";

const source = dynamicLoader(
  createSanitySource({ sanityFetch, docType: "docs" }),
  { baseUrl: "/docs" },
);

export async function getSource() {
  // draftMode → source.invalidate(); return source.get();
}
```

Non-preview: pass Sanity `client` instead of `sanityFetch`.

### 4. Render

`await getSource()` → `page.data.load()` → Portable Text body + `renderToc({ render })`. Non-RSC: `@fumadocs/sanity/client` `renderToc` with server payload.

### 5. Studio

Create documents of type `docs`; they appear on the docs route.

---

## When reopen is allowed

Explicit Docs Sanity reopen must cover:

1. Why CMS beats git MDX for Lite (editor workflow · preview) vs dual-SSOT cost
2. Env: project id · dataset · tokens — **not** product Neon / `DATABASE_URL` on docs without Approved exception — [README.md](README.md)
3. OpenAPI coexistence: keep MDX generateFiles · hybrid · or regenerate into CMS
4. Async `getSource()` audit for layout · page · search · LLM · OG · Feedback · Graph View
5. Portable Text vs MDX component registry (`APIPage`, AutoTypeTable, etc.)
6. Draft / live preview security (who can enable draftMode)
7. Wire tests flipped + [content-source.md](content-source.md) · [content.md](content.md) · this chapter

Until then: Fumadocs MDX only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `@fumadocs/sanity` / `sanity` / `next-sanity` | Second publish SSOT · secrets · rebuild matrix |
| `createSanitySource` / `getSource()` without reopen | Breaks sync Loader consumers · OpenAPI plugin path |
| CLI `fumadocs/sanity/*` without reopen | Pulls Studio types into docs app |
| PortableText as docs body without reopen | Dual render stacks beside MDX |
| Treating Sanity as open backlog | Outside baseline — named reopen only |

---

## Verify

```text
1. package.json: fumadocs-mdx present · no @fumadocs/sanity · sanity · next-sanity · @portabletext/react
2. No sanity/ · lib/sanity/ · components/sanity.ts · schemaTypes/ under apps/docs
3. lib/source.ts: docs.toFumadocsSource() · no createSanitySource · no dynamicLoader
4. docs page: page.data.body · not CustomPortableText / page.data.load
5. Wire test: docs-openapi-wire Sanity Outside baseline
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [content-source.md](content-source.md) · [content.md](content.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) · [next.md](next.md) · [openapi.md](openapi.md) · [README.md](README.md).
