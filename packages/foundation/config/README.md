# `@afenda/config`

Rank-1 Platform **dev-time** shared tooling: Biome presets (via Ultracite) and TypeScript bases that workspace packages and apps extend. There is **no runtime API** and **no import surface** — only JSON export paths for `extends` / Biome.

Rules live in [CONTRACT.md](./CONTRACT.md) and are exhaustive. This guide is explanatory; where the two disagree, the contract wins.

Do **not** invent a parallel ESLint / Prettier stack for product JS/TS — Biome + `@afenda/config` is the checkout lint/format posture ([AGENTS.md](../../../AGENTS.md)). Requires root engines: Node `24.x`, pnpm `≥10.33.4`.

## Consume

Workspace **devDependency** — extend by export path, never a JS import:

```json
// packages/* — runtime-neutral libraries
{ "extends": "@afenda/config/tsconfig/base.json" }
```

```json
// Node-backed packages consumed as source by the workspace bundlers
{ "extends": "@afenda/config/tsconfig/node-library.json" }
```

```json
// packages/surfaces/ui-system, packages/surfaces/emails, testing
{ "extends": "@afenda/config/tsconfig/react-library.json" }
```

```json
// apps/web, apps/docs — Next.js App Router
{ "extends": "@afenda/config/tsconfig/nextjs.json" }
```

Root Biome delegates once:

```jsonc
// biome.jsonc (repo root)
{
  "root": true,
  "extends": ["@afenda/config/biome.policy.json"]
}
```

Chain: root [`biome.jsonc`](../../../biome.jsonc) → `@afenda/config/biome.policy.json` → `ultracite/biome/{core,react,next,vitest}`. The shared policy file is named `biome.policy.json` on purpose — Biome auto-discovers any on-disk `biome.json` / `biome.jsonc` as a nested project config, which triggers a TypeAware monorepo scan. Package trees must not ship nested `biome.json` / `biome.jsonc` unless a real package-only carve-out appears.

The Vitest / Playwright factory lives under [`testing/`](../../../testing/README.md), not here.

## Two merge rules that bite

TypeScript **replaces** rather than merges `types`, `include`, `exclude`, and `files` across `extends`, and resolves relative paths against the config file they were written in.

**`types` — restate, then add.** Setting `types` discards the profile's entries silently:

```json
// ✗ drops react and react-dom — no error, just missing globals
{ "extends": "@afenda/config/tsconfig/react-library.json",
  "compilerOptions": { "types": ["vite/client"] } }

// ✓ superset (INV-6)
{ "extends": "@afenda/config/tsconfig/react-library.json",
  "compilerOptions": { "types": ["react", "react-dom", "vite/client"] } }
```

**`exclude` — glob form only.** `base.json` uses `**/`-prefixed entries so they resolve inside each consumer rather than inside this package (INV-7). A bare `"node_modules"` here would match nothing in consumers *and* suppress TypeScript's built-in default exclude.

`incremental` is on with no `tsBuildInfoFile`, so each consumer writes its own `tsconfig.tsbuildinfo` beside its config. Keep it gitignored and declared in the Turbo task `outputs`, or you get cache misses that look like flakes.

## Consumer boundary

- Consume only the export paths in `package.json#exports`.
- Keep `rootDir`, `paths`, and `include` in the consuming `tsconfig.json`.
- Never set `baseUrl` (INV-8).
- Change a shared option here only when it should upgrade every matching consumer.
- Do not add a JavaScript export or runtime dependency surface.

## Maintain

```bash
pnpm --filter @afenda/config lint
pnpm --filter @afenda/config test      # runs CONTRACT.md invariants
pnpm check:tsconfig-governance
pnpm check:biome-governance
pnpm --filter @afenda/config protect:check
```

Intentional edits require the local-only `AFENDA_PROTECTED_EDIT_TOKEN` unlock before refreshing `.protected.sha256`:

```bash
pnpm --filter @afenda/config protect:update
pnpm --filter @afenda/config protect:check
```

Run `pnpm check:readme` from the repository root after changing this guide.

## Exports

| Path | Role |
|------|------|
| `@afenda/config/biome.policy.json` | Shared Biome policy (Afenda overrides applied after the root Ultracite presets; not a discoverable nested Biome project) |
| `@afenda/config/tsconfig/base.json` | Strict ES2022 / `preserve` + bundler resolution, no ambient type packages |
| `@afenda/config/tsconfig/node-library.json` | base + Node ambient types; still source-consumed / no-emit |
| `@afenda/config/tsconfig/react-library.json` | base + DOM · `jsx: react-jsx` — React libraries |
| `@afenda/config/tsconfig/nextjs.json` | **react-library** + `jsx: preserve` · `allowJs` · Next plugin — apps |

On disk: `packages/foundation/config/biome.policy.json`, `packages/foundation/config/tsconfig/{base,node-library,nextjs,react-library}.json`.

`package.json#exports` is the machine-readable profile registry. Governance derives the approved specifiers from it; consumers must not maintain a second allowlist.

## Ownership

| Surface | Owner |
|---------|-------|
| Shared Biome + tsconfig bases | `@afenda/config` |
| Root `includes`, product `overrides` (SQL, generated code) | Repo-root [`biome.jsonc`](../../../biome.jsonc) |
| Per-package `rootDir`, `paths`, `include` | Owning package / app `tsconfig.json` |
| Vitest / Playwright factory | [`testing/`](../../../testing/) |

**Layer:** Rank-1 Platform — **not a runtime importer**. Must not grow product APIs or import Surfaces / `apps/*`.
## Out of scope

Runtime modules, ESLint/Prettier dual stacks, Vitest/Playwright config as a second factory, nested per-package Biome trees that fork Ultracite, and product-shaped overrides — those belong in the root `biome.jsonc`.

## Authority

| Topic | Link |
|-------|------|
| Package DAG / leaf rules | [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
