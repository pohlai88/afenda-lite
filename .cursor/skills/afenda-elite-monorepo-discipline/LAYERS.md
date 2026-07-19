# Monorepo layer reference (Afenda-Lite)

Authority: ARCH-024 operative (this file + SKILL.md). Living ARCH-024 body dormant. No `architecture-authority` package — enforce by review + typecheck until a forward import-boundary slice lands. Scratch: [`docs-V2/pnpm`](../../../docs-V2/pnpm/README.md) · [`docs-V2/monorepo`](../../../docs-V2/monorepo/README.md).

## Full layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Rank 3 — Application                                        │
│  apps/web                                                    │
│  Can import: Surfaces + Platform                             │
├──────────────────────────────────────────────────────────────┤
│  Rank 2 — Surfaces                                           │
│  @afenda/ui  @afenda/emails                                  │
│  Can import: Platform (client-safe only for ui)              │
├──────────────────────────────────────────────────────────────┤
│  Rank 1 — Platform                                           │
│  @afenda/db  @afenda/auth  @afenda/env  @afenda/config       │
│  See allowed same-layer edges below                          │
└──────────────────────────────────────────────────────────────┘
```

## Allowed imports by layer

| From \ To | Platform | Surfaces | Application |
|-----------|----------|----------|-------------|
| Platform  | same-ok* | ❌ | ❌ |
| Surfaces  | ✅† | same-ok‡ | ❌ |
| Application | ✅ | ✅ | ❌ (apps must not import each other) |

\* Platform same-layer: prefer minimal coupling. Living edges: `@afenda/auth` → `@afenda/env`. `@afenda/db` must **not** import `@afenda/auth` or `@afenda/env`. `@afenda/env` imports no workspace packages. `@afenda/config` is not a runtime importer.

† `@afenda/ui-system` must remain free of server-only code and DB calls (ARCH-024).

‡ `@afenda/emails` must not be imported from client components in `apps/web`.

## Forbidden import table

| From | Forbidden to | Reason |
|------|--------------|--------|
| Any `packages/*` | `apps/web` or any `apps/*` | Packages must not import apps |
| `@afenda/db` | `@afenda/auth`, `@afenda/env` | ARCH-024 contract |
| `@afenda/env` | any `@afenda/*` business package | Env owns config only |
| `@afenda/ui-system` | `@afenda/db`, server-only auth paths | UI is client/surface |
| Any package | Relative `../../packages/...` | Cross-boundary package name required |
| Any consumer | `@afenda/<pkg>/src/...` | Public `exports` only |
| Any package | `@afenda/shared` | Mega-package banned (ARCH-024) |

## Same-layer rules

| Layer | Same-layer OK? | Notes |
|-------|----------------|-------|
| Platform | Yes, narrowly | Document every edge in ARCH-024 + `package.json` |
| Surfaces | Prefer no | ui ↔ emails coupling needs explicit justification |
| Application | No | Only one app today; future apps/* stay isolated |

## Common violations and fixes

### Deep import

```ts
// ❌
import { withOrg } from "@afenda/db/src/client";
// ✅
import { withOrg } from "@afenda/db";
```

### Relative cross-package import

```ts
// ❌
import { env } from "../../../packages/env/src/web";
// ✅
import { env } from "@afenda/env";
```

### Phantom dependency

Package resolves a transitive dep via hoist but does not declare it — fails on clean install. Fix: add to that package's `package.json` (`workspace:*` if internal).

### Upward / app import from a package

```ts
// In packages/auth/...
import { something } from "../../../apps/web/modules/identity/..."; // ❌
// Fix: move shared contract into a lower-rank package or keep behavior in apps/web
```

### Cycle

```
auth → db → auth   // ❌
```

Fix: extract shared types/contracts to the lowest legal package, or keep orchestration in `apps/web`.

## Known exceptions

None approved. If an exception is required, record it in ARCH-024 (Docs lane; Control State reopen) before coding it.
