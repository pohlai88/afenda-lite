# Turborepo System Architecture

> **Forward-writing.** Package/layout docs are **Target** until implementation. **ARCH-023** is **Living** tenancy SSOT. Plan file is an index only — SSOT is this folder (ADR-010…014 absorbed into ARCH-022…027).

| Doc | Covers |
|-----|--------|
| [ARCH-022-system-overview.md](ARCH-022-system-overview.md) | Gap table, Modular Monolith + Hexagonal, **Turborepo workspace (ex-ADR-010)**, tree, stack, `turbo.json` |
| [ARCH-023-multi-tenancy.md](ARCH-023-multi-tenancy.md) | Shared schema (ex-ADR-012), platform IAM pointer, decision lock, `withOrg`, Neon posture |
| [ARCH-024-package-boundaries.md](ARCH-024-package-boundaries.md) | Package contracts, dependency graph |
| [ARCH-025-data-layer.md](ARCH-025-data-layer.md) | Drizzle decision (ex-ADR-011), schema, migrations, query patterns |
| [ARCH-026-auth-session.md](ARCH-026-auth-session.md) | Neon Auth decision (ex-ADR-013), `getSession()`, `requireRole()`, invites |
| [ARCH-027-env-model.md](ARCH-027-env-model.md) | t3-env decision (ex-ADR-014), `.env.local`, compose cutover |
| [ARCH-028-implementation-slices.md](ARCH-028-implementation-slices.md) | Ordered S1–S8 + checkpoints + post-ship doc retirement |

## Completeness (vs Day-1 plan)

| Plan topic | Home |
|------------|------|
| What went wrong / gap table | ARCH-022 |
| Stack, tree, turbo.json, Modular Monolith + Hexagonal + Turborepo | ARCH-022 |
| Tenancy / withOrg | ARCH-023 |
| Package contracts | ARCH-024 |
| Drizzle / migrations | ARCH-025 |
| Auth session / RBAC | ARCH-026 |
| Env + compose retirement | ARCH-027 |
| S1–S8, Checkpoint A–G, risks, doc retirement | ARCH-028 |

**Remaining work is code** — only after an explicit implement request, following ARCH-028.
