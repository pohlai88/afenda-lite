# Fumadocs Framework Mode — TypeScript integration (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/typescript.md` |
| Authority | **Scratch** — upstream [Typescript](https://fumadocs.dev/docs/integrations/typescript) · disk `@afenda/docs` |
| Status | **Active** — UI `AutoTypeTable` + `createGenerator` cache · TypeTable in MDX registry |
| Audience | Engineers documenting TypeScript shapes in narrative MDX |
| Updated | 2026-07-19 |

Upstream generates docs from TypeScript definitions via `fumadocs-typescript`: a **UI** `AutoTypeTable` and an optional **remark** `auto-type-table` plugin. Lite ships the **UI path** only.

MDX registry: [ui-components.md](ui-components.md). Samples: [`content/docs/guide.mdx`](../../apps/docs/content/docs/guide.mdx).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| Package | `fumadocs-typescript` on `@afenda/docs` dependencies |
| Generator | [`lib/docs-typescript.ts`](../../apps/docs/lib/docs-typescript.ts) — `createGenerator` + FS cache under `.next/fumadocs-typescript` |
| UI `AutoTypeTable` | [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) — `fumadocs-typescript/ui` + inject `generator` |
| Manual `TypeTable` | CLI → [`components/type-table.tsx`](../../apps/docs/components/type-table.tsx) in MDX registry |
| Demo types | [`lib/demo-types.ts`](../../apps/docs/lib/demo-types.ts) · guide `<AutoTypeTable path="lib/demo-types.ts" name="DocsProjectRule" />` |
| Remark `remarkAutoTypeTable` | **Outside baseline** — not in `source.config.ts` |
| Satteri / raw `@mdx-js/mdx` compile | **Outside baseline** — Fumadocs MDX + UI only |
| Product types as SSOT | Do **not** point AutoTypeTable at `@afenda/web` / product packages without a named Docs slice |

Wire test enforces package · generator · MDX wire · no remark plugin · guide sample.

---

## Usage (Lite)

```bash
pnpm --filter @afenda/docs add fumadocs-typescript   # already on disk
```

### Generator

```ts
// apps/docs/lib/docs-typescript.ts
import {
  createFileSystemGeneratorCache,
  createGenerator,
} from "fumadocs-typescript";

export const docsTypeGenerator = createGenerator({
  tsconfigPath: "./tsconfig.json",
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});
```

Cache lives under `.next/` (gitignored with the Next build).

### UI integration (shipped)

```tsx
// components/mdx.tsx
import { AutoTypeTable } from "fumadocs-typescript/ui";
import { TypeTable } from "@/components/type-table";
import { docsTypeGenerator } from "@/lib/docs-typescript";

AutoTypeTable: (props) => (
  <AutoTypeTable {...props} generator={docsTypeGenerator} />
),
TypeTable,
```

```mdx
<!-- content/docs/guide.mdx -->
<AutoTypeTable path="lib/demo-types.ts" name="DocsProjectRule" />
```

| Rule | Lite |
|------|------|
| Attribute values | Strings (MDX) |
| `path` | Relative to **docs app cwd** / `tsconfig` (UI mode) — prefer `lib/….ts` under `apps/docs` |
| `name` | Exported type / interface name |
| `TypeTable` in registry | Required companion for manual tables + AutoTypeTable rendering |

Manual shape (no TS extract):

```mdx
<TypeTable
  type={{
    noProductSecrets: {
      description: "…",
      type: "must",
      default: "enforced",
    },
  }}
/>
```

---

## Outside baseline — MDX remark plugin

Upstream can wire `remarkAutoTypeTable` in `source.config.ts` (Fumadocs MDX), raw `@mdx-js/mdx`, or Satteri. That yields lowercase `<auto-type-table />` with **paths relative to the MDX file**.

Lite keeps **UI** `<AutoTypeTable />` only — do not add `remarkAutoTypeTable` without a named Docs reopen (dual extract paths = drift).

```ts
// Upstream example — NOT Lite
remarkPlugins: [[remarkAutoTypeTable, { generator }]],
```

```mdx
<!-- Upstream remark form — NOT Lite -->
<auto-type-table path="./path/to/file.ts" name="MyInterface" />
```

---

## Annotations (tsdoc)

Use on exported types under `apps/docs` (demo or docs-owned helpers). Samples in [`lib/demo-types.ts`](../../apps/docs/lib/demo-types.ts).

| Tag | Effect |
|-----|--------|
| `@internal` | Hide field from the table |
| `@remarks \`Name\` …` | Show simplified type name `Name` |
| `@fumadocsType \`Name\`` | Force full type display name |
| `@fumadocsHref #anchor` | Link property to another Type Table anchor |

```ts
export type Example = {
  /**
   * @internal
   */
  cache: number;
  /**
   * @remarks `timestamp` Returned by API.
   */
  time: number;
  /**
   * @fumadocsType `MyBeautifulClient`
   */
  client: MyClient;
  /**
   * @fumadocsHref #type-table-temp.ts-MyClass-test
   */
  linked: MyClient;
};
```

Do **not** spray `@internal` on product API types to “hide” contract fields from Living/OpenAPI SSOT — AutoTypeTable is narrative docs only; HTTP shapes stay [openapi.md](openapi.md).

---

## Authoring checklist

1. Put demo / docs-owned types under `apps/docs/lib/**` (or another path inside the docs `tsconfig`)
2. Export the type; add tsdoc annotations as needed
3. In MDX: `<AutoTypeTable path="lib/….ts" name="ExportedName" />`
4. For hand-authored property maps use `<TypeTable type={{ … }} />`
5. `pnpm --filter @afenda/docs generate:source` · spot-check `/docs/guide`

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| `remarkAutoTypeTable` + UI AutoTypeTable dual path | Two extract rules (`path` relative-to-MDX vs cwd) |
| Satteri compiler for type tables | Lite compiler = Fumadocs MDX |
| AutoTypeTable → `apps/web` / `@afenda/db` without slice | Couples docs build to product graph · secrets risk |
| Treating AutoTypeTable as OpenAPI SSOT | Machine contract stays YAML — [openapi.md](openapi.md) |

---

## Verify

```text
1. package.json has fumadocs-typescript
2. lib/docs-typescript.ts: createGenerator + .next/fumadocs-typescript cache
3. mdx.tsx: AutoTypeTable from fumadocs-typescript/ui + TypeTable + docsTypeGenerator
4. source.config.ts: no remarkAutoTypeTable
5. guide.mdx: AutoTypeTable path="lib/demo-types.ts" name="DocsProjectRule"
6. pnpm --filter @afenda/docs test -- docs-openapi-wire · typecheck
```

Companion: [ui-components.md](ui-components.md) · [practices.md](practices.md) · [markdown.md](markdown.md) · [openapi.md](openapi.md).
