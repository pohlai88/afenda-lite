# Turborepo System Architecture

> **Forward-writing.** Package/layout docs are **Target** until implementation. **ARCH-023** is **Living** tenancy SSOT (absorbed ARCH-003). Plan file is an index only — SSOT is this folder + [../../adr/turborepo/](../../adr/turborepo/).

| Doc | Covers |
|-----|--------|
| [ARCH-022-system-overview.md](ARCH-022-system-overview.md) | Gap table, workspace tree, stack, `turbo.json`, request flow |
| [ARCH-023-multi-tenancy.md](ARCH-023-multi-tenancy.md) | Shared schema, decision lock R*/D*, `withOrg`, Neon posture (Living SSOT; supersedes ARCH-003) |
| [ARCH-024-package-boundaries.md](ARCH-024-package-boundaries.md) | Package contracts, dependency graph |
| [ARCH-025-data-layer.md](ARCH-025-data-layer.md) | Drizzle schema, migrations, query patterns |
| [ARCH-026-auth-session.md](ARCH-026-auth-session.md) | Neon Auth, `getSession()`, `requireRole()`, invites |
| [ARCH-027-env-model.md](ARCH-027-env-model.md) | `@t3-oss/env-nextjs`, `.env.local`, compose cutover |
| [ARCH-028-implementation-slices.md](ARCH-028-implementation-slices.md) | Ordered S1–S8 + checkpoints + post-ship doc retirement |

Related ADRs: [../../adr/turborepo/](../../adr/turborepo/) (ADR-010…014)

## Completeness (vs Day-1 plan)

| Plan topic | Home |
|------------|------|
| What went wrong / gap table | ARCH-022 |
| Stack, tree, turbo.json | ARCH-022 |
| Tenancy / withOrg | ARCH-023 |
| Package contracts | ARCH-024 + ADR-010 constraints |
| Drizzle / migrations | ARCH-025 + ADR-011 |
| Auth session / RBAC | ARCH-026 + ADR-013 |
| Env + compose retirement | ARCH-027 + ADR-014 |
| S1–S8, Checkpoint A–G, risks, doc retirement | ARCH-028 |
| Decisions (why) | ADR-010…014 |

**Remaining work is code** — only after an explicit implement request, following ARCH-028.
