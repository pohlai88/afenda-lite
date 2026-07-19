# Fumadocs UI components (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/ui-components.md` |
| Authority | **Scratch** — [ui.md](ui.md) status legend · disk `apps/docs/components/mdx.tsx` |
| Audience | Engineers writing narrative MDX or extending the MDX registry |
| Updated | 2026-07-19 |

Component catalog for Fumadocs UI in Lite. Authoring habits (frontmatter, anti-patterns) stay in [practices.md](practices.md). This file is the **SSOT for which components are allowed and their status**.

Registry disk: `apps/docs/components/mdx.tsx` · `source.config.ts` sets `providerImportSource: "@/components/mdx"`. Live samples: `apps/docs/content/docs/guide.mdx` (reference — not expanded by this pack).

---

## Registry wire

```tsx
import defaultMdxComponents from "fumadocs-ui/mdx";
// + Accordion, Tabs, Steps, Files, TypeTable
// + APIPage / OpenAPIPage

export function getMDXComponents(components?) {
  return {
    ...defaultMdxComponents,
    Accordion, Accordions, File, Files, Folder,
    Step, Steps, Tab, Tabs, TypeTable,
    APIPage, OpenAPIPage: APIPage,
    ...components,
  };
}
```

Defaults from `fumadocs-ui/mdx` include Callout, Cards/Card, code blocks, and standard MDX element mappings. Explicit imports add the interactive set below.

---

## Shipped (use in narrative MDX)

| Component | Source | Typical use |
|-----------|--------|-------------|
| `Callout` | `fumadocs-ui/mdx` defaults | Warnings · Day-1 boundaries |
| `Cards` / `Card` | `fumadocs-ui/mdx` defaults | Section landings · internal links |
| Code blocks | `fumadocs-ui/mdx` defaults | Fenced examples (` ```tsx `) |
| `Tabs` / `Tab` | `fumadocs-ui/components/tabs` | Command variants |
| `Steps` / `Step` | `fumadocs-ui/components/steps` | Pipelines |
| `Files` / `Folder` / `File` | `fumadocs-ui/components/files` | Content trees |
| `Accordions` / `Accordion` | `fumadocs-ui/components/accordion` | Pitfalls / FAQ |
| `TypeTable` | `fumadocs-ui/components/type-table` | Manual field tables only |
| `APIPage` / `OpenAPIPage` | `@/components/api-page` | Generated OpenAPI ops — [openapi.md](openapi.md) |

```mdx
<Callout type="warn" title="Not DOC-001">
  Fumadocs is a Day-1 mirror — not Controlled documentation authority.
</Callout>

<Cards>
  <Card title="HTTP API" href="/docs/api">Generated OpenAPI operations.</Card>
</Cards>

<Tabs items={["pnpm", "npm"]}>
  <Tab value="pnpm">pnpm --filter @afenda/docs dev</Tab>
  <Tab value="npm">npm run dev --workspace @afenda/docs</Tab>
</Tabs>
```

Prefer generated API pages over pasting HTTP tables. Prefer [ui.md](ui.md) / Scratch packs over inventing product UI in MDX.

---

## Documented / not wired

Upstream Fumadocs UI components **not** registered in Lite `getMDXComponents` and **not** used in app layouts. Config shape only — do not claim they work in MDX until registered + demoed.

| Component | Upstream path | Notes |
|-----------|---------------|-------|
| `Banner` | `fumadocs-ui/components/banner` | Site-wide announcement; often layout-level, not MDX |
| `ImageZoom` | `fumadocs-ui/components/image-zoom` | Zoomable images |
| `InlineTOC` | `fumadocs-ui/components/inline-toc` | In-body TOC (page already has `DocsPage` toc) |
| `GithubInfo` | `fumadocs-ui/components/github-info` | Repo meta chrome |
| `DynamicCodeBlock` | `fumadocs-ui/components/dynamic-codeblock` | Runtime-highlighted code |
| Graph view | `fumadocs-ui/components/graph-view` | Link graph visualization |
| Codeblock deep APIs | Upstream codeblock docs | Beyond default fenced blocks from `fumadocs-ui/mdx` |

**To wire later (checklist):**

```text
1. Import from fumadocs-ui/components/<name>
2. Register in getMDXComponents (or layout for Banner)
3. Add a guide.mdx sample
4. pnpm --filter @afenda/docs typecheck · lint:links · spot-check :3001
```

Do not use Fumadocs CLI local install as the default path — [ui.md](ui.md) CLI stance.

---

## Out of scope (Day-1 ban)

| Surface | Why |
|---------|-----|
| `AutoTypeTable` / Twoslash | Extra TS extract / highlight stack — not Lite docs Day-1 |
| `ComponentPreview` · `CopyCommandButton` | 8bitcn / registry preview patterns |
| `@8bitcn/*` · paid shadcn registries | Explicit pack ban — [README.md](README.md) |
| Product `@afenda/ui-system` in docs MDX | Product design system ≠ docs mirror; needs explicit slice |
| Vendor skills `fumadocs-component-docs` · `fumadocs-registry-integration` | N/A for Lite docs |

---

## OpenAPI UI (related, not MDX chrome)

| Status | **Shipped** |
|--------|-------------|
| Wire | `APIPage` in MDX registry + preload on operation pages |
| Styles | `fumadocs-openapi/css/preset.css` — [ui.md](ui.md) Theme |
| Contract | [openapi.md](openapi.md) |

Do not grow a second Swagger UI under `apps/web`.

---

## Verify

```text
1. Read apps/docs/components/mdx.tsx — Shipped table matches exports
2. Grep apps/docs for Banner|ImageZoom|AutoTypeTable|ComponentPreview — expect no product wiring
3. After registry edits: generate:source · lint:links · typecheck
```

Companion: [practices.md](practices.md) · [ui.md](ui.md) · [ui-layouts.md](ui-layouts.md) · [openapi.md](openapi.md).
