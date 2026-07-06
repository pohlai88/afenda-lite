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

- `db/migrations/001_portal_schema.sql`
- `db/migrations/002_backfill_questions.sql`
- `db/migrations/003_drop_rating_comment.sql`
- `db/migrations/004_audit_events.sql`
- `scripts/db-migrate.mjs` — idempotent via `schema_migrations`
- `scripts/db-backfill-migrations.mjs` — one-time for DBs migrated before tracking

## Critical control points

- Migration applied before app deploy
- No runtime DDL in application code
- Re-run safe: applied files skipped via `schema_migrations`

## Failure modes

- Missing migration → query errors at runtime
- Partial migration → column/type mismatch
- Legacy DB without tracking → run backfill script once

## Required tests

- `npm run db:migrate` on clean DB
- Idempotent re-run (skips applied files)

## Acceptance proof

- [x] `\dt` shows all expected tables including `audit_events`, `schema_migrations`
- [x] App starts with no DDL errors
- [x] No `ensureSchema()` or equivalent in `lib/`

## Rollback

Forward-only SQL; restore Neon branch snapshot.

## Drift risk

Agents re-adding runtime DDL in `lib/` — forbidden.
