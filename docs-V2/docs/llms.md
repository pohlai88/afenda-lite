# Fumadocs Framework Mode — AI & LLMs (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/llms.md` |
| Authority | **Scratch** — upstream [AI & LLMs](https://fumadocs.dev/docs/integrations/llms) · disk `@afenda/docs` |
| Status | **Active** — Docs-for-LLM text surfaces · Page Actions chrome · Ask AI Outside |
| Audience | Engineers changing LLM-facing docs exports or AI chat |
| Updated | 2026-07-19 |

Make `@afenda/docs` AI-friendly with dedicated Markdown exports and page Markdown chrome. Ask AI / chat vendors stay Outside baseline.

---

## Lite lock (configured)

| Surface | Lite |
|---------|------|
| `getLLMText` | **Shipped** — [`lib/get-llm-text.ts`](../../apps/docs/lib/get-llm-text.ts) |
| `includeProcessedMarkdown` | **Shipped** — boolean `true` (internal `remarkLLMs`) — plugin chapter [remark-llms.md](remark-llms.md) |
| `llms.txt` | **Shipped** — [`app/llms.txt/route.ts`](../../apps/docs/app/llms.txt/route.ts) |
| `llms-full.txt` | **Shipped** — [`app/llms-full.txt/route.ts`](../../apps/docs/app/llms-full.txt/route.ts) |
| `*.md` per page | **Shipped** — rewrite → [`app/llms.mdx/docs/[[...slug]]/route.ts`](../../apps/docs/app/llms.mdx/docs/[[...slug]]/route.ts) |
| `Accept` negotiation (`proxy.ts`) | **Outside baseline** — [negotiation.md](negotiation.md) · use explicit `.md` / txt URLs |
| Page Actions chrome | **Shipped** — `MarkdownCopyButton` + `ViewOptionsPopover` on docs page |
| `getPageMarkdownUrl` / `getPageGithubUrl` | **Shipped** — [`lib/source.ts`](../../apps/docs/lib/source.ts) |
| Ask AI (OpenRouter / LLMGateway / Inkeep) | **Outside baseline** |

```text
includeProcessedMarkdown
       │
       ▼
getLLMText(page)
       ├── GET /llms-full.txt
       ├── GET /docs/:path*.md  →  /llms.mdx/docs/:path*
       └── Page Actions (copy / view Markdown · GitHub)

llms(source).index() → GET /llms.txt
```

---

## Docs for LLM (configured)

### `getLLMText`

```ts
// apps/docs/lib/get-llm-text.ts
export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");
  return `# ${page.data.title} (${page.url})\n\n${processed}`;
}
```

Requires:

```ts
// source.config.ts — keep Graph View extractLinkReferences
postprocess: {
  extractLinkReferences: true,
  includeProcessedMarkdown: true, // boolean — not LLMsOptions object — remark-llms.md
},
```

Plugin / placeholders / `renderPlaceholder`: [remark-llms.md](remark-llms.md).

### `llms.txt`

```ts
// app/llms.txt/route.ts
export const revalidate = false;
export function GET() {
  return new Response(llms(source).index(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

### `llms-full.txt`

```ts
// app/llms-full.txt/route.ts
export const revalidate = false;
export async function GET() {
  const scanned = await Promise.all(source.getPages().map(getLLMText));
  return new Response(scanned.join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

### `*.md` extension

| Piece | Disk |
|-------|------|
| Handler | `app/llms.mdx/docs/[[...slug]]/route.ts` |
| Rewrite | `next.config.mjs` — `/docs/:path*.md` → `/llms.mdx/docs/:path*` |

Examples: `/docs/guide.md` · `/docs/api/getHealthLiveness.md` · `/docs.md` (index via empty slug).

After content edits: `pnpm --filter @afenda/docs generate:source`.

---

## Outside baseline

### `Accept` header

Upstream Negotiation (`isMarkdownPreferred` + `rewritePath` in Next `proxy.ts`) — full ladder: **[negotiation.md](negotiation.md)**.

Lite has **no** docs `proxy.ts` / middleware for Accept. Agents should use `.md` or the txt endpoints. Do not add Accept rewrite without a named Docs Negotiation reopen.

### Page Actions (configured)

Stock Fumadocs UI chrome on [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) (mirror `examples/next`):

| Piece | Disk |
|-------|------|
| `MarkdownCopyButton` | Fetches `getPageMarkdownUrl(page).url` (`/docs/….md`) |
| `ViewOptionsPopover` | Same Markdown URL + `getPageGithubUrl(page)` |
| Ask AI / `AISearch*` / `/api/chat` | **Outside** — see below |

```ts
// apps/docs/app/docs/[[...slug]]/page.tsx (shape)
const markdownUrl = getPageMarkdownUrl(page).url;
const githubUrl = getPageGithubUrl(page);
// …
<MarkdownCopyButton markdownUrl={markdownUrl} />
<ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
```

### Ask AI

CLI `ai/openrouter` · `ai/llmgateway` · `ai/inkeep` + layout `AISearch*` + `/api/chat` + vendor API keys.

| Concern | Why outside |
|---------|-------------|
| Vendor API keys on docs | Product/docs secret boundary — named slice + env schema |
| Model / tool choice | Not part of the Active docs baseline |
| Floating Ask AI chrome | Layout change beyond current Docs shell |

Do **not** install Ask AI components or chat routes without an explicit Docs AI reopen.

---

## Disk map

```text
apps/docs/
  source.config.ts              # includeProcessedMarkdown + extractLinkReferences
  lib/get-llm-text.ts
  lib/source.ts                 # getPageMarkdownUrl · getPageGithubUrl
  app/docs/[[...slug]]/page.tsx # MarkdownCopyButton · ViewOptionsPopover
  app/llms.txt/route.ts
  app/llms-full.txt/route.ts
  app/llms.mdx/docs/[[...slug]]/route.ts
  next.config.mjs               # .md rewrite
```

---

## Verify

```text
1. source.config.ts: includeProcessedMarkdown: true (+ extractLinkReferences)
2. get-llm-text.ts + three LLM routes present
3. next.config.mjs rewrite /docs/:path*.md → /llms.mdx/docs/:path*
4. page.tsx: MarkdownCopyButton + ViewOptionsPopover + markdownUrl
5. No components/ai/** · no AISearch · no /api/chat · Ask AI Outside
6. No docs proxy.ts Accept rewrite
7. Wire test: llms + Page Actions chrome lock
8. Spot-check :3001 — /llms.txt · /llms-full.txt · /docs/guide.md · copy/view chrome
```

Companion: [remark-llms.md](remark-llms.md) · [negotiation.md](negotiation.md) · [next.md](next.md) · [deploying.md](deploying.md) · [search-orama.md](search-orama.md) · [ui-layouts.md](ui-layouts.md) · [mdx-plugins.md](mdx-plugins.md).
