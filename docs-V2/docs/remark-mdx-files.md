# Fumadocs Core — Remark Files (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-mdx-files.md` |
| Authority | **Scratch** — upstream [Remark Files](https://fumadocs.dev/docs/headless/mdx/remark-mdx-files) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `remarkMdxFiles` · Active JSX `<Files>` / `<Folder>` / `<File>` |
| Audience | Engineers wanting ASCII file-tree fences (` ```files `) vs hand JSX trees |
| Updated | 2026-07-19 |

Upstream `remarkMdxFiles` turns `` ```files `` tree fences into `<Files>` / `<Folder>` / `<File>` MDX. Lite already ships those components and authors trees in JSX (guide sample). Do **not** wire the remark plugin — dual syntax (fence + JSX) is blocked.

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring: [markdown.md](markdown.md). Components: [ui-components.md](ui-components.md). Optional CLI tree generator: [cli.md](cli.md) (`fd:tree` Outside baseline).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| File trees | **Active** — JSX in [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) · [`components/files.tsx`](../../apps/docs/components/files.tsx) |
| Sample | [`content/docs/guide.mdx`](../../apps/docs/content/docs/guide.mdx) — hand `<Files>` |
| No `remarkMdxFiles` | Absent from [`source.config.ts`](../../apps/docs/source.config.ts) |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| No `` ```files `` fence authoring | Prefer JSX (or CLI `fd:tree` output as JSX, not the remark path) |

Wire test enforces Outside plugin absent + Active `Files` / `Folder` / `File` registry.

---

## Active alternative (Lite)

```mdx
<Files>
  <Folder name="project" defaultOpen>
    <Folder name="src" defaultOpen>
      <File name="index.js" />
      <Folder name="utils" defaultOpen>
        <File name="helper.js" />
      </Folder>
    </Folder>
    <File name="package.json" />
  </Folder>
</Files>
```

---

## Upstream ladder (reference only — Outside)

Do **not** paste into Lite.

```ts
// Upstream — NOT Lite
import { remarkMdxFiles } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxFiles],
  },
});
```

````md
```files
project
├── src
│   └── index.js
└── package.json
```
````

Upstream expands to the JSX tree above.

---

## When reopen is allowed

Explicit Docs Remark Files reopen must cover:

1. Why `` ```files `` fences beat hand JSX / CLI `fd:tree` for Lite content
2. Conflict with Active `remarkBlockId`-only explicit list — [mdx-plugins.md](mdx-plugins.md)
3. Dual syntax risk (fence + JSX) and lint / authoring SSOT
4. Wire tests flipped + this chapter + [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [cli.md](cli.md)

Until then: JSX `<Files>` only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `remarkMdxFiles` | Second file-tree pipeline beside JSX |
| Mixing `` ```files `` and `<Files>` | Authoring drift |
| Treating Remark Files as open backlog | Outside — named reopen only |

---

## Verify

```text
1. source.config.ts: no remarkMdxFiles · remarkBlockId only
2. mdx.tsx + files.tsx: Files · Folder · File
3. guide.mdx uses <Files> JSX (not ```files fence)
4. Wire test: docs-openapi-wire Remark Files + MDX Plugins
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [cli.md](cli.md) · [remark-admonition.md](remark-admonition.md) · [README.md](README.md).
