# Fumadocs CLI (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/cli.md` |
| Authority | **Scratch** — upstream [Fumadocs CLI](https://fumadocs.dev/docs/cli) · disk `@afenda/docs` |
| Status | **Active** — Radix lock · full UI component set owned under `components/` |
| Audience | Engineers adding CLI components or regenerating Files trees |
| Updated | 2026-07-19 |

`@fumadocs/cli` automates Fumadocs component installs and layout customization. It fetches component sources from the Fumadocs GitHub repo and rewrites import paths (Shadcn-style). Lite pins the CLI on `@afenda/docs` and locks **`uiLibrary: "radix-ui"`** so installs stay aligned with the Radix `fumadocs-ui` package.

UI component SSOT after install: [ui-components.md](ui-components.md). Do **not** use this for product `@afenda/ui-system` or banned registries.

---

## Disk config

| Path | Role |
|------|------|
| `apps/docs/cli.json` | CLI config (aliases · `uiLibrary` · `framework`) |
| `apps/docs/package.json` | `"@fumadocs/cli": "^1.4.1"` (devDependency) + `fd:*` scripts |
| `apps/docs/components/*.tsx` | CLI-owned Radix UI components (accordion · banner · …) |
| `apps/docs/components/ui/*` | CLI-owned primitives (button · accordion · tabs · collapsible) |
| `apps/docs/components/feedback/*` | CLI Feedback UI |
| `apps/docs/lib/github-feedback.ts` | Feedback server actions → GitHub Discussions |
| `apps/docs/lib/cn.ts` · `build-graph.ts` | CLI helpers |
| `apps/docs/scripts/cli-add-silent.mts` | Non-interactive `add` (auto-override) |
| `apps/docs/components/docs-graph-view.tsx` | Lite RSC wrapper for Graph View MDX |

### `cli.json` (shipped)

```json
{
  "$schema": "node_modules/@fumadocs/cli/dist/schema.json",
  "aliases": {
    "uiDir": "./components/ui",
    "componentsDir": "./components",
    "layoutDir": "./layouts",
    "cssDir": "./app",
    "libDir": "./lib"
  },
  "baseDir": "",
  "uiLibrary": "radix-ui",
  "framework": "next",
  "commands": {}
}
```

| Knob | Lite | Notes |
|------|------|-------|
| `uiLibrary` | `"radix-ui"` | **Must** — never `"base-ui"` (diverges from Radix `fumadocs-ui` lock) |
| `framework` | `"next"` | App Router docs app |
| `componentsDir` | `./components` | Graph View lands here |
| `libDir` | `./lib` | `build-graph.ts` lands here |
| `cssDir` | `./app` | Aligns with `app/global.css` (not a separate `styles/` tree) |
| `layoutDir` | `./layouts` | Used only if `customize` runs — outside baseline |

---

## Commands

Run from `apps/docs` (or `pnpm --filter @afenda/docs …`). Prefer package scripts over ad-hoc `dlx` so the pinned CLI + `cli.json` apply.

| Script | Equivalent | Lite |
|--------|------------|------|
| `pnpm --filter @afenda/docs fd -- -h` | `cli -h` | Help |
| `pnpm --filter @afenda/docs fd:add -- <names>` | `cli add …` | Interactive (confirms) |
| `pnpm --filter @afenda/docs fd:add:silent -- <names>` | `cli-add-silent.mts` | **Preferred** — auto-override · records deps in `package.json` |
| `pnpm --filter @afenda/docs fd:customize` | `cli customize` | Outside baseline — forks layout into `./layouts` |
| `pnpm --filter @afenda/docs fd:tree -- <dir> <out>` | `cli tree …` | Outside baseline — generate Files trees on demand |
| `cli export` | — | Outside baseline |

Upstream also documents `pnpm dlx @fumadocs/cli` without a local install. Lite **pins** `@fumadocs/cli` so `$schema` resolves and `uiLibrary` cannot silently default to Base UI via a fresh `dlx` init.

### Installation (init)

Config is already present (`cli.json`). Re-init only if the file is missing:

```bash
pnpm --filter @afenda/docs exec cli
# then set uiLibrary to radix-ui — never leave base-ui
```

### Components (`add`)

Enterprise docs own the Radix UI component sources under `apps/docs/components` (registry `fumadocs/radix-ui` + root `graph-view` / `feedback`).

```bash
# Non-interactive (preferred)
pnpm --filter @afenda/docs fd:add:silent -- accordion banner callout card codeblock files github-info heading image-zoom inline-toc steps tabs type-table feedback graph-view
pnpm install
# Interactive alternative:
pnpm --filter @afenda/docs fd:add -- accordion banner
```

| Installed (CLI) | Wired |
|-----------------|-------|
| `accordion` · `banner` · `callout` · `card` · `codeblock` · `files` · `github-info` · `heading` · `image-zoom` · `inline-toc` · `steps` · `tabs` · `type-table` · `graph-view` | **Shipped** — [ui-components.md](ui-components.md) |
| `feedback` | **Shipped** — page mount + `lib/github-feedback.ts`; GitHub App ops **opened** ([feedback.md](feedback.md)) |
| UI primitives (`button` · `collapsible` · …) | Pulled as subcomponents |

Not in CLI registry (keep package import): `DynamicCodeBlock` · `AutoTypeTable` · layouts (`DocsLayout` stays `fumadocs-ui`).

After any `add`:

1. `pnpm install` if deps were recorded
2. Point `mdx.tsx` / layouts at `@/components/…`
3. Update [ui-components.md](ui-components.md) + wire test
4. `pnpm --filter @afenda/docs typecheck` · `test` · spot-check `:3001`

### Customize

```bash
pnpm --filter @afenda/docs fd:customize
```

Copies layout sources into `layoutDir` for local edits. Lite keeps stock `DocsLayout` from `fumadocs-ui` — do not run customize without a named Docs slice (then update [ui-layouts.md](ui-layouts.md)).

Full ladder (props → CSS → customize): **[customize-ui.md](customize-ui.md)**. Prefer DocsLayout props before CSS or `fd:customize`.

### Tree

Generate a `Files` / `Folder` / `File` tree for MDX:

```bash
pnpm --filter @afenda/docs fd:tree -- ./content/docs ./components/content-tree.tsx
# or MDX:
pnpm --filter @afenda/docs fd:tree -- ./content/docs ./content/docs/_tree.mdx
pnpm --filter @afenda/docs exec cli tree -h
```

Lite’s guide uses a hand-authored `<Files>` sample — generated trees are optional tooling, not required for the active catalog. Do not enable `remarkMdxFiles` for `` ```files `` fences — [remark-mdx-files.md](remark-mdx-files.md).

---

## How it works

1. CLI fetches the latest component sources from the Fumadocs GitHub repository
2. Writes into `aliases.*` paths from `cli.json`
3. Transforms import paths for the local app

Always use the pinned `@fumadocs/cli` version on `@afenda/docs` (or bump deliberately with a Docs slice).

---

## Hard stops

| Stop | Why |
|------|-----|
| `"uiLibrary": "base-ui"` | Breaks Radix lock — [ui.md](ui.md) Component library |
| CLI as default path for every MDX component | Prefer `fumadocs-ui/...` package imports |
| 8bitcn / shadcn registry on docs | **Banned** — [ui-components.md](ui-components.md) |
| Product `@afenda/ui-system` via Fumadocs CLI | Different design system |
| `customize` without updating Scratch layouts | Layout forks must be documented |

---

## Verify

```text
1. Test-Path apps/docs/cli.json · node_modules/@fumadocs/cli/dist/schema.json
2. Grep cli.json: "uiLibrary": "radix-ui" (not base-ui)
3. package.json devDependencies include @fumadocs/cli; scripts fd / fd:add / fd:customize / fd:tree
4. Graph View files present; wire test green
5. pnpm --filter @afenda/docs exec cli -h
```

Companion: [ui.md](ui.md) · [ui-components.md](ui-components.md) · [README.md](README.md).
