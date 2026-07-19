# Monorepo boundaries (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/README.md` |
| Authority | **Scratch** — coding-standards (file/org) · monorepo-discipline + disk `packages/*` · `apps/web` |
| Purpose | Lean import / layer / workspace rules |
| Updated | 2026-07-19 |

Re-probe after package add/rename or DAG change.

---

## Layers (disk)

Imports flow **down** only. Packages never import `apps/*`. No cycles.

| Rank | Layer | Packages |
|------|-------|----------|
| 3 | Application | `apps/web` · `apps/docs` (`@afenda/docs`) |
| 2 | Surfaces | `@afenda/ui-system` · `@afenda/emails` |
| 1 | Platform | `@afenda/db` · `@afenda/auth` · `@afenda/env` · `@afenda/config` |

`@afenda/config` = devDep / tsconfig / Biome extend only — not a runtime import. `@afenda/auth` → `@afenda/env`. App domain: `apps/web/modules/*` · `features/*`.

`@afenda/docs` = official documentation site — may depend on workspace `@afenda/config` only; **must not** import `@afenda/db` · `@afenda/auth` · `@afenda/env` product secrets. OpenAPI consumer rules: [../docs/README.md](../docs/README.md).

---

## Rules (must)

| # | Do | Don't |
|---|----|-------|
| 1 | `import { … } from "@afenda/db"` | `../../packages/db/src/...` |
| 2 | Package name or declared `exports` | `@afenda/*/src/...` |
| 3 | Internal deps `"workspace:*"` | Semver range on `@afenda/*` |
| 4 | Shared externals `"catalog:"` when listed | Re-pin per package (exception: `@afenda/docs` pins `tailwindcss` + `@tailwindcss/postcss` `^4.3.3` for fumadocs-openapi — see [../pnpm/README.md](../pnpm/README.md) · [../docs/README.md](../docs/README.md)) |
| 5 | Import only declared package.json deps | Phantom / hoist-only |
| 6 | Higher → same or lower rank | Packages → `apps/*`; cycles; `@afenda/shared` |

| Package | Must not |
|---------|----------|
| `@afenda/db` | Import auth/env/ui/emails |
| `@afenda/auth` | Own DB schema |
| `@afenda/env` | Runtime business logic |
| `@afenda/ui-system` | Server-only / DB / secrets |
| `@afenda/emails` | Import from client components in `apps/web` |

---

## Add an import

```text
[ ] Declared in this package.json
[ ] Package name / exports subpath (not deep src/)
[ ] Same or lower rank; no apps/* upward
[ ] No cycle; update target exports if new public surface
```

---

## Verify

```text
1. pnpm --filter @afenda/web test -- feature-db-boundary ui-boundary auth-sdk-boundary
2. pnpm typecheck
3. rg "from [\"']\\.\\./.*/packages/" apps packages --glob "*.{ts,tsx}"
4. rg "from [\"']@afenda/[^\"']+/src/" apps packages --glob "*.{ts,tsx}"
```

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Relative / deep `src` imports | Breaks package public door |
| Package → `apps/*` | Inverts the DAG |
| `@afenda/shared` mega-package | Collapses boundaries |

Companion: [../pnpm/README.md](../pnpm/README.md) (incl. **Peer Observations (disposed)** — fumadocs-mdx/vite · Neon Auth optionals) · [../discipline/README.md](../discipline/README.md) · [../nextjs/folders.md](../nextjs/folders.md).
