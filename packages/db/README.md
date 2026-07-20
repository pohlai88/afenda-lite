# `@afenda/db`

Rank-1 Platform database package for Afenda-Lite: Neon HTTP + Drizzle ORM client, living `platform_*` schema, organization-scoped reads via `withOrg`, and the idempotent platform permission catalog. Shared single schema — hard `organization_id` predicates only; **not** project-per-tenant or multi-DB isolation.

Use this package from Rank-1 Platform packages (`@afenda/admin`) and server-side Platform / Identity adapters under `apps/web`. Prefer `withOrg` for tenant-table reads; write paths set `organizationId` explicitly. Product app config stays on `@afenda/env` + `.env.local` — this package must not import `@afenda/env` (DAG). Maintainers run lint / typecheck / Vitest and Drizzle scripts via the filter commands below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import from the root barrel:

```ts
import {
	and,
	db,
	eq,
	platformRoleAssignment,
	withOrg,
} from "@afenda/db";

const rows = await withOrg(platformRoleAssignment, orgId);
```

`withOrg` applies `organization_id = $orgId` only. Do not `db.select()` on tenant tables without it. Product runtime `DATABASE_URL` must use a Neon **`-pooler`** host — see [docs-V2/tenancy](../../docs-V2/tenancy/README.md) · [neon-optimize](../../docs-V2/tenancy/neon-optimize.md).

**Living consumers:** `@afenda/admin` (audit · health · usage · org-console); `apps/web` Identity / Platform domain adapters (`has-permission`, assign/revoke, RBAC list paths).

## Schema & migrations

| Surface | On disk |
|---------|---------|
| Drizzle Kit config | `drizzle.config.ts` |
| Schema entry | `src/schema/index.ts` → `src/schema/platform.ts` |
| Generated SQL / journal | `drizzle/` |
| Client | `src/client.ts` (`db` · `withOrg`) |

Living tables include `platform_permission`, `platform_role`, `platform_role_assignment`, `platform_role_permission`, `platform_rbac_audit`, `platform_audit_log`, `platform_search_document`, `platform_notification`, `platform_domain_event`. Hard tenant roots for null-org audits: `platform_role_assignment` · `platform_rbac_audit` · `platform_audit_log` · `platform_search_document` · `platform_notification` · `platform_domain_event` (`HARD_TENANT_ROOT_*`). General activity audit writer: `@afenda/audit` (not `@afenda/admin/audit`). Product search writer: `@afenda/search`. In-app notification writer: `@afenda/notifications`. Domain-event outbox writer: `@afenda/events`.

```bash
pnpm --filter @afenda/db db:generate
pnpm --filter @afenda/db db:check
pnpm --filter @afenda/db db:migrate
pnpm --filter @afenda/db db:verify-migrate-ban
pnpm --filter @afenda/db db:introspect
```

`db:migrate` runs the guarded migrate path (`scripts/db-migrate-guard.mjs`), not raw `drizzle-kit migrate`. Requires `AFENDA_ALLOW_DB_MIGRATE=1`. A sole `0000_*.sql` baseline also needs `AFENDA_ALLOW_BASELINE_MIGRATE=1` (empty-DB / Mode C apply only).

## Permission catalog

Seed / refresh is **not** part of baseline migrate:

```bash
pnpm --filter @afenda/db db:ensure-permission-catalog
```

Living v1 codes are platform / org / account only (`org.users.manage` · `org.roles.manage` · `clients.invite` · `account.self`). Retired domain codes (`declarations.*` · `fft.access`) are removed on ensure — they are not living catalog rows. See [AGENTS.md](../../AGENTS.md).

## Maintain

```bash
pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/db` | `db` · `withOrg` · schema tables · Drizzle helpers (`eq` · `and` · …) · `runNeonHttpTransaction` · `HARD_TENANT_ROOT_*` · `ensurePlatformPermissionCatalog` · `PLATFORM_PERMISSION_*` / role templates |

No subpath exports — barrel only (`.` in `package.json`).

## Ownership

| Surface | Owner |
|---------|-------|
| Drizzle schema · Neon HTTP client · `withOrg` · permission catalog seed | `@afenda/db` |
| `DATABASE_URL` / product env Zod schema | `@afenda/env` (apps load `.env.local`) |
| Org-console / RBAC audit writers / health probes | `@afenda/admin` |
| Identity permission checks · assign/revoke Actions | `apps/web` |

**Layer:** Rank-1 Platform (`@neondatabase/serverless` · `drizzle-orm`; `drizzle-kit` in devDeps). Must **not** import `@afenda/auth`, `@afenda/env`, Surfaces, or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md).

## Out of scope

Do not add to this package: `@afenda/env` imports, Neon Auth session clients, ActionResult / HTTP adapters, UI, OpenAPI document ownership, declaration/FFT product modules, or a second tenancy model (shared schema · hard `organization_id` only — never multi-DB / project-per-tenant isolation).

## Authority

| Topic | Link |
|-------|------|
| Data layer Scratch · schema craft checklist (reference → Drizzle) | [docs-V2/data](../../docs-V2/data/README.md) · [Schema craft checklist](../../docs-V2/data/README.md#schema-craft-checklist-reference--drizzle) |
| Tenancy · pooler · shared schema (Scratch; Living ARCH-023 dormant) | [docs-V2/tenancy](../../docs-V2/tenancy/README.md) · [neon-optimize](../../docs-V2/tenancy/neon-optimize.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
