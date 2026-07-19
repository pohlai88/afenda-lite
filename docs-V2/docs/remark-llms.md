# Fumadocs Core — Remark LLMs (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-llms.md` |
| Authority | **Scratch** — upstream [Remark LLMs](https://fumadocs.dev/docs/headless/mdx/remark-llms) · disk `@afenda/docs` |
| Status | **Active** — via `includeProcessedMarkdown: true` (Fumadocs MDX runs `remarkLLMs` internally) · no `LLMsOptions` object · no manual plugin |
| Audience | Engineers tuning processed Markdown for LLM / search text exports |
| Updated | 2026-07-19 |

Upstream `remarkLLMs` stringifies the processed Markdown AST to plain Markdown (ESM export `_markdown`). On **Fumadocs MDX**, enabling `includeProcessedMarkdown` runs it internally — do **not** append `remarkLLMs` to `remarkPlugins`.

Lite consumes the result with `page.data.getText("processed")` → `getLLMText` → `/llms-full.txt` · `*.md` routes. Surface map: [llms.md](llms.md). Plugin index: [mdx-plugins.md](mdx-plugins.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Enable pipeline | [`source.config.ts`](../../apps/docs/source.config.ts) — `includeProcessedMarkdown: true` (**boolean**) |
| Internal plugin | Fumadocs MDX default `remarkLLMs` (not listed in `remarkPlugins`) |
| Consume | [`lib/get-llm-text.ts`](../../apps/docs/lib/get-llm-text.ts) — `getText("processed")` |
| Export name | Upstream default `_markdown` — not customized |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| `LLMsOptions` object (`mdxAsPlaceholder` · `stringify` · `filterElement` · …) | **Outside** until named reopen |
| Manual `remarkPlugins: [[remarkLLMs, …]]` | **Outside** — Fumadocs MDX postprocess path only |
| `renderPlaceholder()` runtime | **Outside** — no placeholder rehydration |

Wire test enforces boolean `includeProcessedMarkdown` + Active `getText("processed")` + no options / manual plugin.

---

## Active config (disk)

```ts
// apps/docs/source.config.ts (shape)
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      extractLinkReferences: true,
      includeProcessedMarkdown: true, // enables internal remarkLLMs
    },
  },
});
```

```ts
// apps/docs/lib/get-llm-text.ts
const processed = await page.data.getText("processed");
```

---

## Upstream ladder (reference only)

### Object options (Outside on Lite)

```ts
// Upstream — NOT Lite today
import { type LLMsOptions } from "fumadocs-core/mdx-plugins/remark-llms";

postprocess: {
  includeProcessedMarkdown: {
    mdxAsPlaceholder: ["Callout", "Card"],
    // headingIds, filterElement, stringify, …
  } satisfies LLMsOptions,
},
```

Placeholder tokens look like `\0{"name":"Callout",…}\0`. Rehydrate with `renderPlaceholder` from `fumadocs-core/mdx-plugins/remark-llms.runtime` — Outside on Lite.

### Raw MDX compiler (not Lite)

```ts
// Upstream — NOT Lite
import { remarkLLMs } from "fumadocs-core/mdx-plugins/remark-llms";

await compile("...", {
  remarkPlugins: [[remarkLLMs, { as: "_markdown" }]],
});
```

---

## Why boolean only (Lite)

| Approach | When |
|----------|------|
| `includeProcessedMarkdown: true` + `getLLMText` | **Lite** |
| `LLMsOptions` / placeholders | Named Docs Remark LLMs reopen (Callout/Card fidelity in txt exports) |
| Manual `remarkLLMs` in `remarkPlugins` | Custom MDX compiler only — never beside Fumadocs MDX postprocess |
| Dropping `includeProcessedMarkdown` | Breaks [llms.md](llms.md) surfaces |

---

## When reopen is allowed

Explicit Docs Remark LLMs reopen must cover:

1. Why default stringify loses needed MDX structure (`mdxAsPlaceholder` / `stringify` / `filterElement`)
2. Whether `renderPlaceholder` runs in `getLLMText` or route handlers
3. Impact on `/llms-full.txt` · `*.md` · Orama / Graph View postprocess
4. Wire tests + [llms.md](llms.md) · [mdx-plugins.md](mdx-plugins.md) · this chapter

Until then: boolean `true` only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `LLMsOptions` object | Unreviewed placeholder / filter behavior in all LLM exports |
| Manual `remarkLLMs` in `remarkPlugins` | Duplicate / wrong pipeline vs Fumadocs MDX postprocess |
| Dropping `includeProcessedMarkdown` | Breaks getLLMText / llms-full / `*.md` |
| Treating placeholders as open backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: includeProcessedMarkdown: true (boolean) · no LLMsOptions object
2. No remarkLLMs in remarkPlugins
3. get-llm-text.ts: getText("processed")
4. Wire test: docs-openapi-wire Remark LLMs + AI & LLMs
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [llms.md](llms.md) · [mdx-plugins.md](mdx-plugins.md) · [negotiation.md](negotiation.md) · [headings.md](headings.md) · [README.md](README.md).
