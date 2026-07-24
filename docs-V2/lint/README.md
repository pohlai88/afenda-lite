# Ultracite + Biome (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/lint/README.md` |
| Authority | **Scratch** — Context7 (`/haydenbleasel/ultracite` · `/biomejs/website`) + disk |
| Purpose | Lean lint/format posture; one engine |
| Updated | 2026-07-19 |

No DOC-002 rows. No links into `docs/`. Re-probe after Ultracite major or Biome catalog bump — not Living SSOT.

---

## Stack (disk)

| Layer | Job | Evidence |
|-------|-----|----------|
| Biome | Engine — format · lint · assist · CI | catalog `@biomejs/biome` `^2.5.3` |
| Ultracite | Biome presets (v7 paths) | `ultracite` `^7.9.4` |
| Shared config | Extends presets once | [`packages/foundation/config/biome.json`](../../packages/foundation/config/biome.json) |
| Root | Workspace `includes` + product `overrides` | [`biome.jsonc`](../../biome.jsonc) |

Chain: root → `@afenda/config/biome.json` → `ultracite/biome/{core,react,next,vitest}`. One root config — no nested package `biome.json` unless a real package-only carve-out appears.

---

## Commands

| Intent | Use |
|--------|-----|
| Day-to-day / Turbo | `pnpm lint` |
| Full-tree check | `pnpm lint:root` (`biome check .`) |
| CI | `pnpm lint:ci` (`biome ci .`) |
| Fix what you touched | `pnpm exec biome check --write <path>` |
| Setup diagnose | `pnpm exec ultracite doctor` |

`ultracite check` / `fix` are fine for ad-hoc CLI; **repo scripts stay on Biome** so CI and packages share one path. Skip `ultracite init` — config exists. `--unsafe` needs an explicit ask.

---

## Practices

| Do | Don't |
|----|-------|
| Keep local rules thin; Ultracite owns the catalog | Parallel ESLint/Prettier for product JS/TS |
| Exceptions via narrow `overrides` | Global rule `off` for one file |
| Exclude with `!` (skip processing) / `!!` (skip project index) — docs, DNA, `public/`, drizzle dumps | Lint `.next`, markdown, agent trees as product |
| Editor: Biome for JS/TS/JSON/CSS + organize-imports on save | Dual formatters fighting on product TS |
| `biome.lsp.bin` platform map + `public-hoist-pattern[]=@biomejs/cli-*` in `.npmrc` | Node wrapper path (Windows LSP “couldn't create connection to server”) |
| `pnpm check:editor-biome` in `pnpm checks` | Drifting `.vscode/settings.json` without gate |
| `$schema` matches installed Biome; presets use `ultracite/biome/*` | Ultracite v6 paths (`ultracite/core`) or leftover `.eslintrc*` / `.prettierrc*` |
| Suppress: `biome-ignore lint/…: reason` | `eslint-disable` for Biome findings |

Disk override shape to copy: `@afenda/ui-system` UI/hooks (shadcn regen) · landing CSS (`!important` for reduced-motion). Do not spawn a second config tree.

---

## Editor (VS Code / Cursor)

SSOT: [`scripts/lib/editor-posture.mjs`](../../scripts/lib/editor-posture.mjs) · gate: `pnpm check:editor-biome` · hook: [`.cursor/hooks/no-editor-biome-drift.mjs`](../../.cursor/hooks/no-editor-biome-drift.mjs) · rule: [`.cursor/rules/editor-workspace-posture.mdc`](../../.cursor/rules/editor-workspace-posture.mdc)

| Area | Required posture |
|------|------------------|
| Biome LSP | Native `@biomejs/cli-*` platform map; `biome.lsp.watcher.kind: none`; `.npmrc` hoist + `pnpm install` |
| Formatters | `biomejs.biome` for JS/TS/JSON/CSS; Prettier for md/mdx only |
| tsserver | `disableAutomaticTypeAcquisition: true`; capped memory; `watchOptions.excludeDirectories` incl. `docs-V2` |
| Explorer | `excludeGitIgnore: false`; `files.watcherExclude` SSOT (incl. `docs-V2/**` watcher-only) |
| Tailwind ext | `experimental.configFile` → `apps/web/postcss.config.mjs`; scoped `files.exclude` |

**Symptom:** `Initializing …/tsconfig.json` — **normal once per package per session** (37 package tsconfigs). Not a failure unless it repeats on every keystroke.

**Symptom:** `couldn't create connection to server` — node-wrapper `biome.lsp.bin`, or stale extension cache. Delete `%APPDATA%\\Cursor\\User\\globalStorage\\biomejs.biome\\tmp-bin`, run `pnpm install`, `pnpm check:editor-biome`, reload window.

**Symptom:** `write EOF` / `write EPIPE` / `connection to server is erroring. Shutting down server` — LSP **client** transport failure after the Biome server process exited. This is not a Biome lint diagnostic; read **Output → Biome** for `[cli-stderr]` **FATAL** / **INTERNAL** lines ([diagnostics reference](https://biomejs.dev/reference/diagnostics/)). Workflow: set `"biome.lsp.trace.server": "verbose"` (user settings) → reload → reproduce → classify stderr → kill all `biome.exe` → clear `globalStorage/biomejs.biome` → `pnpm check:editor-biome` (includes `lsp-proxy` smoke) → reload window → set trace back to `"off"`.

**Symptom:** Explorer stalls — re-enabling `excludeGitIgnore` or dropping watcher excludes. Run `pnpm check:editor-biome`.

**User settings:** must not override workspace (`excludeGitIgnore`, global Biome paths, ESLint/Prettier as TS formatter).

---

## Verify

```text
1. pnpm check:editor-biome
2. pnpm exec ultracite doctor
3. pnpm lint:root
4. pnpm exec biome check --write <path>
5. pnpm lint:ci
```

Smell: schema 2.x · assist (not legacy top-level `organizeImports`) · no ESLint/Prettier residue for product JS/TS.

---

## Hard stops

- Second linter stack for product JS/TS  
- `ultracite init` rewrite without an explicit ask  
- Broad disables to silence CI  
- Treating `docs/` · `docs-V2/` · `apps/web/shadcn-studio` · `public/` as product lint surface  
- Product/package edits from this pack alone  

Companion: [../discipline/README.md](../discipline/README.md) · [../nextjs/practices.md](../nextjs/practices.md) · [../deploy/README.md](../deploy/README.md).
