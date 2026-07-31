# `@afenda/config`

Rank-1 Platform **dev-time** shared tooling: Biome presets (via Ultracite) and TypeScript bases that workspace packages and apps extend. There is **no runtime API** and **no** `@afenda/*` import surface for product code — only JSON export paths for `extends` / Biome.

Use this package when adding or revising a workspace `tsconfig.json`, or when the root Biome chain needs a single shared preset home. Do **not** invent a parallel ESLint / Prettier stack for product JS/TS — Biome + `@afenda/config` is the checkout lint/format posture ([AGENTS.md](../../../AGENTS.md)). Maintainers run lint via the filter script below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace **devDependency** — extend by export path (not a JS import):

```json
// packages/*/tsconfig.json — runtime-neutral libraries
{
  "extends": "@afenda/config/tsconfig/base.json"
}
```

```json
// Node-backed packages consumed as source by the workspace bundlers
{
  "extends": "@afenda/config/tsconfig/node-library.json"
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

Chain: root [`biome.jsonc`](../../../biome.jsonc) → `@afenda/config/biome.json` → `ultracite/biome/{core,react,next,vitest}`. Package trees do **not** ship nested `biome.json` unless a real package-only carve-out appears.

Workspace apps and packages declare `@afenda/config` as a `workspace:*`
devDependency and extend the matching exported file. The Vitest / Playwright
factory lives under [`testing/`](../../../testing/README.md), not this package.

## Consumer boundary

- Consume only the JSON export paths declared in `package.json`.
- Keep package-specific `rootDir`, ambient `types`, aliases, and include/exclude
  choices in the consuming `tsconfig.json`.
- Change a shared compiler or formatter decision here only when it should
  upgrade every matching consumer.
- Do not add a JavaScript root export or runtime dependency surface.

## Maintain

```bash
pnpm --filter @afenda/config lint
pnpm --filter @afenda/config test
pnpm check:tsconfig-governance
pnpm check:biome-governance
pnpm --filter @afenda/config protect:check
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

Intentional edits to this package require the local-only
`AFENDA_PROTECTED_EDIT_TOKEN` unlock before refreshing `.protected.sha256`:

```bash
pnpm --filter @afenda/config protect:update
pnpm --filter @afenda/config protect:check
```

Run `pnpm check:readme` from the repository root after changing this guide.

## Exports

| Path | Role |
|------|------|
| `@afenda/config/biome.json` | Shared Biome config (Afenda policy applied after the root Ultracite presets) |
| `@afenda/config/tsconfig/base.json` | Strict ES2022 / preserve + bundler resolution with no ambient type packages |
| `@afenda/config/tsconfig/node-library.json` | Extends base + explicit Node ambient types; still source-consumed/no-emit |
| `@afenda/config/tsconfig/nextjs.json` | Extends base + DOM · `jsx` · Next plugin — apps |
| `@afenda/config/tsconfig/react-library.json` | Extends base + DOM · `jsx` — React libraries |

On disk: `packages/foundation/config/biome.json`, `packages/foundation/config/tsconfig/{base,node-library,nextjs,react-library}.json`.

`package.json#exports` is the machine-readable profile registry. Repository
governance derives the approved TypeScript and Biome specifiers from that
registry; consumers must not maintain a second preset allowlist.

## Ownership

| Surface | Owner |
|---------|-------|
| Shared Biome + tsconfig bases | `@afenda/config` |
| Root `includes` / product `overrides` | Repo-root [`biome.jsonc`](../../../biome.jsonc) |
| Per-package `compilerOptions` deltas (`rootDir`, `types`, paths) | Owning package / app `tsconfig.json` |
| Vitest / Playwright factory | [`testing/`](../../../testing/) |

**Layer:** Rank-1 Platform — **not a runtime importer**. Must not grow product APIs or import Surfaces / `apps/*`. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: runtime modules, ESLint/Prettier dual stacks, Vitest/Playwright config as a second factory, or nested per-package Biome trees that fork Ultracite. Keep `baseUrl` out of tsconfigs (`pnpm check:tsconfig-no-baseurl`).

## Authority

| Topic | Link |
|-------|------|
| Ultracite + Biome posture | [docs-V2/lint](../../../docs-V2/lint/README.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture (Biome · no ESLint/Prettier invent) | [AGENTS.md](../../../AGENTS.md) |
