# Fumadocs Core — Rehype Code (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/rehype-code.md` |
| Authority | **Scratch** — upstream [Rehype Code](https://fumadocs.dev/docs/headless/mdx/rehype-code) · [`@shikijs/rehype`](https://shiki.style/packages/rehype) · disk `@afenda/docs` |
| Status | **Active** — Fumadocs MDX default highlight · no `rehypeCodeOptions` override · CLI `CodeBlock` / `Pre` |
| Audience | Engineers tuning Shiki themes, fence meta, inline highlight, or language icons |
| Updated | 2026-07-19 |

Upstream Rehype Code wraps `@shikijs/rehype` and turns raw `<pre>` fences into dual-theme highlighted spans (`--shiki-light` / `--shiki-dark`). **Enabled by default on Fumadocs MDX** — configure via `mdxOptions.rehypeCodeOptions` when needed; do **not** append `rehypeCode` to a custom `rehypePlugins` list on Lite.

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring fences: [markdown.md](markdown.md). UI shell: [ui-components.md](ui-components.md) (`CodeBlock`).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Syntax highlight | **Fumadocs MDX default** Rehype Code (not listed in `source.config.ts`) |
| Options | **No** `rehypeCodeOptions` — ship upstream defaults |
| No `rehypePlugins` array | Absent — do not re-register `rehypeCode` beside defaults |
| Fence `title="…"` | **Shipped** — meta → `pre` title → [`components/codeblock.tsx`](../../apps/docs/components/codeblock.tsx) header |
| Language `icon` HTML | **Shipped** — `CodeBlock` renders string icons via `dangerouslySetInnerHTML` |
| Inline `{:lang}` highlight | **Outside** — `inline: 'tailing-curly-colon'` not set |
| Custom themes / `filterMetaString` / `icon` option | **Outside** until named reopen |
| UI | `CodeBlock` + `Pre` in [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) |

Wire test enforces no `rehypeCode` / `rehypeCodeOptions` / `rehypePlugins` re-wire + Active CodeBlock title/icon path.

---

## Upstream ladder (reference only)

### Fumadocs MDX (Lite path — options only when reopening)

```ts
// Upstream option surface — NOT on Lite disk today
import { defineConfig } from "fumadocs-mdx/config";

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
```

### Raw MDX compiler (not Lite)

```ts
// Upstream — NOT Lite (Fumadocs MDX already includes the plugin)
import { rehypeCode } from "fumadocs-core/mdx-plugins";

await compile("...", {
  rehypePlugins: [rehypeCode],
  // or [rehypeCode, rehypeCodeOptions]
});
```

### Meta → title

````mdx
```js title="Title"
console.log("Hello");
```
````

Upstream attaches `title` on `<pre>`; Lite `CodeBlock` shows it in the figcaption row.

### Inline (Outside on Lite)

```ts
// Upstream — NOT Lite
rehypeCodeOptions: { inline: "tailing-curly-colon" };
```

```md
`console.log("hello world"){:js}`
```

### Icon

Language meta yields an HTML `icon` string on `<pre>`. Lite `CodeBlock` already consumes it. Disable/customize only via reopen + `icon` option.

Further options inherit from [Shiki](https://shiki.style).

---

## Why defaults (Lite)

| Approach | When |
|----------|------|
| Default Rehype Code + CLI CodeBlock | **Lite** |
| `rehypeCodeOptions` themes / transformers | Named Docs Rehype Code reopen |
| `inline: 'tailing-curly-colon'` | Inline highlight demand — Outside until reopen |
| Custom `rehypePlugins: [rehypeCode]` | Drift / duplicate highlight — never on Fumadocs MDX Lite |
| Direct `shiki` dep pin | Only if a named slice requires a version pin — [openapi.md](openapi.md) |

---

## When reopen is allowed

Explicit Docs Rehype Code reopen must cover:

1. Why upstream default themes / meta / icons are insufficient
2. Exact `rehypeCodeOptions` (themes · `inline` · `filterMetaString` · `icon`)
3. Impact on OpenAPI / AsyncAPI (Outside) highlighted samples and LLM markdown extract
4. Parity with `CodeBlock` `keepBackground` / dark mode tokens
5. Wire tests + [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · this chapter

Until then: defaults only — no `rehypeCodeOptions` on disk.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `rehypeCodeOptions` | Unreviewed Shiki / theme / inline behavior |
| Custom `rehypePlugins` with Rehype Code | Duplicate pipeline beside Fumadocs MDX defaults |
| `inline: 'tailing-curly-colon'` without reopen | Authoring syntax change across all MDX |
| Treating highlight as open backlog | Named reopen only |

---

## Verify

```text
1. source.config.ts: no rehypeCode · no rehypeCodeOptions · no rehypePlugins
2. remarkPlugins: remarkBlockId only
3. components/codeblock.tsx: title + icon (string → dangerouslySetInnerHTML) + shiki classes
4. components/mdx.tsx: CodeBlock + Pre on pre
5. Wire test: docs-openapi-wire Rehype Code + MDX Plugins
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [headings.md](headings.md) · [package-install.md](package-install.md) · [README.md](README.md).
