# `@afenda/testing`

Canonical workspace package for shared Vitest and Playwright test utilities consumed by product packages and apps.

| Subpath | Role |
| ------- | ---- |
| `.` | Package barrel |
| `./require-database-for-ci` | GUIDE-018 I5.5 fail-closed `DATABASE_URL` resolution for DB-backed test suites |

Repo-root [`testing/`](../../../testing/README.md) retains Vitest/Playwright **runner config**, matrices, and e2e helpers until later migration phases. Import shared utilities from `@afenda/testing/*` only — not from repo-root `testing/` paths in product tests.

**Layer:** R1-A foundation (dev/test only; not a runtime product import).
