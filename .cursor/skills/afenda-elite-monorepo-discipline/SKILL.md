---
name: afenda-elite-monorepo-discipline
description: Enforces Afenda-Lite monorepo import discipline, @afenda package layering, circular-dependency prevention, and public export surface governance per ARCH-024. Use when adding cross-package imports, creating a new packages/* package, reviewing package.json dependencies, fixing layer/DAG violations, phantom deps, deep imports, or when the user mentions workspace governance, circular dependencies, or package boundaries.
disable-model-invocation: true
paths:
  - packages/**
  - apps/**
  - pnpm-workspace.yaml
  - turbo.json
---

# Afenda Elite — Monorepo Discipline

Day-to-day `@afenda/*` import and package-boundary rules for this checkout. Authority: [ARCH-024](../../../docs/architecture/ARCH-024-package-boundaries.md) · [ARCH-022](../../../docs/architecture/ARCH-022-system-overview.md). Governed extract/move/delete stays in [`afenda-elite-monorepo-refactor`](../afenda-elite-monorepo-refactor/SKILL.md); dead-code discovery in [`afenda-elite-repo-housekeeping`](../afenda-elite-repo-housekeeping/SKILL.md).

**Announce:** "I'm using afenda-elite-monorepo-discipline — checking package boundaries before cross-package edits."

```text
LOAD: using-afenda-elite-skills · ARCH-024 · ARCH-022 · this skill
SKIP: Xerp architecture-authority / PAS registries · scaffold:package templates · Storybook/docs app product restore · mega-package @afenda/shared
LANE: Normalize (structure) or Fix (single illegal import) — one lane
```

Historical provenance: patterns adapted from Xerp `monorepo-discipline`; rewritten for Lite package set and ARCH-024 only.

---

## Layer hierarchy (Lite)

```
Rank 3 — Application  : apps/web  (sole deployable; future apps/* follow same rule)
Rank 2 — Surfaces     : @afenda/ui · @afenda/emails
Rank 1 — Platform     : @afenda/db · @afenda/auth · @afenda/env · @afenda/config
```

**Direction rule:** imports flow **down** only (higher rank → same or lower). Packages never import `apps/*`. No cycles.

Dependency graph (runtime):

```
apps/web
  ├── @afenda/db
  ├── @afenda/auth  ──→  @afenda/env   (and @afenda/db only when ARCH-024 DAG + package.json both allow)
  ├── @afenda/env
  ├── @afenda/ui
  └── @afenda/emails

@afenda/config    (devDep / tsconfig extends only — not a runtime import)
```

Full diagram, forbidden pairs, and violation fixes: [LAYERS.md](LAYERS.md).

---

## Non-negotiable rules

1. **Package name only across boundaries.** Never relative paths into another package:
   ```ts
   // ✅
   import { withOrg } from "@afenda/db";
   // ❌
   import { withOrg } from "../../packages/db/src/client";
   ```

2. **Public export surface only.** Consumers use the package name (and declared subpaths in `package.json#exports`). Never deep `src/` paths of another package:
   ```ts
   // ✅
   import { getSession } from "@afenda/auth";
   import { createAuthClient } from "@afenda/auth/client"; // only if listed in exports
   // ❌
   import { getSession } from "@afenda/auth/src/session";
   ```

3. **Apps never imported by packages.** No `apps/web` (or any `apps/*`) entry in any `packages/*/package.json` dependencies.

4. **No circular dependencies.** If A→B and B→A, extract the shared concern to a lower-rank package (or keep it in `apps/web/modules/*` as app-owned domain).

5. **`workspace:*` pinning.** Internal package deps use `workspace:*`, never a semver range:
   ```json
   { "@afenda/env": "workspace:*" }
   ```

6. **`catalog:` for shared externals.** Versions for deps listed in `pnpm-workspace.yaml` `catalog` / `catalogs` use `"catalog:"` (or `"catalog:<name>"`). Do not re-pin those versions in individual `package.json` files.

7. **No phantom dependencies.** A package may only import what is in its own `package.json` `dependencies` / `devDependencies`. Hoisting is not a contract.

8. **No mega-package.** Do not create `@afenda/shared` or dump unrelated code into an existing package — ARCH-024.

---

## Package contracts (must not)

| Package | May depend on (workspace) | Must not |
|---------|---------------------------|----------|
| `@afenda/db` | (none of auth/env/ui/emails) | Import `@afenda/auth` or `@afenda/env`; expose schema only via public exports |
| `@afenda/auth` | `@afenda/env` (and `@afenda/db` only when both ARCH-024 and `package.json` list it) | Own DB schema definitions |
| `@afenda/env` | (none) | Runtime business logic |
| `@afenda/ui-system` | platform packages only if client-safe | Server-only code, DB calls, secrets |
| `@afenda/emails` | (UI/React peers as needed) | Be imported from client components in `apps/web` |
| `@afenda/config` | (none at runtime) | Be imported as a runtime module; use `extends` / Biome root only |

App modules live under `apps/web/modules/{platform,identity,declarations,fft}` and `apps/web/features/*` — they may import `@afenda/*`; packages must not import those app paths.

---

## Adding an import (existing package)

```
[ ] 1. Target package is listed in this package's package.json dependencies/devDependencies
[ ] 2. Import uses package name (or declared exports subpath), not deep src/
[ ] 3. Target is same or lower layer rank; no upward import into apps/*
[ ] 4. No new cycle (inspect both directions)
[ ] 5. If new export on target: update target package.json#exports + ARCH-024 contract table (Docs lane — Control State)
```

---

## Adding a new package

Lite has **no** `pnpm scaffold:package`. Manual greenfield under `packages/<name>` only.

```
[ ] 1. Name @afenda/<kebab> — private workspace package; type module
[ ] 2. Directory packages/<name>/ with src/index.ts public surface
[ ] 3. package.json exports map (typically "." → src/index.ts until a build step exists)
[ ] 4. Internal deps: workspace:* only; shared externals: catalog: when listed in pnpm-workspace.yaml
[ ] 5. Layer rank assigned mentally against ARCH-024 DAG; no upward imports
[ ] 6. pnpm-workspace.yaml already covers packages/* — confirm glob; then pnpm install
[ ] 7. Update ARCH-024 package contract table (Docs lane; reopen if Control State Closed)
[ ] 8. Wire turbo/typecheck/test scripts consistent with sibling packages
[ ] 9. pnpm --filter @afenda/<name> typecheck && pnpm --filter @afenda/<name> test
```

**Do not:** copy Xerp PAS tombstones, `architecture-authority` registries, or `_`-prefixed production names.

---

## Skill chain

| Need | Delegate |
|------|----------|
| Illegal import / new dep day-to-day | **this skill** |
| Extract / move / rename-export / Slice D delete | [`afenda-elite-monorepo-refactor`](../afenda-elite-monorepo-refactor/SKILL.md) |
| Knip / skill-catalog drift discovery | [`afenda-elite-repo-housekeeping`](../afenda-elite-repo-housekeeping/SKILL.md) |
| Module ports inside apps/web | [`afenda-elite-backend-modules`](../afenda-elite-backend-modules/SKILL.md) |
| Env product config | `@afenda/env` + ARCH-027 (never raw `process.env`) |

---

## Verification

`check:import-boundaries` was **removed** 2026-07-17 (collapse inventory alias). Use living gates:

```bash
# Feature ↛ db + package surface (ARCH-024)
pnpm --filter @afenda/web test -- feature-db-boundary ui-boundary auth-sdk-boundary

# Scoped after package touch
pnpm --filter @afenda/<pkg> typecheck
pnpm --filter @afenda/<pkg> test

# Workspace (catches many phantom / resolution failures)
pnpm typecheck

# Cycle signals when turbo graph fails
pnpm exec turbo run build --dry-run=json
# or: pnpm build  (fails on dependency cycles)
```

Manual deep-import / relative cross-package scan:

```bash
rg "from [\"']\\.\\./.*/packages/" apps packages --glob "*.{ts,tsx}"
rg "from [\"']@afenda/[^\"']+/src/" apps packages --glob "*.{ts,tsx}"
```

---

## Related

- Layers detail: [LAYERS.md](LAYERS.md)
- ARCH-024 · ARCH-022 · ARCH-028
- Catalog: [using-afenda-elite-skills/catalog.md](../using-afenda-elite-skills/catalog.md)
