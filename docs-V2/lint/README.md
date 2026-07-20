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
| `$schema` matches installed Biome; presets use `ultracite/biome/*` | Ultracite v6 paths (`ultracite/core`) or leftover `.eslintrc*` / `.prettierrc*` |
| Suppress: `biome-ignore lint/…: reason` | `eslint-disable` for Biome findings |

Disk override shape to copy: `@afenda/ui-system` UI/hooks (shadcn regen) · landing CSS (`!important` for reduced-motion). Do not spawn a second config tree.

---

## Verify

```text
1. pnpm exec ultracite doctor
2. pnpm lint:root
3. pnpm exec biome check --write <path>
4. pnpm lint:ci
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
