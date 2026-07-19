# Fumadocs MDX — Next.js (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-next.md` |
| Authority | **Scratch** — upstream [Fumadocs MDX · Next.js](https://fumadocs.dev/docs/mdx/next) · disk `@afenda/docs` |
| Status | **Active** — `createMDX` · `collections/*` · `docs.toFumadocsSource()` |
| Audience | Engineers wiring Fumadocs MDX into the Next.js docs app |
| Updated | 2026-07-19 |

Upstream setup for **Fumadocs MDX on Next.js** (packages → `source.config.ts` → `createMDX` → `collections/*` alias → `lib/source.ts`).

Getting Started / collections FAQ: [fumadocs-mdx.md](fumadocs-mdx.md). Full Framework Mode UI shell (layouts · MDX components · search chrome): [next.md](next.md). Content source map: [content-source.md](content-source.md).

---

## Lite lock (configured)

| Upstream step | Lite disk |
|---------------|-----------|
| `pnpm add fumadocs-mdx fumadocs-core @types/mdx` | [`apps/docs/package.json`](../../apps/docs/package.json) — `@types/mdx` in `devDependencies` |
| `source.config.ts` · `defineDocs` · `defineConfig` | [`apps/docs/source.config.ts`](../../apps/docs/source.config.ts) — [fumadocs-mdx.md](fumadocs-mdx.md) · [mdx-plugins.md](mdx-plugins.md) |
| `createMDX` wrap in Next config | [`apps/docs/next.config.mjs`](../../apps/docs/next.config.mjs) — **ESM `.mjs`** · default `configPath` (`source.config.ts`) |
| `collections/*` → `./.source/*` | [`apps/docs/tsconfig.json`](../../apps/docs/tsconfig.json) (+ `@/*`) — entries [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) |
| `loader` + `docs.toFumadocsSource()` | [`apps/docs/lib/source.ts`](../../apps/docs/lib/source.ts) — + `openapi.loaderPlugin()` · [loader-api.md](loader-api.md) · [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) |
| `.source/` generation | `pnpm --filter @afenda/docs generate:source` (`predev` / `prebuild` / `pretypecheck`) |
| Content dir | `apps/docs/content/docs` |

### Lite deltas (keep)

| Delta | Why |
|-------|-----|
| `reactStrictMode: true` | Next defaults on disk |
| `/docs/:path*.md` rewrite | LLM markdown routes — [llms.md](llms.md) |
| OpenAPI `loaderPlugin` | API reference — [openapi.md](openapi.md) · [loader-plugins.md](loader-plugins.md) |
| No `configPath` override | Config stays at app-root `source.config.ts` |

---

## Configured snippets (Lite)

### Next config

```js
// apps/docs/next.config.mjs
import { createMDX } from "fumadocs-mdx/next";

const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

const withMDX = createMDX(); // default configPath = source.config.ts

export default withMDX(config);
```

Fumadocs MDX is **ESM-only** — Lite keeps `next.config.mjs` (not `next.config.ts` without Node native TypeScript resolver).

### Collections alias

```json
// apps/docs/tsconfig.json (paths)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "collections/*": ["./.source/*"]
    }
  }
}
```

No `baseUrl` — [no-tsconfig-baseurl](../../.cursor/rules/no-tsconfig-baseurl.mdc).

### Source loader

```ts
// apps/docs/lib/source.ts
import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { openapi } from "@/lib/openapi.server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [openapi.loaderPlugin()],
});
```

---

## Upstream “What is Next?” (Lite map)

| Upstream card | Lite |
|---------------|------|
| [Accessing Collections](https://fumadocs.dev/docs/mdx/entry) | [fumadocs-mdx.md](fumadocs-mdx.md) · [loader-api.md](loader-api.md) · `collections/server` |
| [Lazy Loading](https://fumadocs.dev/docs/mdx/async) | **Outside** — sync collections only · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) |

---

## Outside baseline

| Pattern | Why |
|---------|-----|
| Vite install | Next.js only — [fumadocs-mdx.md](fumadocs-mdx.md) |
| Node `register()` inventory | Coexists — [fumadocs-mdx-node.md](fumadocs-mdx-node.md) · does not replace `createMDX` |
| `createMDX({ configPath: … })` relocate | Keeps root `source.config.ts` discoverable |
| `next.config.ts` without native TS resolver | ESM `.mjs` lock |
| Drop `createMDX` / `collections/*` / `generate:source` | Breaks type-gen + Loader input |
| Content Collections / Local MD / MDX Remote | [content-collections.md](content-collections.md) · [local-md.md](local-md.md) · [mdx-remote.md](mdx-remote.md) |
| Lazy MDX / async collection loading | [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) |

---

## Verify

```text
1. package.json: fumadocs-mdx · fumadocs-core · @types/mdx · generate:source
2. next.config.mjs: createMDX from fumadocs-mdx/next · no configPath · ESM
3. tsconfig: collections/* → ./.source/*
4. lib/source.ts: collections/server · docs.toFumadocsSource()
5. source.config.ts: defineDocs dir content/docs
6. Comment pointer: docs-V2/docs/fumadocs-mdx-next.md on next.config.mjs
7. Wire test: Fumadocs MDX Next.js Active lock
8. pnpm --filter @afenda/docs generate:source
```

Companion: [fumadocs-mdx.md](fumadocs-mdx.md) · [fumadocs-mdx-entry.md](fumadocs-mdx-entry.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [next.md](next.md) · [content-source.md](content-source.md) · [loader-api.md](loader-api.md) · [loader-source.md](loader-source.md) · [llms.md](llms.md) · [deploying.md](deploying.md) · [README.md](README.md).
