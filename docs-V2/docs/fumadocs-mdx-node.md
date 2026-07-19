# Fumadocs MDX — Node.js Runtime Loader (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/fumadocs-mdx-node.md` |
| Authority | **Scratch** — upstream [Runtime Loader · Node.js](https://fumadocs.dev/docs/mdx/loader/node) · disk `@afenda/docs` |
| Status | **Active** — `fumadocs-mdx/node` `register()` + offline page inventory |
| Audience | Engineers running Node ESM scripts that load Fumadocs collections outside Next |
| Updated | 2026-07-19 |

Access content in the **Node.js** runtime via `register()` from `fumadocs-mdx/node`, then import `collections/server` and build a `loader()` for `source.getPages()`.

**Coexists with** Next `createMDX` — [fumadocs-mdx-next.md](fumadocs-mdx-next.md). Does **not** replace `generate:source` or RSC Server Entry — [fumadocs-mdx-server.md](fumadocs-mdx-server.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Enterprise use | Offline page inventory (CI / ops) without starting Next |
| Script | [`scripts/list-source-pages.mjs`](../../apps/docs/scripts/list-source-pages.mjs) |
| Package script | `pnpm --filter @afenda/docs list:source-pages` |
| ESM | `"type": "module"` on `@afenda/docs` · run via `node --import tsx` |
| `register()` | **Default options** — root `source.config.ts` discovery · **no** `configPath` |
| Path / asset hooks | [`scripts/node-docs-resolve.mjs`](../../apps/docs/scripts/node-docs-resolve.mjs) (`@/*` · `collections/*` · static assets · CSS) |
| OpenAPI under Node | [`scripts/node-inventory-openapi.mjs`](../../apps/docs/scripts/node-inventory-openapi.mjs) — inventory-only surface (real `fumadocs-openapi` stays on Next; xml-js ESM break) |
| Cycle break | [`node-inventory-source.mjs`](../../apps/docs/scripts/node-inventory-source.mjs) · [`node-inventory-build-graph.mjs`](../../apps/docs/scripts/node-inventory-build-graph.mjs) while collections initialize |
| Next wire | Unchanged — `createMDX()` · RSC `lib/source.ts` + `openapi.loaderPlugin` |
| Prerequisite | `pnpm --filter @afenda/docs generate:source` (or predev / prebuild) |

Wire test: Fumadocs MDX Node Active lock.

---

## Setup (Lite)

```bash
pnpm --filter @afenda/docs generate:source
pnpm --filter @afenda/docs list:source-pages
```

```js
// apps/docs/scripts/list-source-pages.mjs (shape)
import { register as registerNode } from "node:module";
import { loader } from "fumadocs-core/source";
import { register as registerFuma } from "fumadocs-mdx/node";

registerNode("./node-docs-resolve.mjs", import.meta.url, { data: { appRoot } });
registerFuma(); // no configPath — root source.config.ts

const { docs } = await import("collections/server");
const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});
console.log(source.getPages());
```

Upstream `register({ configPath })` remains available but **Outside** for Lite — keep config at package root.

---

## Security / trust

| Topic | Lite |
|-------|------|
| Runtime | Local / CI only — not a public HTTP surface |
| Content | Same published MDX as the docs site (no secrets) |
| OpenAPI UI | Not executed under Node inventory — Next keeps real `fumadocs-openapi` |
| Writes | Script is read-only (stdout JSON) |

---

## Outside baseline (this chapter)

| Pattern | Why |
|---------|-----|
| `register({ configPath: "…" })` | Relocates config — keep root `source.config.ts` |
| Importing real `lib/source.ts` from Node inventory | Pulls `openapi.loaderPlugin` + circular init via MDX graph |
| Replacing `createMDX` with Node-only install | Next remains the docs framework — [fumadocs-mdx-next.md](fumadocs-mdx-next.md) |
| `scripts/example.js` as the only entry | Lite ships `list-source-pages.mjs` |

---

## Verify

```text
1. package.json: "type": "module" · list:source-pages script
2. scripts/list-source-pages.mjs: fumadocs-mdx/node register() · collections/server
3. next.config.mjs: createMDX kept
4. pnpm --filter @afenda/docs generate:source && pnpm --filter @afenda/docs list:source-pages → ok · count > 0
5. source.config.ts points at docs-V2/docs/fumadocs-mdx-node.md (Active)
6. Wire test: Fumadocs MDX Node Active lock
```

Companion: [fumadocs-mdx.md](fumadocs-mdx.md) · [fumadocs-mdx-next.md](fumadocs-mdx-next.md) · [fumadocs-mdx-server.md](fumadocs-mdx-server.md) · [fumadocs-mdx-performance.md](fumadocs-mdx-performance.md) · [content-source.md](content-source.md) · [loader-api.md](loader-api.md) · [automation.md](automation.md) · [README.md](README.md).
