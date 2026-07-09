# S0 — Schema foundation

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 1 — blocks everything |
| **Depends on** | Neon project/branch |
| **Feeds into** | All domain slices |

## Purpose

Versioned Postgres schema for all portal entities.

## Inputs / outputs

- **Inputs:** `DATABASE_URL`, SQL in `db/migrations/`
- **Outputs:** Portal tables + `audit_events` + `schema_migrations` tracking

## Owned files

- `db/migrations/001_portal_schema.sql` through `012_assignment_draft.sql`
- `db/schema-manifest.mjs` — expected tables, columns, indexes (CI gate SSOT)
- `scripts/db-migrate.mjs` — idempotent via `schema_migrations`
- `scripts/db-backfill-migrations.mjs` — one-time legacy tracking backfill (`--confirm`)
- `scripts/check-db-schema.mjs` — migration + manifest validation
- `scripts/db-inspect.mjs` — dev EXPLAIN diagnostics

## Critical control points

- Migration applied before app deploy
- No runtime DDL in application code
- Re-run safe: applied files skipped via `schema_migrations`
- `npm run check:db-schema` validates live DB against manifest

## Failure modes

- Missing migration → query errors at runtime
- Partial migration → column/type mismatch
- Legacy DB without tracking → run backfill script once with `--confirm`

## Required tests

- `npm run db:migrate` on clean DB
- Idempotent re-run (skips applied files)
- `npm run check:db-schema` passes after migrate

## Acceptance proof

- [x] `\dt` shows all expected tables including `audit_events`, `schema_migrations`
- [x] App starts with no DDL errors
- [x] No `ensureSchema()` or equivalent in `lib/`
- [x] Hot-path indexes on assignments, questions, evidence

## Rollback

Forward-only SQL; restore Neon branch snapshot.

## Drift risk

Agents re-adding runtime DDL in `lib/` — forbidden.
