# Data layer (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/data/README.md` |
| Authority | **Scratch** — planning-and-task-breakdown (foundation) + disk `packages/db/**` |
| Updated | 2026-07-20 |

Persistence foundation under API/UI. Adapter choice (RSC/Action/RH) stays in [../nextjs/data.md](../nextjs/data.md).

---

## Posture (disk)

| Item | Evidence |
|------|----------|
| ORM | Drizzle in `@afenda/db` |
| Client | `import { db, withOrg } from "@afenda/db"` |
| Schema | Shared Neon schema (not project-per-tenant) |
| Tenant key | `organization_id` text NOT NULL on hard tenant roots |
| Prod URL | `DATABASE_URL` must use Neon **pooler** |

---

## Schema files (disk)

| File | Role |
|------|------|
| `packages/db/src/schema/index.ts` | Barrel |
| `packages/db/src/schema/platform.ts` | Platform tables (incl. RBAC) |
| `packages/db/src/hard-tenant-roots.ts` | Living hard-tenant roots: `platform_role_assignment`, `platform_rbac_audit`, `platform_audit_log`, `platform_search_document`, `platform_notification` |

**Removed schema files (nuclear wipe):** `schema/declarations.ts`, `schema/fft.ts` — do not recreate as living product tables.

File inventory only — no per-column encyclopedia. Re-probe `packages/db/src/schema/*` after schema adds.

---

## Schema craft checklist (reference → Drizzle)

Source reviewed: `_reference/packages/database` — **Prisma 7 ERP** (`@vierp/database` / LIPHOCO), **not** Drizzle/Neon. Use it as craft rules for **future approved** Greenfield tables under `packages/db/src/schema/*`. Do not port ERP models or the Prisma stack.

Living `@afenda/db` already owns Neon HTTP (`-pooler`), hard `organization_id` + `withOrg`, migrate guards, permission catalog, and audit indexes — see [Posture](#posture-disk) · [../tenancy/README.md](../tenancy/README.md). Do not re-implement those from the reference.

### Apply on new tables

| Rule | Detail |
|------|--------|
| Finite status/type → `pgEnum` | Product state machines use Postgres enums (or a Zod closed union at the API boundary). Keep free `text` for open audit vocabularies (`action`, `module`, …) — living IAM does this on purpose. |
| Owned children → cascade | Line-item / child FKs use `onDelete: "cascade"`. Never cascade across hard tenant roots (`HARD_TENANT_ROOT_*`). |
| VIEWs stay outside `pgTable` | Postgres VIEWs are not fake tables. Document `sql` / `db.execute` escape hatch next to the view. |
| Named org-scoped indexes | Prefer `(organization_id, …)` composites on tenant tables (pattern: `platform_audit_log_*` in `schema/platform.ts`). |
| Self-FK / trees | Only when a named product slice needs hierarchy — not a default for platform IAM. |

Illustrative Drizzle shape (not a table to add):

```ts
export const exampleStatus = pgEnum("example_status", [
  "draft",
  "active",
  "archived",
]);
```

Row types: prefer `typeof table.$inferSelect` / `$inferInsert` at the consumer when needed. Do not invent parallel brand shapes — API brands stay with `afenda-elite-api-contract` ([brands-and-schemas](../../.cursor/skills/afenda-elite-api-contract/brands-and-schemas.md)).

### Do not borrow from the reference

| Reject | Why |
|--------|-----|
| Prisma client / `db push` / `adapter-pg` product runtime | SSOT is Drizzle + Neon HTTP |
| Optional `companyId` as tenancy | Hard `organization_id` + `withOrg` only |
| ERP domains (BOM, WO, stock, quotations, Lark) | Out of living platform/identity scope |
| Declarations / FFT schema recreate | Nuclear wipe — do not restore |
| Customer-named enums | Hardcodes clients into schema |
| Soft `(NULL OR org)` / RLS-as-BFF | Rejected tenancy Decision lock |
| Fake completeness (seed script without seed; “pooling” without a pool) | Enterprise bar — no shim surfaces |
| Baseline migrate without named env overrides | Use `@afenda/db` guarded migrate only |

---

## Org-scoped reads

```text
Tenant table read → withOrg(table, orgId)  →  organization_id = $orgId only
Writes           → insert/update/delete with explicit organizationId
Empty orgId      → withOrg fail-closed (throws)
```

App code must not `db.select()` tenant tables without `withOrg`. Audit null-org: `pnpm audit:tenancy-nulls`.

---

## Migrate + catalog

| Command | Job |
|---------|-----|
| `pnpm --filter @afenda/db db:migrate` | Guarded migrate entry (`db-migrate-guard.mjs`) |
| `pnpm --filter @afenda/db db:verify-migrate-ban` | Verify migrate ban posture |
| `pnpm --filter @afenda/db db:ensure-permission-catalog` | Permission catalog seed (not baseline migrate) |

Do not invent ad-hoc SQL migrate paths outside `@afenda/db` scripts.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No multi-DB / project-per-tenant claims | Shared schema + session org is the model |
| No host→tenant | Tenant binding is auth org, not domain |
| No client-side DB | Persistence stays server packages + RSC/Actions |
| No silent skip of `organization_id` | Hard tenant roots are NOT NULL |

---

## Verify

```text
1. pnpm --filter @afenda/db test
2. pnpm check:tenancy-residue
3. pnpm audit:tenancy-nulls   # needs DATABASE_URL; CI on main
4. rg "withOrg" apps/web/modules --glob "*.ts"
5. rg "Schema craft checklist" docs-V2/data/README.md
6. Disk: packages/db/src/client.ts · hard-tenant-roots.ts · schema/platform.ts
7. Absent-by-design: schema/declarations.ts · schema/fft.ts
```

Companion: [`@afenda/db` README](../../packages/db/README.md) · [../auth/README.md](../auth/README.md) · [../tenancy/README.md](../tenancy/README.md) · [../modules/README.md](../modules/README.md) · [../nextjs/data.md](../nextjs/data.md).
