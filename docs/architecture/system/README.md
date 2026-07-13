# System architecture (Target)

> **Forward-writing.** This folder is the **Target system** architecture pack — monorepo shape, tenancy+RBAC, packages, data, auth, env, implementation slices, and Living interface/API parent architecture. Turborepo is a tool decision inside [ARCH-022](ARCH-022-system-overview.md), not the folder’s job name.

| Lifecycle | Docs |
|-----------|------|
| **Living** | [ARCH-023](ARCH-023-multi-tenancy.md) (tenancy + platform RBAC + Decision lock) · [ARCH-029](ARCH-029-interface-api-architecture.md) (interface/API parent) |
| **Target** | ARCH-022 · ARCH-024…028 until `apps/web` + `packages/*` ship |

| Doc | Covers |
|-----|--------|
| [ARCH-022-system-overview.md](ARCH-022-system-overview.md) | Gap table, Modular Monolith + Hexagonal, workspace tree, stack, `turbo.json` |
| [ARCH-023-multi-tenancy.md](ARCH-023-multi-tenancy.md) | Shared schema, platform RBAC, Decision lock, `withOrg`, Neon posture |
| [ARCH-024-package-boundaries.md](ARCH-024-package-boundaries.md) | Package contracts, dependency graph |
| [ARCH-025-data-layer.md](ARCH-025-data-layer.md) | Drizzle, schema, migrations, query patterns |
| [ARCH-026-auth-session.md](ARCH-026-auth-session.md) | Neon Auth, `getSession()`, `requireRole()`, invites |
| [ARCH-027-env-model.md](ARCH-027-env-model.md) | t3-env Target; Living compose until S4.1 |
| [ARCH-028-implementation-slices.md](ARCH-028-implementation-slices.md) | Ordered S1–S8 + checkpoints + post-ship doc retirement |
| [ARCH-029-interface-api-architecture.md](ARCH-029-interface-api-architecture.md) | Living parent for interface/API surfaces over `docs/api` |

## Completeness

| Topic | Home |
|-------|------|
| Gap table / stack / workspace | ARCH-022 |
| Tenancy + platform RBAC / withOrg | ARCH-023 |
| Package contracts | ARCH-024 |
| Drizzle / migrations | ARCH-025 |
| Auth session helpers | ARCH-026 |
| Env + compose retirement | ARCH-027 |
| S1–S8, checkpoints | ARCH-028 |
| Interface / API architecture parent | ARCH-029 |

**Remaining work is code** — only after an explicit implement request, following ARCH-028.

**Former path:** `docs/architecture/turborepo/` (renamed to `system/` for clarity).
