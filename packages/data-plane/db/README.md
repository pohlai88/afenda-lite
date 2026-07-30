# `@afenda/db`

Rank-1 Platform database package for Afenda-Lite: Neon HTTP + Drizzle ORM client, shared schema, migration controls, tenant-predicate helpers, and the idempotent platform permission catalog. Shared single schema — hard `organization_id` predicates only; **not** project-per-tenant or multi-DB isolation.

Use this package from Rank-1 Platform packages (`@afenda/admin`) and server-side Platform / Identity adapters under `apps/web`. Product app config stays on `@afenda/env` + `.env.local` — this package must not import `@afenda/env` (DAG). Maintainers run lint / typecheck / Vitest and Drizzle scripts via the filter commands below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import from the root barrel:

```ts
import {
	and,
	db,
	eq,
	orgWhere,
	platformRoleAssignment,
	tenantEntityPredicate,
} from "@afenda/db";

const assignment = await db
	.select()
	.from(platformRoleAssignment)
	.where(
		tenantEntityPredicate(
			{
				id: platformRoleAssignment.id,
				organizationId: platformRoleAssignment.organizationId,
			},
			{ id: assignmentId, organizationId },
		),
	)
	.limit(1);
```

`orgWhere(column, organizationId)` composes the organization predicate into reads and joins. `tenantEntityPredicate(...)` composes record identity plus organization ownership. `withOrg(table, organizationId)` remains a convenience full-table read only; it is not the package’s primary tenancy safeguard and does not make joins or mutations safe.

Connection class is enforced per consumer while retaining the single `DATABASE_URL` key:

| Consumer | Required connection |
|----------|---------------------|
| Product runtime (`getNeonSql`) | Neon pooled endpoint; first hostname label ends in `-pooler` |
| Drizzle Kit, status, and read-only operations | Valid PostgreSQL endpoint; pooled or direct |
| Guarded `db:migrate` execution | Direct endpoint; `-pooler` prohibited |

See [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) · [neon-optimize](../../../docs-V2/tenancy/neon-optimize.md).

**Living consumers:** `@afenda/admin` (audit · health · usage · org-console); `apps/web` Identity / Platform domain adapters (`has-permission`, assign/revoke, RBAC list paths).

## Tenant SQL contract

Every organization-owned table referenced by a read, join, update, or delete must have an explicit organization predicate in the final SQL statement. Inserts must stamp the organization from validated command/session context, but that does not protect later mutations.

Organization-owned `UPDATE` and `DELETE` statements must prove both record selection and organization ownership in `WHERE`:

```ts
await db
	.update(platformRoleAssignment)
	.set({ active: false })
	.where(
		and(
			eq(platformRoleAssignment.id, assignmentId),
			orgWhere(platformRoleAssignment.organizationId, organizationId),
		),
	);
```

Rules:

- Scope every organization-owned `FROM` and `JOIN` table; scoping only the base table is insufficient.
- Never query an organization-owned row by ID alone, including existence probes. A missing row and a row owned by another organization must remain indistinguishable.
- Keep ownership proof in SQL. An application-side organization comparison after an unscoped query is not a boundary.
- `withOrg` is suitable only for a simple full-table organization read. Use `orgWhere` or `tenantEntityPredicate` for composed statements.
- `pnpm check:tenant-sql-safety` is the static CI control for hard-tenant Drizzle reads and mutations. `pnpm check:tenancy-residue` separately rejects soft `(NULL OR org)` tenancy.

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
pnpm --filter @afenda/db db:migration-status
pnpm --filter @afenda/db db:migrate
pnpm --filter @afenda/db db:verify-migrate-ban
pnpm --filter @afenda/db db:introspect
```

**Canonical funnel:** `db:generate` → `db:check` → `AFENDA_ALLOW_DB_MIGRATE=1 db:migrate`. No `db:push`, no ad-hoc `apply-*.mjs`, no Neon MCP DDL apply. Cursor hooks block shell bypasses and MCP `prepare_database_migration` / DDL `run_sql`.

`db:migrate` runs the guarded migrate path (`scripts/db-migrate-guard.mjs`), not raw `drizzle-kit migrate`. It requires `AFENDA_ALLOW_DB_MIGRATE=1` and a direct `DATABASE_URL`; a Neon `-pooler` endpoint is rejected before any database connection is opened. A sole `0000_*.sql` baseline also needs `AFENDA_ALLOW_BASELINE_MIGRATE=1` (empty-DB / Mode C apply only). Migrations that the guard classifies as destructive also require `AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1` (explicit ops approval — never set in CI by default).

ERP domain DDL (including Accounting CoA / posting / source-link tables in `0032`–`0033`) lives in this package’s Drizzle migrations; table mutation ownership stays with the owning `@afenda/*` ERP packages.

## Transaction contract

`runNeonHttpTransaction` is the only approved multi-statement transaction helper exported by `@afenda/db`. It submits a predeclared query batch as one real, non-interactive Postgres transaction over Neon HTTP. Statements execute in array order and commit together or roll back together. Later SQL statements observe earlier writes according to the selected isolation level; application code cannot inspect an intermediate result and then choose the next statement.

The helper accepts either a readonly array of Neon query promises or a synchronous builder callback that returns that array. The callback is a batch builder, not an interactive transaction callback: do not make it `async`, `await` inside it, or branch on query results. Default isolation is `ReadCommitted`. `deferrable: true` is accepted only with `readOnly: true` and `isolationLevel: "Serializable"`; invalid combinations fail before the SQL client is initialized. The helper does not retry.

Use it whenever one logical operation writes more than one authoritative row. The business mutation, audit fact, domain/outbox event, idempotency record, and owned projection update must commit or roll back together when they participate in the same database transaction. Do not emulate atomicity with `Promise.all`, sequential standalone HTTP queries, or compensating deletes. A caller may retry only when the complete operation has an enforced idempotency key and replay-safe semantics.

Neon’s driver contract describes `transaction()` as a single non-interactive transaction; interactive sessions require `Pool` or `Client`: [Neon serverless driver — transactions](https://github.com/neondatabase/serverless#transaction).

## Release verification matrix

A database release candidate is not ready until every required result below is captured. DB-backed tests must run with `REQUIRE_DATABASE_TESTS=1`; a skipped suite is not release evidence. Use direct, disposable Neon branches for migration operations, never a pooled product runtime URL.

| Check | Command / evidence | Required result |
|-------|--------------------|-----------------|
| Journal, schema-to-migration consistency, destructive SQL ban | `pnpm --filter @afenda/db db:check` | Pass: journal aligned, Drizzle check clean, no forbidden destructive statement |
| Migration ledger | `pnpm --filter @afenda/db db:migration-status` against candidate | Pass: no pending or divergent migration; pending now exits non-zero |
| Empty database apply | Guarded `db:migrate` against a disposable empty branch with the explicit baseline approval | All migrations apply; expected tables and constraints present |
| Candidate snapshot upgrade | Guarded `db:migrate` against a disposable branch cloned from the release candidate | Upgrade succeeds without manual DDL or ledger repair |
| Repeated migration | Run guarded `db:migrate` a second time on each disposable branch | No-op; no schema or ledger change |
| Package schema / constraint evidence | `REQUIRE_DATABASE_TESTS=1 pnpm --filter @afenda/db test` | Pass with DB-backed suites executed, not skipped |
| Permission catalog reconciliation | Run `db:ensure-permission-catalog` twice, then the DB-backed permission-catalog test | Both ensures succeed; second run is idempotent; catalog test passes |
| Schema ownership governance | `pnpm validate:modules` | Pass |
| Tenant SQL governance | `pnpm check:tenant-sql-safety && pnpm check:tenancy-residue` | Pass |
| Tenant-root constraints and live null audit | DB package tenancy tests + `pnpm audit:tenancy-nulls` | Every hard root is `NOT NULL`; live audit passes |

The fresh-apply and candidate-upgrade rows are separate evidence runs. A clean `db:check` does not substitute for either live migration proof.

## Permission catalog

Seed / refresh is **not** part of baseline migrate:

```bash
pnpm --filter @afenda/db db:ensure-permission-catalog
```

Catalog includes platform / org / account codes plus living ERP fine-grained permissions (Sales through Accounting — e.g. 17 `accounting.*` codes). Retired domain codes (`declarations.*` · `fft.access`) are removed on ensure — they are not living catalog rows. See [AGENTS.md](../../../AGENTS.md).

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
| `@afenda/db` | `db` · `orgWhere` · `tenantEntityPredicate` · convenience `withOrg` · schema tables · Drizzle helpers (`eq` · `and` · …) · `runNeonHttpTransaction` · `HARD_TENANT_ROOT_*` · `ensurePlatformPermissionCatalog` · `PLATFORM_PERMISSION_*` / role templates |

No subpath exports — barrel only (`.` in `package.json`).

## Ownership

| Surface | Owner |
|---------|-------|
| Drizzle schema · Neon HTTP client · tenant predicate helpers · transaction helper · permission catalog seed | `@afenda/db` |
| `DATABASE_URL` / product env Zod schema | `@afenda/env` (apps load `.env.local`) |
| Org-console / RBAC audit writers / health probes | `@afenda/admin` |
| Identity permission checks · assign/revoke Actions | `apps/web` |

**Layer:** Rank-1 Platform (`@neondatabase/serverless` · `drizzle-orm`; `drizzle-kit` in devDeps). Must **not** import `@afenda/auth`, `@afenda/env`, Surfaces, or `apps/*`. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md).

## Out of scope

Do not add to this package: `@afenda/env` imports, Neon Auth session clients, ActionResult / HTTP adapters, UI, OpenAPI document ownership, declaration/FFT product modules, or a second tenancy model (shared schema · hard `organization_id` only — never multi-DB / project-per-tenant isolation).

## Authority

| Topic | Link |
|-------|------|
| Data layer Scratch · schema craft checklist (reference → Drizzle) | [docs-V2/data](../../../docs-V2/data/README.md) · [Schema craft checklist](../../../docs-V2/data/README.md#schema-craft-checklist-reference--drizzle) |
| Tenancy · pooler · shared schema (Scratch; Living ARCH-023 dormant) | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) · [neon-optimize](../../../docs-V2/tenancy/neon-optimize.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) · [LAYERS.md](../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
