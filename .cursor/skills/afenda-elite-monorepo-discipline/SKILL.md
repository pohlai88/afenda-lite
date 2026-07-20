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

Day-to-day `@afenda/*` import and package-boundary rules for this checkout. Authority: ARCH-024 · ARCH-022 operative → [LAYERS.md](LAYERS.md) + Scratch [`docs-V2/pnpm`](../../../docs-V2/pnpm/README.md) · [`docs-V2/monorepo`](../../../docs-V2/monorepo/README.md). Governed extract/move/delete stays in [`afenda-elite-monorepo-refactor`](../afenda-elite-monorepo-refactor/SKILL.md); dead-code discovery in [`afenda-elite-repo-housekeeping`](../afenda-elite-repo-housekeeping/SKILL.md).

**Announce:** "I'm using afenda-elite-monorepo-discipline — checking package boundaries before cross-package edits."

```text
LOAD: using-afenda-elite-skills · LAYERS.md · docs-V2/pnpm · docs-V2/monorepo · this skill
SKIP: Living docs/architecture required LOAD · Xerp architecture-authority / PAS registries · scaffold:package templates · Storybook product restore · mega-package @afenda/shared
LANE: Normalize (structure) or Fix (single illegal import) — one lane
```

Historical provenance: patterns adapted from Xerp `monorepo-discipline`; rewritten for Lite package set and ARCH-024 only.

---

## Layer hierarchy (Lite)

```
Rank 3 — Application  : apps/web  (sole deployable; future apps/* follow same rule)
Rank 2 — Surfaces     : @afenda/ui-system · @afenda/emails
Rank 1 — Platform     : banded catalog (R1-A…F, R1-X) — see LAYERS.md + packages/README.md
                        Living packages: db · auth · admin · env · errors · logger · rate-limit ·
                        cache · audit · search · notifications · events · master-data · sales ·
                        purchasing · inventory · receiving · fulfillment · receivables · payables · payments · accounting ·
                        http · security · metrics · openapi · ai-the-machine · config
```

**Direction rule:** imports flow **down** only (higher rank → same or lower). Packages never import `apps/*`. No cycles. **Bands classify only; they never grant dependency rights.** Workspace edges: `package.json` realizes + [WORKSPACE-EDGE-REGISTER.yaml](../../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) authorizes. Peer R1-F ERP packages do not import each other.

Dependency graph (runtime):

```
apps/web
  ├── @afenda/db
  ├── @afenda/auth  ──→  @afenda/env · @afenda/http · @afenda/logger · @afenda/rate-limit · @afenda/errors
  ├── @afenda/admin ──→  @afenda/auth · @afenda/db · @afenda/env · @afenda/errors
  ├── @afenda/env
  ├── @afenda/errors   (leaf — AppError / codes / Result / http / postgres adapter)
  ├── @afenda/logger   (leaf — Pino Node + edge emit; no @afenda/* runtime deps)
  ├── @afenda/http     (leaf — Fetch compose · correlation · pagination · Retry-After)
  ├── @afenda/security (leaf — headers · CSP · CORS builders; next.config adapts)
  ├── @afenda/metrics  (leaf — Prometheus registry · record · scrape text)
  ├── @afenda/openapi  (leaf — Zod→OAS glue · envelope · YAML emit)
  ├── @afenda/rate-limit ──→  @afenda/env · @afenda/errors
  ├── @afenda/cache      ──→  @afenda/env · @afenda/errors
  ├── @afenda/audit      ──→  @afenda/db · @afenda/errors
  ├── @afenda/search     ──→  @afenda/db · @afenda/errors
  ├── @afenda/notifications ──→  @afenda/db · @afenda/errors
  ├── @afenda/events         ──→  @afenda/db · @afenda/errors
  ├── @afenda/master-data    ──→  @afenda/db · @afenda/errors · @afenda/audit · @afenda/events
  ├── @afenda/ai-the-machine ──→  @afenda/errors  (+ ai SDK)
  ├── @afenda/ui-system
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
   import { withOrg } from "../../packages/data-plane/db/src/client";
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
   **Approved exception:** `@afenda/docs` pins `tailwindcss` + `@tailwindcss/postcss` `^4.3.3` (not `"catalog:"`) so fumadocs logical utilities (`-inset-s-*`) resolve. Catalog `^4` currently resolves PostCSS below 4.3 for `@afenda/web` — do **not** restore docs to `"catalog:"` and do **not** bump the default catalog without cause. Scratch: [`docs-V2/pnpm/README.md`](../../../docs-V2/pnpm/README.md) · [`docs-V2/docs/README.md`](../../../docs-V2/docs/README.md) failure-mode row.

7. **No phantom dependencies.** A package may only import what is in its own `package.json` `dependencies` / `devDependencies`. Hoisting is not a contract.

8. **No mega-package.** Do not create `@afenda/shared` or dump unrelated code into an existing package — ARCH-024.

---

## Package contracts (must not)

| Package | May depend on (workspace) | Must not |
|---------|---------------------------|----------|
| `@afenda/db` | (none of auth/env/ui/emails) | Import `@afenda/auth` or `@afenda/env`; expose schema only via public exports |
| `@afenda/auth` | `@afenda/env` · `@afenda/logger` (and `@afenda/db` only when both ARCH-024 and `package.json` list it) | Own DB schema definitions |
| `@afenda/admin` | `@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors` | Import Surfaces / `apps/*`; own a second Neon Auth client |
| `@afenda/env` | (none) | Runtime business logic |
| `@afenda/errors` | (none) | Next.js; `pg` / Drizzle / Prisma; UI/locale copy as contract |
| `@afenda/logger` | (none of `@afenda/*`) | Next.js; APM SDKs; Surfaces / `apps/*` |
| `@afenda/rate-limit` | `@afenda/env` · `@afenda/errors` | Next.js; Surfaces / `apps/*`; foreign Redis outside Upstash |
| `@afenda/cache` | `@afenda/env` · `@afenda/errors` | Next.js; Surfaces / `apps/*`; foreign Redis outside Upstash; `FLUSHDB` |
| `@afenda/master-data` | `@afenda/db` · `@afenda/errors` · `@afenda/audit` · `@afenda/events` | Surfaces / `apps/*`; Next.js; org-scoped `md_uom`; dual-write `md_*` outside package; shadow customer/product tables |
| `@afenda/payables` | `@afenda/db` · `@afenda/errors` · `@afenda/events` | Surfaces / `apps/*`; Next.js; dual-write into purchasing, receiving, payment, ledger, or journal tables; peer ERP imports |
| `@afenda/payments` | `@afenda/db` · `@afenda/errors` · `@afenda/events` | Surfaces / `apps/*`; Next.js; separate refund tables; dual-write into receivables, payables, ledger, journal, or accounting tables; peer ERP imports |
| `@afenda/accounting` | `@afenda/db` · `@afenda/errors` · `@afenda/events` | Surfaces / `apps/*`; Next.js; dual-write into peer ERP tables; mutable posted journal lines; peer ERP imports |
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
[ ] 4. Internal deps: workspace:* only; shared externals: catalog: when listed in pnpm-workspace.yaml (exception: `@afenda/docs` Tailwind pins — rule 6)
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

## Discover resolved version (catalog vs pin)

Do not trust `package.json` ranges alone — lockfile + store decide what PostCSS/Tailwind actually run. After any Tailwind or catalog touch:

```bash
# Docs pin (must be ≥ 4.3.3, not catalog:)
pnpm --filter @afenda/docs list @tailwindcss/postcss tailwindcss --depth 0
pnpm --filter @afenda/docs why @tailwindcss/postcss

# Catalog consumer (may stay on older ^4 resolve — leave alone without cause)
pnpm --filter @afenda/web list @tailwindcss/postcss tailwindcss --depth 0
```

Expect: docs → `4.3.3` both packages; web → catalog resolve (e.g. postcss `4.1.18` / tw `4.2.1`). If docs shows catalog versions or `< 4.3.3`, restore the `^4.3.3` pins — do not delete `-inset-s-*` utilities.

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
