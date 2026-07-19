# Fumadocs Core — Remark Steps (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-steps.md` |
| Authority | **Scratch** — upstream [Remark Steps](https://fumadocs.dev/docs/headless/mdx/remark-steps) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `remarkSteps` · Active JSX `<Steps>` / `<Step>` |
| Audience | Engineers considering heading `[step]` / numbered-heading step trees |
| Updated | 2026-07-19 |

Upstream `remarkSteps` wraps headings tagged `[step]` (or numbered `1.` / `2.` patterns) in `fd-steps` / `fd-step` divs. Lite ships CLI `<Steps>` / `<Step>` and authors steps in JSX (guide sample). Do **not** wire the remark plugin — dual models (heading markers + JSX) are blocked.

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring: [markdown.md](markdown.md). Components: [ui-components.md](ui-components.md). TOC note: [headings.md](headings.md) (`_step` Outside).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Steps UI | **Active** — JSX in [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) · [`components/steps.tsx`](../../apps/docs/components/steps.tsx) |
| Sample | [`content/docs/guide.mdx`](../../apps/docs/content/docs/guide.mdx) — hand `<Steps>` / `<Step>` |
| No `remarkSteps` | Absent from [`source.config.ts`](../../apps/docs/source.config.ts) |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| No heading `[step]` / numbered-heading step authoring | Prefer JSX |
| TOC `_step` from remark-steps | **Outside** — [headings.md](headings.md) |

Wire test enforces Outside plugin absent + Active `Steps` / `Step` registry.

---

## Active alternative (Lite)

```mdx
<Steps>
  <Step>

  ### One

  Do the first thing.

  </Step>
  <Step>

  ### Two

  Do the second thing.

  </Step>
</Steps>
```

---

## Upstream ladder (reference only — Outside)

Do **not** paste into Lite.

```ts
// Upstream — NOT Lite
import { remarkSteps } from "fumadocs-core/mdx-plugins/remark-steps";
import { defineConfig } from "fumadocs-mdx/config";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkSteps],
  },
});
```

```md
# Heading 1 [step]

## Sub Heading 1 [step]

# Heading 2 [step]
```

or numbered headings (`# 1. …`). Upstream wraps into `fd-steps` / `fd-step` div trees (not Lite’s JSX components).

---

## When reopen is allowed

Explicit Docs Remark Steps reopen must cover:

1. Why heading markers beat JSX `<Steps>` for Lite content
2. Conflict with Active `remarkBlockId`-only list — [mdx-plugins.md](mdx-plugins.md)
3. Dual syntax risk + TOC `_step` impact — [headings.md](headings.md) · [get-toc.md](get-toc.md)
4. CSS / component parity (`fd-steps` vs CLI `Steps`)
5. Wire tests flipped + this chapter + [markdown.md](markdown.md) · [ui-components.md](ui-components.md)

Until then: JSX `<Steps>` / `<Step>` only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `remarkSteps` | Second Steps pipeline beside JSX |
| Mixing `[step]` headings and `<Steps>` | Authoring drift |
| Treating Remark Steps as open backlog | Outside — named reopen only |

---

## Verify

```text
1. source.config.ts: no remarkSteps · remarkBlockId only
2. mdx.tsx + steps.tsx: Steps · Step
3. guide.mdx uses <Steps>/<Step> (not heading [step])
4. Wire test: docs-openapi-wire Remark Steps + MDX Plugins
5. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [markdown.md](markdown.md) · [ui-components.md](ui-components.md) · [headings.md](headings.md) · [remark-admonition.md](remark-admonition.md) · [remark-mdx-files.md](remark-mdx-files.md) · [README.md](README.md).
