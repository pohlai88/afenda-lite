# Fumadocs Core — Remark Admonition (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-admonition.md` |
| Authority | **Scratch** — upstream [Remark Admonition](https://fumadocs.dev/docs/headless/mdx/remark-admonition) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `remark-directive` / `remarkDirectiveAdmonition` · Active JSX `<Callout>` |
| Audience | Engineers migrating Docusaurus `:::` admonitions or considering dual callout syntax |
| Updated | 2026-07-19 |

Upstream offers a Docusaurus-style Admonition remark path (`remark-directive` + `remarkDirectiveAdmonition` → `:::tip` / `:::warning` fences). Upstream also **recommends JSX `<Callout>`** for flexibility and editor IntelliSense.

Lite locks **JSX Callout only**. Do not install `remark-directive` or wire `remarkDirectiveAdmonition`.

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring: [markdown.md](markdown.md). Component: [ui-components.md](ui-components.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Callouts | **Active** — `<Callout>` in [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) · [`components/callout.tsx`](../../apps/docs/components/callout.tsx) |
| No `remark-directive` | Absent from `@afenda/docs` `package.json` |
| No `remarkDirectiveAdmonition` | Absent from [`source.config.ts`](../../apps/docs/source.config.ts) |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| No `:::tip` / `:::warning` authoring | Prefer JSX in all Lite MDX |
| Types | `info` (default) · `warn`/`warning` · `error` · `success` · `idea` |

Wire test enforces Outside plugins absent + Active `Callout` registry.

---

## Active alternative (Lite)

```mdx
<Callout type="warn" title="Title">

Hello World

</Callout>
```

Shipped in guide / home / API intro MDX. Types and title props: [markdown.md](markdown.md).

---

## Upstream ladder (reference only — Outside)

Do **not** paste into Lite.

```bash
# Upstream — NOT Lite
pnpm add remark-directive
```

```ts
// Upstream — NOT Lite
import remarkDirective from "remark-directive";
import { remarkDirectiveAdmonition } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkDirective, remarkDirectiveAdmonition],
  },
});
```

```md
:::tip[This is a `title`]

Hello World

:::
```

Upstream expands toward `CalloutContainer` / `CalloutTitle` / `CalloutDescription` trees. Lite authors the stock `<Callout>` wrapper instead.

---

## When reopen is allowed

Explicit Docs Remark Admonition reopen must cover:

1. Why Docusaurus `:::` migration beats JSX Callout for Lite content
2. Conflict with Active `remarkBlockId`-only explicit list — [mdx-plugins.md](mdx-plugins.md)
3. Dual syntax risk (JSX + directives) and lint / authoring SSOT
4. MDX component registry for generated container names vs stock `Callout`
5. Wire tests flipped + this chapter + [markdown.md](markdown.md) · [ui-components.md](ui-components.md)

Until then: JSX `<Callout>` only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `remark-directive` install | Second callout pipeline |
| `remarkDirectiveAdmonition` beside `remarkBlockId` | Authoring drift · dual syntax |
| Mixing `:::tip` and `<Callout>` in content | Unreviewed dual models |
| Treating Admonition as open backlog | Outside — named reopen only |

---

## Verify

```text
1. package.json: no remark-directive
2. source.config.ts: no remarkDirective · no remarkDirectiveAdmonition · remarkBlockId only
3. mdx.tsx + callout.tsx: Callout shipped
4. Content uses <Callout> (guide / index) — no :::tip fences as product syntax
5. Wire test: docs-openapi-wire Remark Admonition + MDX Plugins
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [practices.md](practices.md) · [README.md](README.md).
