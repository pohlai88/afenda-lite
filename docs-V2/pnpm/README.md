# pnpm workspaces / install (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/pnpm/README.md` |
| Authority | **Scratch** — pnpm · monorepo-management + disk (`pnpm-workspace.yaml` · `.npmrc` · `packageManager` · CI) |
| Purpose | Lean monorepo install · filter · catalog · CI lockfile posture |
| Updated | 2026-07-19 |

Re-probe after workspace, catalog, or Corepack pin change — not Living SSOT.

---

## Posture (disk)

| Item | Evidence |
|------|----------|
| Pin | Root `packageManager`: `pnpm@10.33.4+…` (Corepack) · `engines`: `node` `24.x` · `pnpm` `>=10.33.4` |
| Workspace | [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) — `apps/*` · `packages/*` · default `catalog` · `catalogs.zod3` defined for intentional forks (unused — no `catalog:zod3` consumer yet) |
| Lockfile | Single root `pnpm-lock.yaml` (shared workspace lockfile) — packages still only see declared deps |
| Install policy | [`.npmrc`](../../.npmrc) — `prefer-frozen-lockfile=true` · `auto-install-peers=true` · `strict-peer-dependencies=false` · `engine-strict=true` · `fund=false` · `manage-package-manager-versions=true` · `save-workspace-protocol=rolling` · `disallow-workspace-cycles=true` · **no** `shamefully-hoist` |
| Native builds | Root `pnpm.onlyBuiltDependencies` — `@swc/core` · `esbuild` · `sharp` · `unrs-resolver` |
| Patches | `pnpm.patchedDependencies` → `patches/next-themes@0.4.6.patch` |
| CI | `pnpm/action-setup@v4` **omit** `version:` (reads `packageManager`) · `actions/setup-node` `cache: pnpm` · `node-version: "24"` · `pnpm install --frozen-lockfile` |

---

## Rules (must)

| # | Do | Don't |
|---|----|-------|
| 1 | Internal `@afenda/*` → `"workspace:*"` | Semver / registry pin on `@afenda/*` |
| 2 | Shared externals → `"catalog:"` when listed; forks → named catalog (`zod3`) | Re-pin the same external per package (exception: `@afenda/docs` pins `tailwindcss` + `@tailwindcss/postcss` `^4.3.3` for fumadocs-openapi `-inset-s-*`) |
| 3 | Declare every import in that package's `package.json` | Phantom / hoist-only deps (docs: also declare Turbopack client-resolved peers such as `mdast-util-to-markdown`) |
| 4 | Target packages with `pnpm --filter <name>` | Guess from cwd / npm / yarn |
| 5 | CI / deploy installs → `--frozen-lockfile` | Mute lockfile drift in CI |
| 6 | Resolve pnpm from root `packageManager` only | `pnpm/action-setup` `version:` **and** `packageManager` |

---

## Commands

| Intent | Use |
|--------|-----|
| Install (local) | `pnpm install` |
| Install (CI) | `pnpm install --frozen-lockfile` |
| Dev web | `pnpm --filter @afenda/web dev` |
| Dev docs | `pnpm --filter @afenda/docs dev` |
| Add external to a package | `pnpm --filter @afenda/<pkg> add <dep>` |
| Add workspace dep | `pnpm --filter @afenda/web add @afenda/db` |
| Root tooling | `pnpm add -Dw <dep>` |
| Package **+ its deps** | `pnpm --filter @afenda/web... <cmd>` |
| Package **+ dependents** | `pnpm --filter ...@afenda/db <cmd>` |

Prefer root Turbo scripts (`pnpm lint`, `pnpm typecheck`, `pnpm exec turbo run build --filter=@afenda/web`) over ad-hoc `-r` when a root script already exists.

---

## Add a dep

```text
[ ] pnpm --filter @afenda/<pkg> add <dep> (or -Dw for root tooling)
[ ] Shared across packages → version in pnpm-workspace.yaml catalog → "catalog:" in package.json
[ ] Intentional version fork → catalogs.<name> → "catalog:<name>" (e.g. zod3)
[ ] Bump a shared range once in the catalog → pnpm install → commit pnpm-lock.yaml
[ ] @afenda/* → "workspace:*" only
[ ] Commit pnpm-lock.yaml with the change
```

---

## Verify

```text
1. pnpm -v   # matches packageManager major.minor (10.33.x)
2. pnpm install --frozen-lockfile
3. pnpm --filter @afenda/web exec node -e "console.log('ok')"
4. Docs Tailwind pin (not catalog:) — must resolve ≥ 4.3.3:
   pnpm --filter @afenda/docs list @tailwindcss/postcss tailwindcss --depth 0
   pnpm --filter @afenda/docs why @tailwindcss/postcss
```

---

## Peer Observations (disposed)

Documented dispose — leave as intentional vendor noise. Do **not** silence with `shamefully-hoist`, `pnpm.peerDependencyRules`, or overrides without a proven missing import on disk. Do **not** bump catalog `vite` casually for one unused optional peer.

### Capture (2026-07-19)

| Step | Result |
|------|--------|
| Before | `pnpm install` → exit 0 · “Lockfile is up to date, resolution step is skipped” · **no** peer `WARN` / “Issues with peer dependencies” frames (pnpm `10.33.4` + `strict-peer-dependencies=false`). Only non-peer box: Ignored build scripts `core-js@3.49.0`. |
| After (docs-only) | `pnpm install --frozen-lockfile` → exit 0 · same peer-frame absence · delta = **0** peer warnings removed (dispose ≠ silence). |

### Matrix

| Observation | Decision | Why | Disk evidence |
|-------------|----------|-----|---------------|
| `fumadocs-mdx` ↔ catalog `vite` | **Documented dispose (B)** — keep catalog `vite: ^6.4.3` | Docs uses fumadocs-mdx **Next** path (`generate:source` / `fumadocs-mdx/next`), not `fumadocs-mdx/vite`. Sole vite consumer is root Vitest; `vitest@4` peers `vite ^6 \|\| ^7 \|\| ^8`. Catalog bump to 7/8 is monorepo-wide for an unused optional peer. | `fumadocs-mdx@15.2.0` peer `vite: 7.x.x \|\| 8.x.x` + `peerDependenciesMeta.vite.optional: true` · root `vite@6.4.3` (`pnpm why vite` → one version) · no `fumadocs-mdx/vite` imports under `apps/docs` |
| Neon Auth / better-auth optionals | **Documented dispose** | Vendor adapter peers; Next path already wired. Unused DB/framework adapters must not be installed as fake “Closed”. | `@neondatabase/auth@0.4.2-beta` optional peers `next` / `react` / `react-dom` · `@afenda/auth` peers + imports `next`/`react`; `react-dom` from `@afenda/web` · nested `better-auth@1.4.18` optional peers (`prisma`, `drizzle-orm`, `mongodb`, `vue`, `svelte`, …) with **zero** imports under `packages/control-plane/auth` / `apps/web` |

### Anti-actions

| Do not | Why |
|--------|-----|
| Catalog-bump `vite` for docs alone | Vitest is the real consumer; 6.x is valid |
| Install unused better-auth adapters | No runtime import; bloats the graph |
| Add `peerDependencyRules` / overrides to mute | Hard-stop unless a declared import is missing |
| `shamefully-hoist=true` | Hides phantoms; disk policy forbids |

Companion pack: [../monorepo/README.md](../monorepo/README.md).

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| npm / yarn installs | Breaks store + lockfile contract — root `preinstall` → `scripts/only-allow-pnpm.mjs` |
| Dual `action-setup` `version:` + `packageManager` | Setup rejects dual sources |
| Literal semver while catalog owns the dep | Catalog drift / duplicate pins / noisier merges |
| `shamefully-hoist=true` as a “fix” | Hides phantoms; disk does not hoist |
| Reach into another package's `node_modules` | Bypasses declared deps |
| Workspace dependency cycles | Topological scripts unreliable; violates monorepo DAG |
| Invented `peerDependencyRules` / overrides without proven disk need | Silences honesty; see Peer Observations (disposed) |

Companion: [../monorepo/README.md](../monorepo/README.md) · [../deploy/README.md](../deploy/README.md) · [../docs/README.md](../docs/README.md).
