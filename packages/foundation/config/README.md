# `@afenda/config`

Rank-1 Platform **dev-time** shared tooling: Biome presets (via Ultracite) and TypeScript bases that workspace packages and apps extend. There is **no runtime API** and **no** `@afenda/*` import surface for product code — only JSON export paths for `extends` / Biome.

Use this package when adding or revising a workspace `tsconfig.json`, or when the root Biome chain needs a single shared preset home. Do **not** invent a parallel ESLint / Prettier stack for product JS/TS — Biome + `@afenda/config` is the checkout lint/format posture ([AGENTS.md](../../AGENTS.md)). Maintainers run lint via the filter script below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace **devDependency** — extend by export path (not a JS import):

```json
// packages/*/tsconfig.json — Node / library packages
{
  "extends": "@afenda/config/tsconfig/base.json"
}
```

```json
// packages/surfaces/ui-system, packages/surfaces/emails, testing — React libraries
{
  "extends": "@afenda/config/tsconfig/react-library.json"
}
```

```json
// apps/web, apps/docs — Next.js App Router
{
  "extends": "@afenda/config/tsconfig/nextjs.json"
}
```

Root Biome delegates once:

```jsonc
// biome.jsonc (repo root)
{
  "extends": ["@afenda/config/biome.json"]
}
```

Chain: root [`biome.jsonc`](../../biome.jsonc) → `@afenda/config/biome.json` → `ultracite/biome/{core,react,next,vitest}`. Package trees do **not** ship nested `biome.json` unless a real package-only carve-out appears.

**Living consumers:** root + `apps/{web,docs}` + packages (`auth`, `db`, `env`, `emails`, `ui-system`, `errors`, `logger`, `rate-limit`, `admin`, …) list `@afenda/config` as `workspace:*` and extend the matching tsconfig. Vitest / Playwright factory lives under [`testing/`](../../testing/) — not this package.

## Maintain

```bash
pnpm --filter @afenda/config lint
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/config/biome` · `@afenda/config/biome.json` | Shared Biome config (Ultracite presets + ignore defaults) |
| `@afenda/config/tsconfig/base.json` | Strict ES2022 / bundler resolution — Node & non-UI packages |
| `@afenda/config/tsconfig/nextjs.json` | Extends base + DOM · `jsx` · Next plugin — apps |
| `@afenda/config/tsconfig/react-library.json` | Extends base + DOM · `jsx` — React libraries |

On disk: `packages/foundation/config/biome.json`, `packages/foundation/config/tsconfig/{base,nextjs,react-library}.json`.

## Ownership

| Surface | Owner |
|---------|-------|
| Shared Biome + tsconfig bases | `@afenda/config` |
| Root `includes` / product `overrides` | Repo-root [`biome.jsonc`](../../biome.jsonc) |
| Per-package `compilerOptions` deltas (`rootDir`, `types`, paths) | Owning package / app `tsconfig.json` |
| Vitest / Playwright factory | [`testing/`](../../testing/) |

**Layer:** Rank-1 Platform — **not a runtime importer**. Must not grow product APIs or import Surfaces / `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: runtime modules, ESLint/Prettier dual stacks, Vitest/Playwright config as a second factory, or nested per-package Biome trees that fork Ultracite. Keep `baseUrl` out of tsconfigs (`pnpm check:tsconfig-no-baseurl`).

## Authority

| Topic | Link |
|-------|------|
| Ultracite + Biome posture | [docs-V2/lint](../../docs-V2/lint/README.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture (Biome · no ESLint/Prettier invent) | [AGENTS.md](../../AGENTS.md) |
