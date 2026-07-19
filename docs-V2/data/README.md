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
| `packages/db/src/schema/platform.ts` | Platform tables |
| `packages/db/src/schema/declarations.ts` | Declarations tables |
| `packages/db/src/schema/fft.ts` | FFT / Trade tables |
| `packages/db/src/hard-tenant-roots.ts` | Hard-tenant roots (`organization_id` NOT NULL) |

File inventory only — no per-column encyclopedia. Re-probe `packages/db/src/schema/*` after schema adds.

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
2. pnpm audit:tenancy-nulls
3. rg "withOrg" apps/web/modules --glob "*.ts"
4. Disk: packages/db/src/client.ts · hard-tenant-roots.ts · schema/*
```

Companion: [../auth/README.md](../auth/README.md) · [../tenancy/README.md](../tenancy/README.md) · [../modules/README.md](../modules/README.md) · [../nextjs/data.md](../nextjs/data.md).
